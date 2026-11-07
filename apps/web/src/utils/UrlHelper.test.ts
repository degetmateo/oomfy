import { describe, it, expect } from 'vitest';
import { UrlHelper } from './UrlHelper.js';

describe('UrlHelper', () => {
  it('identifies relative paths as internal', () => {
    expect(UrlHelper.isInternalUrl('/chats')).toBe(true);
    expect(UrlHelper.isInternalUrl('/home')).toBe(true);
    expect(UrlHelper.isInternalUrl('relative/path')).toBe(true);
  });

  it('identifies oomfy.online and subdomains as internal', () => {
    expect(UrlHelper.isInternalUrl('https://oomfy.online/members/alice')).toBe(true);
    expect(UrlHelper.isInternalUrl('http://www.oomfy.online/p/123')).toBe(true);
    expect(UrlHelper.isInternalUrl('https://app.oomfy.online/chats')).toBe(true);
  });

  it('identifies localhost as internal', () => {
    expect(UrlHelper.isInternalUrl('http://localhost:5173/notifications')).toBe(true);
    expect(UrlHelper.isInternalUrl('http://127.0.0.1:3000/')).toBe(true);
  });

  it('identifies third-party websites as external', () => {
    expect(UrlHelper.isInternalUrl('https://google.com')).toBe(false);
    expect(UrlHelper.isInternalUrl('https://github.com/oomfy')).toBe(false);
    expect(UrlHelper.isInternalUrl('http://malicious.site/phishing')).toBe(false);
  });

  it('extracts correct internal paths', () => {
    expect(UrlHelper.getInternalPath('https://oomfy.online/members/alice?tab=likes#top')).toBe('/members/alice?tab=likes#top');
    expect(UrlHelper.getInternalPath('/chats?id=123')).toBe('/chats?id=123');
  });
});

