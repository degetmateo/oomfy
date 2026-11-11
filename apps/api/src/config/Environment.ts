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
    process.env.FRONTEND_URL ||
    ((process.env.NODE_ENV || process.env.ENV) === 'production' ? 'https://oomfy.online' : 'http://localhost:5173');

  public static readonly ALLOWED_ORIGINS: string[] = Array.from(
    new Set(
      [
        'https://oomfy.online',
        'https://www.oomfy.online',
        ...(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()),
        ...((process.env.NODE_ENV || process.env.ENV) === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']),
        process.env.FRONTEND_URL || '',
      ].filter(Boolean)
    )
  );

  public static readonly JWT_SECRET: string = process.env.JWT_SECRET || 'default_jwt_secret_dev';
  public static readonly JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_dev';

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
  public static readonly KLIPY_KEY: string = process.env.KLIPY_KEY || '';

  public static readonly VAPID_PUBLIC_KEY: string = process.env.VAPID_PUBLIC_KEY || '';
  public static readonly VAPID_PRIVATE_KEY: string = process.env.VAPID_PRIVATE_KEY || '';
  public static readonly VAPID_SUBJECT: string =
    process.env.VAPID_SUBJECT || 'mailto:soporte@oomfy.online';

  public static isProduction(): boolean {
    return (process.env.NODE_ENV || process.env.ENV || this.NODE_ENV) === 'production' || process.env.PRODUCTION === 'TRUE';
  }

  public static assertProductionSecrets(): void {
    if (!this.isProduction()) return;
    const insecure = new Set([
      'default_jwt_secret_dev',
      'default_refresh_secret_dev',
      'change_me_dev_access_secret_min_32_chars',
      'change_me_dev_refresh_secret_min_32_chars',
    ]);
    if (!this.JWT_SECRET || this.JWT_SECRET.length < 32 || insecure.has(this.JWT_SECRET)) {
      throw new Error('FATAL: JWT_SECRET debe configurarse con al menos 32 caracteres seguros en producción.');
    }
    if (!this.JWT_REFRESH_SECRET || this.JWT_REFRESH_SECRET.length < 32 || insecure.has(this.JWT_REFRESH_SECRET)) {
      throw new Error('FATAL: JWT_REFRESH_SECRET debe configurarse con al menos 32 caracteres seguros en producción.');
    }
    if (this.JWT_SECRET === this.JWT_REFRESH_SECRET) {
      throw new Error('FATAL: JWT_SECRET y JWT_REFRESH_SECRET no pueden ser idénticos en producción.');
    }
  }
}

if (Environment.isProduction() && process.env.VITEST !== 'true') {
  Environment.assertProductionSecrets();
}
