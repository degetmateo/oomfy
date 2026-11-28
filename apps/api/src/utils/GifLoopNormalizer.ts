const NETSCAPE_LOOP_EXT = Buffer.from([
  0x21, 0xff, 0x0b,
  0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
  0x03, 0x01, 0x00, 0x00, 0x00,
]);

export function isGifBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 14) return false;
  const sig = buf.subarray(0, 6).toString('ascii');
  return sig === 'GIF87a' || sig === 'GIF89a';
}

function skipSubBlocks(buf: Buffer, startPos: number): number | null {
  let pos = startPos;
  while (pos < buf.length) {
    const len = buf[pos];
    if (len === 0) return pos + 1;
    pos += 1 + len;
    if (pos > buf.length) return null;
  }
  return null;
}

/**
 * Ensures animated multi-frame GIF buffers specify an infinite loop count (0)
 * in a NETSCAPE2.0 / ANIMEXTS1.0 Application Extension block so uploaded GIFs
 * repeat indefinitely instead of halting after a single cycle.
 */
export function ensureGifInfiniteLoop(buf: Buffer): Buffer {
  try {
    if (!isGifBuffer(buf)) return buf;

    const packed = buf[10];
    const gctLen = (packed & 0x80) !== 0 ? 3 * (1 << ((packed & 0x07) + 1)) : 0;
    const firstBlockOffset = 13 + gctLen;
    if (firstBlockOffset >= buf.length) return buf;

    let pos = firstBlockOffset;
    let frameCount = 0;
    let netscapeLoopOffset: number | null = null;

    while (pos < buf.length) {
      const introducer = buf[pos];

      if (introducer === 0x3b) {
        break;
      }

      if (introducer === 0x2c) {
        if (pos + 10 > buf.length) return buf;
        const imgPacked = buf[pos + 9];
        const lctLen = (imgPacked & 0x80) !== 0 ? 3 * (1 << ((imgPacked & 0x07) + 1)) : 0;
        pos += 10 + lctLen;
        if (pos >= buf.length) return buf;
        pos += 1; // LZW minimum code size
        const nextPos = skipSubBlocks(buf, pos);
        if (nextPos === null) return buf;
        pos = nextPos;
        frameCount += 1;
        continue;
      }

      if (introducer === 0x21) {
        if (pos + 2 >= buf.length) return buf;
        const label = buf[pos + 1];

        if (label === 0xff) {
          if (pos + 3 > buf.length) return buf;
          const blockSize = buf[pos + 2];
          if (blockSize === 11 && pos + 14 <= buf.length) {
            const appId = buf.subarray(pos + 3, pos + 14).toString('ascii');
            if (appId === 'NETSCAPE2.0' || appId === 'ANIMEXTS1.0') {
              const subPos = pos + 14;
              if (
                subPos + 5 <= buf.length &&
                buf[subPos] === 0x03 &&
                buf[subPos + 1] === 0x01 &&
                buf[subPos + 4] === 0x00
              ) {
                netscapeLoopOffset = subPos + 2;
              }
            }
          }
          const subStart = pos + 3 + blockSize;
          if (subStart >= buf.length) return buf;
          const nextPos = skipSubBlocks(buf, subStart);
          if (nextPos === null) return buf;
          pos = nextPos;
          continue;
        }

        const nextPos = skipSubBlocks(buf, pos + 2);
        if (nextPos === null) return buf;
        pos = nextPos;
        continue;
      }

      return buf;
    }

    if (netscapeLoopOffset !== null) {
      if (buf[netscapeLoopOffset] === 0x00 && buf[netscapeLoopOffset + 1] === 0x00) {
        return buf;
      }
      const out = Buffer.from(buf);
      out[netscapeLoopOffset] = 0x00;
      out[netscapeLoopOffset + 1] = 0x00;
      return out;
    }

    if (frameCount > 1) {
      const headerAndLsd = Buffer.from(buf.subarray(0, firstBlockOffset));
      if (headerAndLsd.subarray(0, 6).toString('ascii') === 'GIF87a') {
        Buffer.from('GIF89a', 'ascii').copy(headerAndLsd, 0);
      }
      return Buffer.concat([headerAndLsd, NETSCAPE_LOOP_EXT, buf.subarray(firstBlockOffset)]);
    }

    return buf;
  } catch {
    return buf;
  }
}
