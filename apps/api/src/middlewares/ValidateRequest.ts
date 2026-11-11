import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { BadRequestError } from '../errors/AppError.js';

export class ValidateRequest {
  private static formatError(error: ZodError): string {
    return error.issues.map((issue) => issue.message).join(' | ');
  }

  public static body<T>(schema: ZodType<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      try {
        req.body = schema.parse(req.body ?? {});
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return next(new BadRequestError(this.formatError(error)));
        }
        next(error);
      }
    };
  }

  public static query<T>(schema: ZodType<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      try {
        req.query = schema.parse(req.query ?? {}) as any;
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return next(new BadRequestError(this.formatError(error)));
        }
        next(error);
      }
    };
  }

  public static params<T>(schema: ZodType<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
      try {
        req.params = schema.parse(req.params ?? {}) as any;
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return next(new BadRequestError(this.formatError(error)));
        }
        next(error);
      }
    };
  }
}
