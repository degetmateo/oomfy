import { describe, it, expect } from 'vitest';
import { UrlHelper } from '../src/utils/UrlHelper.js';

describe('UrlHelper Open-Redirect & Protocol Security', () => {
  it('blocks protocol-relative, backslash, subdomain-spoofed, legacy hosts, and javascript URLs', () => {
    expect(UrlHelper.isInternalUrl('//evil.com/phish')).toBe(false);
    expect(UrlHelper.isInternalUrl('/\\evil.com/phish')).toBe(false);
    expect(UrlHelper.isInternalUrl('\\evil.com')).toBe(false);
    expect(UrlHelper.isInternalUrl('https://oomfy.online.evil.com')).toBe(false);
    expect(UrlHelper.isInternalUrl('https://evil-oomfy.online')).toBe(false);
    expect(UrlHelper.isInternalUrl('https://api-oomfy.onrender.com/health')).toBe(false);
    expect(UrlHelper.isInternalUrl('javascript:alert(1)')).toBe(false);
    expect(UrlHelper.isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(UrlHelper.isSafeHttpUrl('data:text/html,<script>')).toBe(false);
    expect(UrlHelper.isSafeSpotifyEmbedUrl('https://evil.com/embed/track/1')).toBe(false);
  });

  it('allows relative paths, oomfy domains, safe Spotify embeds, and handles malformed percent params', () => {
    expect(UrlHelper.isInternalUrl('/home')).toBe(true);
    expect(UrlHelper.isInternalUrl('#top')).toBe(true);
    expect(UrlHelper.isInternalUrl('https://oomfy.online/explore')).toBe(true);
    expect(UrlHelper.isInternalUrl('https://api.oomfy.online/health')).toBe(true);
    expect(UrlHelper.isSafeHttpUrl('https://example.org/page')).toBe(true);
    expect(UrlHelper.isSafeSpotifyEmbedUrl('https://open.spotify.com/embed/track/123')).toBe(true);
    expect(UrlHelper.getInternalPath('https://oomfy.online/members/alice?tab=likes#top')).toBe('/members/alice?tab=likes#top');
    expect(UrlHelper.decodeParamSafe('%E0%A4%A')).toBe('%E0%A4%A');
  });
});
