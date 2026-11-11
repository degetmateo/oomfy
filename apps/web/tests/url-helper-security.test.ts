import { describe, it, expect } from 'vitest';
import { UrlHelper } from '../src/utils/UrlHelper.js';

describe('UrlHelper Open-Redirect & Protocol Security', () => {
  it('blocks protocol-relative, subdomain-spoofed, and javascript URLs', () => {
    expect(UrlHelper.isInternalUrl('//evil.com/phish')).toBe(false);
    expect(UrlHelper.isInternalUrl('https://onrender.com.evil.com')).toBe(false);
    expect(UrlHelper.isInternalUrl('https://evil-oomfy.online')).toBe(false);
    expect(UrlHelper.isInternalUrl('javascript:alert(1)')).toBe(false);
    expect(UrlHelper.isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(UrlHelper.isSafeHttpUrl('data:text/html,<script>')).toBe(false);
  });

  it('allows relative paths, oomfy domains, and HTTPS URLs cleanly', () => {
    expect(UrlHelper.isInternalUrl('/home')).toBe(true);
    expect(UrlHelper.isInternalUrl('#top')).toBe(true);
    expect(UrlHelper.isInternalUrl('https://oomfy.online/explore')).toBe(true);
    expect(UrlHelper.isInternalUrl('https://api-oomfy.onrender.com/health')).toBe(true);
    expect(UrlHelper.isSafeHttpUrl('https://example.org/page')).toBe(true);
  });
});

