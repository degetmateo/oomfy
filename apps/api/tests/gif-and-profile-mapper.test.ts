import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Environment } from '../src/config/Environment.js';
import { ImgBBStorageAdapter } from '../src/infrastructure/adapters/ImgBBStorageAdapter.js';
import { PublicationMapper } from '../src/infrastructure/repositories/mongo/PublicationMapper.js';

describe('GIF Preservation & PublicationMapper Author Media Priority', () => {
  const originalKey = Environment.IMGBB_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    (Environment as any).IMGBB_KEY = 'test-imgbb-key';
  });

  afterEach(() => {
    (Environment as any).IMGBB_KEY = originalKey;
  });

  it('prioritizes original animated image.url / url over static display_url thumbnail in ImgBBStorageAdapter', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'gif-1',
            url: 'https://i.ibb.co/gif1/avatar.gif',
            display_url: 'https://i.ibb.co/gif1/static-thumb.jpg',
            image: { url: 'https://i.ibb.co/gif1/animated-original.gif' },
            delete_url: 'https://ibb.co/del/gif1',
          },
        }),
        { status: 200 }
      )
    );

    const gifBytes = Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;', 'binary');
    const result = await ImgBBStorageAdapter.upload(gifBytes);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.url).toBe('https://i.ibb.co/gif1/animated-original.gif');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'gif-2',
            url: 'https://i.ibb.co/gif2/banner.gif',
            display_url: 'https://i.ibb.co/gif2/static-thumb.jpg',
            delete_url: 'https://ibb.co/del/gif2',
          },
        }),
        { status: 200 }
      )
    );

    const fallbackResult = await ImgBBStorageAdapter.upload(gifBytes);
    expect(fallbackResult.url).toBe('https://i.ibb.co/gif2/banner.gif');
  });

  it('preserves stored author icon_url and banner_url in PublicationMapper instead of forcing /members redirect', () => {
    const mapped = PublicationMapper.toDomain({
      _id: 'pub-1',
      author: {
        _id: 'u1',
        username: 'alice',
        name: 'Alice Updated',
        role: 'member',
        icon_url: 'https://i.ibb.co/alice/new-avatar.gif',
        banner_url: 'https://i.ibb.co/alice/new-banner.gif',
      },
      type: 'default',
      content: 'Hola',
      created_at: new Date().toISOString(),
    });

    expect(mapped.author.icon_url).toBe('https://i.ibb.co/alice/new-avatar.gif');
    expect(mapped.author.banner_url).toBe('https://i.ibb.co/alice/new-banner.gif');

    const fallbackMapped = PublicationMapper.toDomain({
      _id: 'pub-2',
      author: { _id: 'u2', username: 'bob', name: 'Bob', role: 'member' },
      type: 'default',
      content: 'Legacy',
      created_at: new Date().toISOString(),
    });
    expect(fallbackMapped.author.icon_url).toBe('/members/bob/icon');
    expect(fallbackMapped.author.banner_url).toBeNull();

    const clearedMapped = PublicationMapper.toDomain({
      _id: 'pub-3',
      author: { _id: 'u3', username: 'cara', name: 'Cara', role: 'member', icon_url: null, banner_url: null },
      type: 'default',
      content: 'Cleared',
      created_at: new Date().toISOString(),
    });
    expect(clearedMapped.author.icon_url).toBeNull();
    expect(clearedMapped.author.banner_url).toBeNull();
  });
});
