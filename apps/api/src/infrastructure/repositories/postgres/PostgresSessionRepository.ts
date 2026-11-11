import { PostgresPool } from '../../database/postgres/PostgresPool.js';
import { TokenService } from '../../adapters/TokenService.js';

export interface SessionRecord {
  id: string;
  user_id: string;
  ip?: string;
  ip_address?: string;
  platform?: string;
  user_agent?: string;
  token: string;
  previous_token_hash?: string | null;
  reused?: boolean;
  rotatedFromPrevious?: boolean;
  created_at: string;
}

export class PostgresSessionRepository {
  public static async create(data: { id: string; user_id: string; ip: string; platform: string; token: string }): Promise<SessionRecord> {
    const pool = PostgresPool.getInstance();
    const tokenHash = TokenService.hashToken(data.token);
    const { rows } = await pool.query(
      `INSERT INTO session (id, user_id, ip, platform, token, last_active_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, user_id, ip, platform, token, created_at;`,
      [data.id, data.user_id, data.ip, data.platform, tokenHash]
    );
    await pool.query(`DELETE FROM session WHERE user_id = $1 AND created_at <= NOW() - INTERVAL '30 days'`, [data.user_id]).catch(() => {});
    return rows[0];
  }

  public static async findByToken(token: string): Promise<SessionRecord | null> {
    const hash = TokenService.hashToken(token);
    const { rows } = await PostgresPool.getInstance().query(
      `SELECT id, user_id, ip, platform, token, previous_token_hash, created_at, (last_active_at > NOW() - INTERVAL '15 seconds') AS within_grace
       FROM session WHERE (token = $1 OR previous_token_hash = $1) AND created_at > NOW() - INTERVAL '30 days' LIMIT 1`,
      [hash]
    );
    if (!rows[0]) return null;
    const row = rows[0] as SessionRecord & { within_grace?: boolean };
    const isPrev = row.previous_token_hash === hash && row.token !== hash;
    return { ...row, reused: isPrev && !row.within_grace, rotatedFromPrevious: isPrev && Boolean(row.within_grace) };
  }

  public static async updateToken(sessionId: string, newToken: string, previousToken?: string): Promise<void> {
    const newHash = TokenService.hashToken(newToken);
    const prevHash = previousToken ? TokenService.hashToken(previousToken) : null;
    await PostgresPool.getInstance().query(
      `UPDATE session SET previous_token_hash = COALESCE($1, token), token = $2, last_active_at = NOW(), created_at = NOW() WHERE id = $3`,
      [prevHash, newHash, sessionId]
    );
  }

  public static async deleteByToken(token: string): Promise<boolean> {
    const hash = TokenService.hashToken(token);
    const { rowCount } = await PostgresPool.getInstance().query(`DELETE FROM session WHERE token = $1 OR previous_token_hash = $1`, [hash]);
    return (rowCount ?? 0) > 0;
  }

  public static async listByUser(userId: string): Promise<any[]> {
    const { rows } = await PostgresPool.getInstance().query(
      `SELECT id, user_id, ip, platform, created_at FROM session WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  public static async deleteById(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await PostgresPool.getInstance().query(`DELETE FROM session WHERE id = $1 AND user_id = $2`, [id, userId]);
    return (rowCount ?? 0) > 0;
  }

  public static async deleteAllExceptCurrent(userId: string, currentSessionId?: string, currentToken?: string): Promise<number> {
    const pool = PostgresPool.getInstance();
    if (currentSessionId) {
      const { rowCount } = await pool.query(`DELETE FROM session WHERE user_id = $1 AND id <> $2`, [userId, currentSessionId]);
      return rowCount ?? 0;
    }
    if (currentToken) {
      const { rowCount } = await pool.query(`DELETE FROM session WHERE user_id = $1 AND token <> $2`, [userId, TokenService.hashToken(currentToken)]);
      return rowCount ?? 0;
    }
    const { rowCount } = await pool.query(`DELETE FROM session WHERE user_id = $1`, [userId]);
    return rowCount ?? 0;
  }

  public static async revokeUserSessions(userId: string): Promise<number> {
    const { rowCount } = await PostgresPool.getInstance().query(`DELETE FROM session WHERE user_id = $1`, [userId]);
    return rowCount ?? 0;
  }

  public static async revokeAllSessions(preserveToken?: string, preserveSessionId?: string): Promise<number> {
    const pool = PostgresPool.getInstance();
    if (preserveSessionId) return (await pool.query(`DELETE FROM session WHERE id <> $1`, [preserveSessionId])).rowCount ?? 0;
    if (preserveToken) return (await pool.query(`DELETE FROM session WHERE token <> $1`, [TokenService.hashToken(preserveToken)])).rowCount ?? 0;
    return (await pool.query(`DELETE FROM session`)).rowCount ?? 0;
  }
}
