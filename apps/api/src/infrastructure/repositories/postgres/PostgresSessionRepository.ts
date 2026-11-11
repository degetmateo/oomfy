import { Session } from '@oomfy/shared';
import { PostgresPool } from '../../database/postgres/PostgresPool.js';

export class PostgresSessionRepository {
  public static async create(data: {
    id: string;
    user_id: string;
    ip: string;
    platform: string;
    token: string;
  }): Promise<Session> {
    const pool = PostgresPool.getInstance();
    const q = `
      INSERT INTO session (id, user_id, ip, platform, token, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, user_id, ip, platform, created_at;
    `;
    const { rows } = await pool.query(q, [data.id, data.user_id, data.ip, data.platform, data.token]);
    return rows[0];
  }

  public static async findByToken(token: string): Promise<(Session & { token: string }) | null> {
    const pool = PostgresPool.getInstance();
    const { rows } = await pool.query(
      `SELECT id, user_id, ip, platform, token, created_at
       FROM session
       WHERE token = $1
         AND created_at > NOW() - INTERVAL '30 days'
       LIMIT 1`,
      [token]
    );
    return rows[0] || null;
  }

  public static async updateToken(sessionId: string, newToken: string): Promise<boolean> {
    const pool = PostgresPool.getInstance();
    const { rowCount } = await pool.query(
      `UPDATE session SET token = $1, created_at = NOW() WHERE id = $2`,
      [newToken, sessionId]
    );
    return (rowCount ?? 0) > 0;
  }

  public static async deleteByToken(token: string): Promise<boolean> {
    const pool = PostgresPool.getInstance();
    const { rowCount } = await pool.query(`DELETE FROM session WHERE token = $1`, [token]);
    return (rowCount ?? 0) > 0;
  }

  public static async listByUser(userId: string): Promise<Session[]> {
    const pool = PostgresPool.getInstance();
    const { rows } = await pool.query(
      `SELECT id, user_id, ip, platform, created_at FROM session WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  public static async deleteById(sessionId: string, userId: string): Promise<boolean> {
    const pool = PostgresPool.getInstance();
    const { rowCount } = await pool.query(`DELETE FROM session WHERE id = $1 AND user_id = $2`, [sessionId, userId]);
    return (rowCount ?? 0) > 0;
  }

  public static async deleteAllExceptCurrent(userId: string, currentSessionId?: string, currentToken?: string): Promise<void> {
    const pool = PostgresPool.getInstance();
    const isUuid = Boolean(currentSessionId && /^[0-9a-fA-F-]{36}$/.test(currentSessionId));
    if (isUuid) {
      await pool.query(`DELETE FROM session WHERE user_id = $1 AND id <> $2`, [userId, currentSessionId]);
    } else if (currentToken) {
      await pool.query(`DELETE FROM session WHERE user_id = $1 AND token <> $2`, [userId, currentToken]);
    } else {
      await pool.query(
        `DELETE FROM session WHERE user_id = $1 AND id NOT IN (SELECT id FROM session WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1)`,
        [userId]
      );
    }
  }

  public static async revokeAllSessions(preserveToken?: string, preserveSessionId?: string): Promise<number> {
    const pool = PostgresPool.getInstance();
    const { rowCount } = await pool.query(
      `DELETE FROM session
       WHERE ($1::text IS NULL OR token <> $1)
         AND ($2::uuid IS NULL OR id <> $2)`,
      [preserveToken ?? null, preserveSessionId ?? null]
    );
    return rowCount ?? 0;
  }

  public static async revokeUserSessions(userId: string): Promise<number> {
    const pool = PostgresPool.getInstance();
    const { rowCount } = await pool.query(`DELETE FROM session WHERE user_id = $1`, [userId]);
    return rowCount ?? 0;
  }
}
