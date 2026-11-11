import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { SECURITY_HEADER_VALUES } from '@oomfy/shared';
import { Server } from '../src/Server.js';

describe('Helmet Security Headers Middleware', () => {
  const server = new Server(5009);

  it('sets all mandatory security headers via helmet and Permissions-Policy on HTTP responses', async () => {
    const res = await request(server.app).get('/health');
    expect(res.status).toBe(200);

    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(res.headers['content-security-policy']).toBe(SECURITY_HEADER_VALUES['Content-Security-Policy']);
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBe('geolocation=(), microphone=(), camera=()');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('removes fingerprinting headers and omits obsolete X-XSS-Protection', async () => {
    const res = await request(server.app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['server']).toBeUndefined();
    expect(res.headers['x-xss-protection']).toBeUndefined();
  });

  it('keeps apps/web/public/_headers synchronized with shared security policy', () => {
    const headersPath = path.resolve(process.cwd(), '..', 'web', 'public', '_headers');
    const content = fs.readFileSync(headersPath, 'utf-8');
    for (const [key, value] of Object.entries(SECURITY_HEADER_VALUES)) {
      expect(content).toContain(`${key}: ${value}`);
    }
  });

  it('sets Secure, HttpOnly, and SameSite=Lax on cookies in production', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(server.app).post('/auth/logout');
      const setCookie = res.headers['set-cookie'];
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie || '');
      expect(cookieStr).toContain('HttpOnly');
      expect(cookieStr).toContain('SameSite=Lax');
      expect(cookieStr).toContain('Secure');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });
});
