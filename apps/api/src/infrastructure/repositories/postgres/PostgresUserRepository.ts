import { PoolClient } from 'pg';
import { User, Role, UserStatus } from '@oomfy/shared';
import { PostgresPool } from '../../database/postgres/PostgresPool.js';

export interface CreateUserData {
  id: string; // UUID v7
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
  status?: UserStatus;
}

export class PostgresUserRepository {
  public static async create(data: CreateUserData, client?: PoolClient): Promise<User> {
    const q = `
      INSERT INTO oomfy (id, username, name, email, password, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, username, name, email, role, status, bio, location, link, created_at;
    `;
    const values = [
      data.id,
      data.username.toLowerCase(),
      data.name,
      data.email.toLowerCase(),
      data.passwordHash,
      data.role || 'member',
      data.status || 'pending',
    ];

    const executor = client || PostgresPool.getInstance();
    const { rows } = await executor.query(q, values);

    await executor.query('INSERT INTO icon (id) VALUES ($1) ON CONFLICT DO NOTHING', [data.id]);
    await executor.query('INSERT INTO banner (id) VALUES ($1) ON CONFLICT DO NOTHING', [data.id]);

    return rows[0];
  }

  public static async findByUsernameOrEmail(identifier: string): Promise<(User & { password: string }) | null> {
    const pool = PostgresPool.getInstance();
    const q = `
      SELECT u.id, u.username, u.name, u.email, u.password, u.role, u.status, u.bio, u.location, u.link, u.created_at,
             i.url as icon_url, b.url as banner_url
      FROM oomfy u
      LEFT JOIN icon i ON i.id = u.id
      LEFT JOIN banner b ON b.id = u.id
      WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1);
    `;
    const { rows } = await pool.query(q, [identifier.toLowerCase()]);
    return rows[0] || null;
  }

  public static async findById(id: string): Promise<User | null> {
    const pool = PostgresPool.getInstance();
    const q = `
      SELECT u.id, u.username, u.name, u.email, u.role, u.status, u.bio, u.location, u.link, u.created_at,
             i.url as icon_url, b.url as banner_url
      FROM oomfy u
      LEFT JOIN icon i ON i.id = u.id
      LEFT JOIN banner b ON b.id = u.id
      WHERE u.id = $1;
    `;
    const { rows } = await pool.query(q, [id]);
    return rows[0] || null;
  }

  public static async activateUser(id: string): Promise<boolean> {
    const pool = PostgresPool.getInstance();
    const { rowCount } = await pool.query(
      `UPDATE oomfy SET status = 'active', updated_at = NOW() WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  }

  public static async updatePassword(id: string, passwordHash: string): Promise<void> {
    const pool = PostgresPool.getInstance();
    await pool.query(`UPDATE oomfy SET password = $1, updated_at = NOW() WHERE id = $2`, [passwordHash, id]);
  }
}

