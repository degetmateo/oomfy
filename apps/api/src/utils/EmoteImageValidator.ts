import { LIMITS } from '@oomfy/shared';
import { BadRequestError } from '../errors/AppError.js';
import { hasValidImageSignature } from '../middlewares/FileUploadGuard.js';

export interface ImageDimensions {
  width: number;
  height: number;
}

export class EmoteImageValidator {
  public static getDimensions(buf: Buffer): ImageDimensions | null {
    if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    const gifSig = buf.subarray(0, 6).toString('ascii');
    if (buf.length >= 10 && (gifSig === 'GIF87a' || gifSig === 'GIF89a')) {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    if (buf.length >= 30 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
      const chunk = buf.subarray(12, 16).toString('ascii');
      if (chunk === 'VP8 ' && buf.length >= 30) {
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      }
      if (chunk === 'VP8L' && buf.length >= 25) {
        const b0 = buf[21], b1 = buf[22], b2 = buf[23], b3 = buf[24];
        return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
      }
      if (chunk === 'VP8X' && buf.length >= 30) {
        return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
      }
    }
    if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) { offset++; continue; }
        const marker = buf[offset + 1];
        if (marker >= 0xc0 && marker <= 0xc3) {
          return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
        }
        if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) { offset += 2; continue; }
        const segLen = buf.readUInt16BE(offset + 2);
        if (segLen < 2) break;
        offset += 2 + segLen;
      }
    }
    return null;
  }

  public static validate(file?: Express.Multer.File): Express.Multer.File {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestError('Debes proporcionar una imagen para el emote.');
    }
    if (file.buffer.length > LIMITS.EMOTE_MAX_FILE_BYTES) {
      throw new BadRequestError('El emote no puede pesar más de 256 KB.');
    }
    if (!hasValidImageSignature(file.buffer)) {
      throw new BadRequestError('Archivo corrupto o tipo de imagen no válido.');
    }
    const dims = this.getDimensions(file.buffer);
    if (dims && (dims.width > 256 || dims.height > 256 || dims.width < 8 || dims.height < 8)) {
      throw new BadRequestError('Las dimensiones del emote deben ser pequeñas (máximo 128x128 o 256x256 píxeles).');
    }
    return file;
  }
}
