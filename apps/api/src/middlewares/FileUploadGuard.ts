import { Request, Response, NextFunction } from 'express';
import { FileFilterCallback } from 'multer';
import { BadRequestError } from '../errors/AppError.js';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function imageFileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (ALLOWED_MIMES.has(file.mimetype)) cb(null, true);
  else cb(new BadRequestError('Formato de imagen no permitido. Usa PNG, JPEG, WEBP o GIF.'));
}

export function hasValidImageSignature(buf: Buffer): boolean {
  if (!buf || buf.length < 12) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isGif = buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a';
  const isWebp = buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP';
  return isJpeg || isPng || isGif || isWebp;
}

export function validateUploadedImages(req: Request, _res: Response, next: NextFunction): void {
  const list: Express.Multer.File[] = [];
  if (req.file) list.push(req.file);
  if (Array.isArray(req.files)) list.push(...req.files);
  else if (req.files && typeof req.files === 'object') {
    for (const arr of Object.values(req.files)) list.push(...arr);
  }
  for (const file of list) {
    if (!hasValidImageSignature(file.buffer)) {
      return next(new BadRequestError('Archivo corrupto o tipo de imagen no válido.'));
    }
  }
  next();
}

