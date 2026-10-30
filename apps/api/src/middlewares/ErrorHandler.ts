import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { Environment } from '../config/Environment.js';

export class ErrorHandler {
  public static handle(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        statusCode: err.statusCode,
        message: err.message,
      });
      return;
    }

    console.error('💥 Error no controlado en la aplicación:', err);

    res.status(500).json({
      success: false,
      statusCode: 500,
      message: Environment.isProduction()
        ? 'Ha ocurrido un error interno en el servidor.'
        : err.message || 'Error interno.',
    });
  }
}

