import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicationMediaHelper } from './PublicationMediaHelper.js';
import { PublicationMapper } from '../../infrastructure/repositories/mongo/PublicationMapper.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';

describe('PublicationMediaHelper & PublicationMapper warnings', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses JSON and array image_warnings safely', () => {
    expect(PublicationMediaHelper.parseImageWarnings('["spoiler", null, "sensitive"]')).toEqual([
      'spoiler',
      null,
      'sensitive',
    ]);
    expect(PublicationMediaHelper.parseImageWarnings(['sensitive', null])).toEqual(['sensitive', null]);
    expect(PublicationMediaHelper.parseImageWarnings('invalid-json')).toEqual([]);
  });

  it('attaches warning and is_gif flags for uploaded files and Tenor/Klipy GIFs', async () => {
    vi.spyOn(ImgBBStorageAdapter, 'upload').mockResolvedValue({
      url: 'https://i.ibb.co/test/animated.gif',
      delete_url: 'https://ibb.co/del/1',
      imgbb_id: 'img-1',
    });

    const gifHeader = Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;', 'binary');
    const items = await PublicationMediaHelper.buildMediaItems(
      [{ buffer: gifHeader, mimetype: 'image/gif' } as Express.Multer.File],
      [{ src: 'https://media.klipy.com/sample.gif', index: 1, warning: 'sensitive' }],
      ['spoiler']
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      url: 'https://i.ibb.co/test/animated.gif',
      source: 'imgbb',
      index: 0,
      warning: 'spoiler',
      is_gif: true,
    });
    expect(items[1]).toMatchObject({
      url: 'https://media.klipy.com/sample.gif',
      source: 'tenor',
      index: 1,
      warning: 'sensitive',
      is_gif: true,
    });
  });

  it('preserves valid warning and is_gif fields in PublicationMapper.sanitizeImages', () => {
    const sanitized = PublicationMapper.sanitizeImages([
      { url: 'https://i.ibb.co/1.gif', source: 'imgbb', index: 0, warning: 'spoiler', is_gif: true },
      { url: 'https://i.ibb.co/2.png', source: 'imgbb', index: 1, warning: 'invalid_val' },
      { url: 'https://media.klipy.com/3.gif', source: 'tenor', index: 2, warning: 'sensitive' },
    ]);

    expect(sanitized[0]).toEqual({
      url: 'https://i.ibb.co/1.gif',
      source: 'imgbb',
      index: 0,
      warning: 'spoiler',
      is_gif: true,
    });
    expect(sanitized[1]).toEqual({
      url: 'https://i.ibb.co/2.png',
      source: 'imgbb',
      index: 1,
    });
    expect(sanitized[2]).toEqual({
      url: 'https://media.klipy.com/3.gif',
      source: 'tenor',
      index: 2,
      warning: 'sensitive',
      is_gif: true,
    });
  });
});
