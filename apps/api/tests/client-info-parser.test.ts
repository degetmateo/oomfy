import { describe, it, expect } from 'vitest';
import { ClientInfoParser } from '../src/infrastructure/adapters/ClientInfoParser.js';

describe('ClientInfoParser Unit Tests', () => {
  it('extracts real IP from x-forwarded-for header', () => {
    const fakeReq = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      },
      socket: {},
    } as any;

    const ip = ClientInfoParser.extractClientIp(fakeReq);
    expect(ip).toBe('203.0.113.195');
  });

  it('normalizes IPv6 loopback to 127.0.0.1', () => {
    const fakeReq = {
      headers: {},
      socket: { remoteAddress: '::1' },
      ip: '::1',
    } as any;

    const ip = ClientInfoParser.extractClientIp(fakeReq);
    expect(ip).toBe('127.0.0.1');
  });

  it('parses Android and Chrome user agents', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36';
    const result = ClientInfoParser.parseDevicePlatform(ua);
    expect(result).toBe('Android • Chrome');
  });

  it('parses iOS and Safari user agents', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
    const result = ClientInfoParser.parseDevicePlatform(ua);
    expect(result).toBe('iOS • Safari');
  });

  it('parses Windows and Edge user agents', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    const result = ClientInfoParser.parseDevicePlatform(ua);
    expect(result).toBe('Windows 10/11 • Edge');
  });
});

