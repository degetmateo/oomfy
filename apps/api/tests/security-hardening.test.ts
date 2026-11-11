import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { isOriginAllowed, corsOriginHandler } from '../src/config/CorsPolicy.js';
import { isSafePublicHttpUrl, isHttpUrl } from '../src/utils/UrlSecurityHelper.js';
import { MessageService } from '../src/services/chat/MessageService.js';
import { MongoChatRepository } from '../src/infrastructure/repositories/mongo/MongoChatRepository.js';
import { MongoMessageRepository } from '../src/infrastructure/repositories/mongo/MongoMessageRepository.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { hasValidImageSignature, validateUploadedImages } from '../src/middlewares/FileUploadGuard.js';
import { createRateLimiter } from '../src/middlewares/RateLimiter.js';
import { MongoIdHelper } from '../src/infrastructure/repositories/mongo/MongoIdHelper.js';

describe('API Security Hardening (CORS, SSRF, IDOR, Uploads, RateLimit, ReDoS)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('allows approved origins and rejects untrusted CORS origins', () => {
    expect(isOriginAllowed('https://oomfy.online')).toBe(true);
    expect(isOriginAllowed('https://sub.oomfy.online')).toBe(true);
    expect(isOriginAllowed('https://evil.com')).toBe(false);
    expect(isOriginAllowed('https://oomfy.online.evil.com')).toBe(false);

    const cb = vi.fn();
    corsOriginHandler('https://evil.com', cb);
    expect(cb).toHaveBeenCalledWith(null, false);
  });

  it('blocks private IP, loopback, metadata SSRF URLs and unsafe protocols', async () => {
    expect(await isSafePublicHttpUrl('http://127.0.0.1:5000/admin')).toBeNull();
    expect(await isSafePublicHttpUrl('http://169.254.169.254/latest/meta-data')).toBeNull();
    expect(await isSafePublicHttpUrl('http://10.0.0.5/internal')).toBeNull();
    expect(await isSafePublicHttpUrl('http://localhost:3000')).toBeNull();
    expect(await isSafePublicHttpUrl('ftp://files.example.com/a')).toBeNull();
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('https://oomfy.online')).toBe(true);
  });

  it('enforces chat participant check on send, list, markAsRead, and same-chat reply_to_id', async () => {
    vi.spyOn(MongoChatRepository, 'isParticipant').mockResolvedValue(false);
    const sender = { id: 'intruder-1', username: 'intruder', name: 'Intruder' };
    await expect(MessageService.sendMessage('chat-1', sender, 'hi')).rejects.toThrow('No tienes permisos');
    await expect(MessageService.getChatMessages('chat-1', 'intruder-1')).rejects.toThrow('No tienes permisos');
    await expect(MessageService.markAsRead('chat-1', 'intruder-1')).rejects.toThrow('No tienes permisos');

    vi.spyOn(MongoChatRepository, 'isParticipant').mockResolvedValue(true);
    vi.spyOn(MongoMemberRepository, 'findById').mockResolvedValue(null);
    vi.spyOn(MongoMessageRepository, 'findByIdInChat').mockResolvedValue(null);
    await expect(
      MessageService.sendMessage('chat-1', sender, { content: 'reply', reply_to_id: 'other-chat-msg' })
    ).rejects.toThrow('El mensaje citado no pertenece a este chat');
  });

  it('validates image magic bytes and rejects disguised text/script payloads', () => {
    const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 1]);
    const gifSig = Buffer.from('GIF89a......');
    const fakeScript = Buffer.from('<script>alert(1)</script>');
    expect(hasValidImageSignature(pngSig)).toBe(true);
    expect(hasValidImageSignature(gifSig)).toBe(true);
    expect(hasValidImageSignature(fakeScript)).toBe(false);

    const next = vi.fn() as unknown as NextFunction;
    validateUploadedImages({ file: { buffer: fakeScript } } as unknown as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('enforces per-IP rate limits with 429 and Retry-After', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, prefix: 'test-sec', enforceInTest: true });
    const req = { ip: '198.51.100.10', headers: {}, socket: {} } as unknown as Request;
    const statusFn = vi.fn().mockReturnThis();
    const jsonFn = vi.fn();
    const res = { setHeader: vi.fn(), status: statusFn, json: jsonFn } as unknown as Response;
    const next = vi.fn();

    limiter(req, res, next);
    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    limiter(req, res, next);
    expect(statusFn).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('escapes regex metacharacters cleanly against ReDoS', () => {
    expect(MongoIdHelper.escapeRegex('(a+)+$')).toBe('\\(a\\+\\)\\+\\$');
  });
});
