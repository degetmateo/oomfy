import { Pool, PoolConfig } from 'pg';
import { Environment } from '../../../config/Environment.js';

function resolveCaCert(raw?: string): string | undefined {
  const clean = raw?.trim();
  if (!clean) return undefined;
  return clean.includes('BEGIN CERTIFICATE')
    ? clean.replace(/\\n/g, '\n')
    : Buffer.from(clean, 'base64').toString('utf8');
}

export class PostgresPool {
  private static instance: Pool | null = null;

  public static getInstance(): Pool {
    if (!this.instance) {
      const ca = resolveCaCert(Environment.PG_CA);
      const isRemote = Boolean(Environment.PG_URI) || (Environment.PG_HOST !== 'localhost' && Environment.PG_HOST !== '127.0.0.1');
      const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true' || (Boolean(ca) && process.env.PG_SSL_REJECT_UNAUTHORIZED !== 'false');

      const config: PoolConfig = Environment.PG_URI
        ? {
            connectionString: Environment.PG_URI,
            ssl: { rejectUnauthorized, ca },
          }
        : {
            host: Environment.PG_HOST,
            port: Environment.PG_PORT,
            database: Environment.PG_DATABASE,
            user: Environment.PG_USER,
            password: Environment.PG_PASSWORD,
            ssl: isRemote ? { rejectUnauthorized, ca } : undefined,
            max: 20,
            idleTimeoutMillis: 30000,
          };

      this.instance = new Pool(config);
      this.instance.on('error', (err) => {
        console.error('🟥 Error inesperado en el pool de PostgreSQL:', err);
      });
    }
    return this.instance;
  }

  public static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.end();
      this.instance = null;
    }
  }
}
