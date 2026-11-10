import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { Server } from '../src/Server.js';

describe('Security Headers Middleware', () => {
  const server = new Server(5009);

  it('sets all mandatory security headers on HTTP responses', async () => {
    const res = await request(server.app).get('/health');
    expect(res.status).toBe(200);

    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).toContain('frame-ancestors');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('removes fingerprinting headers Server and X-Powered-By', async () => {
    const res = await request(server.app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['server']).toBeUndefined();
  });

  it('does NOT set obsolete X-XSS-Protection header', async () => {
    const res = await request(server.app).get('/health');
    expect(res.headers['x-xss-protection']).toBeUndefined();
  });

  it('sets Secure, HttpOnly, and SameSite=Lax on cookies in production', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(server.app).post('/auth/logout');
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
      expect(cookieStr).toContain('HttpOnly');
      expect(cookieStr).toContain('SameSite=Lax');
      expect(cookieStr).toContain('Secure');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });
});

