import { Pool, PoolConfig } from 'pg';
import { Environment } from '../../../config/Environment.js';

export class PostgresPool {
  private static instance: Pool | null = null;

  public static getInstance(): Pool {
    if (!this.instance) {
      const hasCa = Boolean(Environment.PG_CA && Environment.PG_CA.trim().length > 0);
      const isRemote = Boolean(Environment.PG_URI) || (Environment.PG_HOST !== 'localhost' && Environment.PG_HOST !== '127.0.0.1');

      const config: PoolConfig = Environment.PG_URI
        ? {
            connectionString: Environment.PG_URI,
            ssl: {
              rejectUnauthorized: false,
              ca: hasCa ? Buffer.from(Environment.PG_CA!, 'base64').toString() : undefined,
            },
          }
        : {
            host: Environment.PG_HOST,
            port: Environment.PG_PORT,
            database: Environment.PG_DATABASE,
            user: Environment.PG_USER,
            password: Environment.PG_PASSWORD,
            ssl: isRemote ? { rejectUnauthorized: false } : undefined,
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
