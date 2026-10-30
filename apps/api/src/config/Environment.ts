import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

function findAndLoadEnv(): void {
  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir && currentDir !== root) {
    const candidate = path.join(currentDir, '.env');
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return;
    }
    currentDir = path.dirname(currentDir);
  }

  dotenv.config();
}

findAndLoadEnv();

export class Environment {
  public static readonly NODE_ENV: string = process.env.NODE_ENV || process.env.ENV || 'development';
  public static readonly PORT: number = Number(process.env.PORT) || 4000;
  public static readonly FRONTEND_URL: string =
    process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://oomfy.online' : 'http://localhost:5173');

  public static readonly ALLOWED_ORIGINS: string[] = [
    'https://oomfy.online',
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean);

  public static readonly JWT_SECRET: string =
    process.env.JWT_SECRET || process.env.JWT_KEY || 'default_jwt_secret_dev';
  public static readonly JWT_REFRESH_SECRET: string =
    process.env.JWT_REFRESH_SECRET || process.env.JWT_KEY || 'default_refresh_secret_dev';

  public static readonly PG_URI: string | undefined =
    process.env.PG_DATABASE_URI || process.env.DATABASE_URL;
  public static readonly PG_CA: string | undefined = process.env.PG_DATABASE_CA;
  public static readonly PG_HOST: string =
    process.env.POSTGRES_URL || process.env.PG_HOST || 'localhost';
  public static readonly PG_PORT: number =
    Number(process.env.POSTGRES_PORT || process.env.PG_PORT) || 5432;
  public static readonly PG_DATABASE: string =
    process.env.POSTGRES_DB_NAME || process.env.PG_DATABASE || 'oomfy';
  public static readonly PG_USER: string =
    process.env.POSTGRES_USERNAME || process.env.PG_USER || 'postgres';
  public static readonly PG_PASSWORD: string =
    process.env.POSTGRES_PASSWORD || process.env.PG_PASSWORD || '';

  public static readonly MONGODB_URI: string =
    process.env.MONGODB_DATABASE_KEY || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  public static readonly MONGODB_NAME: string =
    process.env.MONGODB_DATABASE_NAME || process.env.MONGODB_DB_NAME || 'oomfy';

  public static readonly RESEND_API_KEY: string =
    process.env.RESEND_KEY || process.env.RESEND_API_KEY || '';
  public static readonly IMGBB_KEY: string = process.env.IMGBB_KEY || '';
  public static readonly TENOR_KEY: string = process.env.TENOR_KEY || '';
  public static readonly KLIPY_KEY: string = process.env.KLIPY_KEY || '';
  public static readonly RECAPTCHA_KEY: string = process.env.RECAPTCHA_KEY || '';

  public static isProduction(): boolean {
    return this.NODE_ENV === 'production' || process.env.PRODUCTION === 'TRUE';
  }
}
