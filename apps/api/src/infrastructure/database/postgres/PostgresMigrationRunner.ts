import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PoolClient } from 'pg';
import { PostgresPool } from './PostgresPool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PostgresMigrationRunner {
  public static async run(): Promise<void> {
    const pool = PostgresPool.getInstance();
    const client: PoolClient = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
      `);

      const migrationsDir = path.join(__dirname, 'migrations');
      if (!fs.existsSync(migrationsDir)) {
        await client.query('COMMIT');
        return;
      }

      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
      for (const file of files) {
        const { rows } = await client.query('SELECT 1 FROM migrations WHERE name = $1', [file]);
        if (rows.length === 0) {
          console.log(`🟨 Aplicando migración PostgreSQL: ${file}...`);
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
          await client.query(sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          console.log(`🟩 Migración PostgreSQL aplicada con éxito: ${file}`);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🟥 Error ejecutando migraciones de PostgreSQL:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
