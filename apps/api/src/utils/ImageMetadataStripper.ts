const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const STRIP_PNG_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME', 'pHYs']);

function stripJpeg(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let pos = 2;
  while (pos + 2 <= buf.length) {
    if (buf[pos] !== 0xff) { parts.push(buf.subarray(pos)); break; }
    const marker = buf[pos + 1];
    if (marker === 0xda) { parts.push(buf.subarray(pos)); break; }
    if (marker === 0xd9) { parts.push(buf.subarray(pos, pos + 2)); break; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(buf.subarray(pos, pos + 2));
      pos += 2;
      continue;
    }
    if (pos + 4 > buf.length) { parts.push(buf.subarray(pos)); break; }
    const segLen = buf.readUInt16BE(pos + 2);
    if (segLen < 2 || pos + 2 + segLen > buf.length) return buf;
    const isStripped = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isStripped) parts.push(buf.subarray(pos, pos + 2 + segLen));
    pos += 2 + segLen;
  }
  return Buffer.concat(parts);
}

function stripPng(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 8)];
  let pos = 8;
  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const total = 12 + len;
    if (pos + total > buf.length) return buf;
    const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
    if (!STRIP_PNG_CHUNKS.has(type)) parts.push(buf.subarray(pos, pos + total));
    pos += total;
    if (type === 'IEND') break;
  }
  return Buffer.concat(parts);
}

function stripWebp(buf: Buffer): Buffer {
  const parts: Buffer[] = [buf.subarray(0, 12)];
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const fourcc = buf.subarray(pos, pos + 4).toString('ascii');
    const size = buf.readUInt32LE(pos + 4);
    const total = 8 + size + (size % 2);
    if (pos + total > buf.length) return buf;
    if (fourcc !== 'EXIF' && fourcc !== 'XMP ') parts.push(buf.subarray(pos, pos + total));
    pos += total;
  }
  const out = Buffer.concat(parts);
  out.writeUInt32LE(out.length - 8, 4);
  return out;
}

export function stripImageMetadata(buf: Buffer): Buffer {
  try {
    if (!buf || buf.length < 12) return buf;
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return stripJpeg(buf);
    if (buf.subarray(0, 8).equals(PNG_SIG)) return stripPng(buf);
    if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return stripWebp(buf);
    return buf;
  } catch {
    return buf;
  }
}

