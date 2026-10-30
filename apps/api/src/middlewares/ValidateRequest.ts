import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { BadRequestError } from '../errors/AppError.js';

export class ValidateRequest {
  public static body(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error: unknown) {
        if (error instanceof ZodError) {
          const message = error.errors.map((e: ZodIssue) => e.message).join(' | ');
          return next(new BadRequestError(message));
        }
        next(error);
      }
    };
  }

  public static query(schema: ZodSchema) {
    return (req: Request, _res: Response, next: NextFunction) => {
      try {
        req.query = schema.parse(req.query);
        next();
      } catch (error: unknown) {
        if (error instanceof ZodError) {
          const message = error.errors.map((e: ZodIssue) => e.message).join(' | ');
          return next(new BadRequestError(message));
        }
        next(error);
      }
    };
  }
}
