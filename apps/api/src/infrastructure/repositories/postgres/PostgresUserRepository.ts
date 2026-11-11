import { PoolClient } from 'pg';
import { User, Role, UserStatus } from '@oomfy/shared';
import { PostgresPool } from '../../database/postgres/PostgresPool.js';

export interface CreateUserData {
  id: string;
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
  status?: UserStatus;
  acceptedTerms?: boolean;
}

export class PostgresUserRepository {
  public static async create(data: CreateUserData, client?: PoolClient): Promise<User> {
    const q = `
      INSERT INTO members (id, username, name, email, password, role, status, terms_accepted, terms_accepted_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $8 THEN NOW() ELSE NULL END, NOW(), NOW())
      RETURNING id, username, name, email, role, status, bio, location, link, terms_accepted, terms_accepted_at, created_at;
    `;
    const executor = client || PostgresPool.getInstance();
    const { rows } = await executor.query(q, [
      data.id, data.username.toLowerCase(), data.name, data.email.toLowerCase(),
      data.passwordHash, data.role || 'member', data.status || 'pending', Boolean(data.acceptedTerms),
    ]);
    await executor.query('INSERT INTO icon (id) VALUES ($1) ON CONFLICT DO NOTHING', [data.id]);
    await executor.query('INSERT INTO banner (id) VALUES ($1) ON CONFLICT DO NOTHING', [data.id]);
    return rows[0];
  }

  public static async findByUsernameOrEmail(identifier: string): Promise<(User & { password: string }) | null> {
    const { rows } = await PostgresPool.getInstance().query(
      `SELECT u.id, u.username, u.name, u.email, u.password, u.role, u.status, u.bio, u.location, u.link,
              u.terms_accepted, u.terms_accepted_at, u.created_at, i.url as icon_url, b.url as banner_url
       FROM members u LEFT JOIN icon i ON i.id = u.id LEFT JOIN banner b ON b.id = u.id
       WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1);`,
      [identifier.toLowerCase()]
    );
    return rows[0] || null;
  }

  public static async findByUsername(username: string): Promise<Pick<User, 'id' | 'username' | 'name' | 'role' | 'status'> | null> {
    const { rows } = await PostgresPool.getInstance().query(
      `SELECT id, username, name, role, status FROM members WHERE LOWER(username) = LOWER($1) LIMIT 1`,
      [username.trim()]
    );
    return rows[0] || null;
  }

  public static async findById(id: string): Promise<User | null> {
    const { rows } = await PostgresPool.getInstance().query(
      `SELECT u.id, u.username, u.name, u.email, u.role, u.status, u.bio, u.location, u.link,
              u.terms_accepted, u.terms_accepted_at, u.created_at, i.url as icon_url, b.url as banner_url
       FROM members u LEFT JOIN icon i ON i.id = u.id LEFT JOIN banner b ON b.id = u.id
       WHERE u.id = $1;`,
      [id]
    );
    return rows[0] || null;
  }

  public static async activateUser(id: string): Promise<boolean> {
    const { rowCount } = await PostgresPool.getInstance().query(
      `UPDATE members SET status = 'active', updated_at = NOW() WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  }

  public static async updatePassword(id: string, passwordHash: string): Promise<void> {
    await PostgresPool.getInstance().query(`UPDATE members SET password = $1, updated_at = NOW() WHERE id = $2`, [passwordHash, id]);
  }

  public static async deleteById(id: string): Promise<boolean> {
    const { rowCount } = await PostgresPool.getInstance().query(`DELETE FROM members WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }
}
