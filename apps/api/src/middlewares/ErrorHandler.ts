import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../errors/AppError.js';
import { Environment } from '../config/Environment.js';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, statusCode: err.statusCode, message: err.message });
    return;
  }

  if (err instanceof MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo excede el tamaño máximo permitido.' : 'Error al procesar los archivos subidos.';
    res.status(status).json({ success: false, statusCode: status, message: msg });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ success: false, statusCode: 400, message: 'JSON malformado en la petición.' });
    return;
  }

  const pgCode = (err as any)?.code;
  if (pgCode === '22P02' || pgCode === '22007') {
    res.status(400).json({ success: false, statusCode: 400, message: 'Formato de parámetro inválido.' });
    return;
  }
  if (pgCode === '23505') {
    res.status(409).json({ success: false, statusCode: 409, message: 'El recurso ya existe.' });
    return;
  }

  console.error('🟥 [Unhandled Error]:', err.message);
  const message = Environment.isProduction() ? 'Ha ocurrido un error interno en el servidor.' : err.message || 'Internal Server Error';
  res.status(500).json({ success: false, statusCode: 500, message });
}
