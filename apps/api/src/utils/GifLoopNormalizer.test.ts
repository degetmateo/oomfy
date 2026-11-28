import { describe, it, expect } from 'vitest';
import { ensureGifInfiniteLoop, isGifBuffer } from './GifLoopNormalizer.js';

function makeGifHeader(version: 'GIF87a' | 'GIF89a' = 'GIF89a'): Buffer {
  // 6-byte signature + 7-byte Logical Screen Descriptor (no GCT: packed = 0x00)
  return Buffer.from([
    ...Buffer.from(version, 'ascii'),
    0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
  ]);
}

function makeFrameBlock(): Buffer {
  // Image descriptor (no LCT) + LZW min code size 2 + single 1-byte subblock + block terminator
  return Buffer.from([
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0x02, 0x01, 0x01, 0x00,
  ]);
}

function makeNetscapeExtension(loopCount: number): Buffer {
  return Buffer.from([
    0x21, 0xff, 0x0b,
    ...Buffer.from('NETSCAPE2.0', 'ascii'),
    0x03, 0x01, loopCount & 0xff, (loopCount >> 8) & 0xff, 0x00,
  ]);
}

describe('GifLoopNormalizer', () => {
  it('returns non-GIF buffers unchanged', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48]);
    expect(isGifBuffer(png)).toBe(false);
    expect(ensureGifInfiniteLoop(png)).toBe(png);
  });

  it('keeps single-frame static GIFs untouched', () => {
    const single = Buffer.concat([makeGifHeader(), makeFrameBlock(), Buffer.from([0x3b])]);
    const out = ensureGifInfiniteLoop(single);
    expect(out).toBe(single);
  });

  it('injects NETSCAPE2.0 infinite loop and upgrades GIF87a to GIF89a for multi-frame GIF without loop block', () => {
    const multi87 = Buffer.concat([makeGifHeader('GIF87a'), makeFrameBlock(), makeFrameBlock(), Buffer.from([0x3b])]);
    const out = ensureGifInfiniteLoop(multi87);
    expect(out.subarray(0, 6).toString('ascii')).toBe('GIF89a');
    expect(out.includes(Buffer.from('NETSCAPE2.0', 'ascii'))).toBe(true);
    const idx = out.indexOf(Buffer.from('NETSCAPE2.0', 'ascii'));
    // sub-block: 0x03 0x01 <lo> <hi> 0x00
    expect(out[idx + 11]).toBe(0x03);
    expect(out[idx + 12]).toBe(0x01);
    expect(out[idx + 13]).toBe(0x00);
    expect(out[idx + 14]).toBe(0x00);
  });

  it('rewrites finite NETSCAPE2.0 loop count (e.g. 1) to 0 for infinite repetition', () => {
    const finite = Buffer.concat([
      makeGifHeader('GIF89a'),
      makeNetscapeExtension(1),
      makeFrameBlock(),
      makeFrameBlock(),
      Buffer.from([0x3b]),
    ]);
    const out = ensureGifInfiniteLoop(finite);
    const idx = out.indexOf(Buffer.from('NETSCAPE2.0', 'ascii'));
    expect(out[idx + 13]).toBe(0x00);
    expect(out[idx + 14]).toBe(0x00);
    expect(out.length).toBe(finite.length);
  });

  it('returns multi-frame GIF untouched when loop count is already 0', () => {
    const infinite = Buffer.concat([
      makeGifHeader('GIF89a'),
      makeNetscapeExtension(0),
      makeFrameBlock(),
      makeFrameBlock(),
      Buffer.from([0x3b]),
    ]);
    expect(ensureGifInfiniteLoop(infinite)).toBe(infinite);
  });
});
