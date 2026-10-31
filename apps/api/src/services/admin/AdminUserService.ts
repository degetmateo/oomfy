import { Role, AdminUserSummary } from '@oomfy/shared';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';

export class AdminUserService {
  public static async listUsers(
    query?: string,
    limit: number = 30,
    offset: number = 0
  ): Promise<AdminUserSummary[]> {
    const pool = PostgresPool.getInstance();
    let sql = `
      SELECT id, username, name, email, role, status, created_at
      FROM oomfy
    `;
    const params: any[] = [];

    if (query && query.trim()) {
      params.push(`%${query.trim()}%`);
      sql += ` WHERE username ILIKE $1 OR name ILIKE $1 OR email ILIKE $1`;
    }

    params.push(limit);
    params.push(offset);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length};`;

    const { rows } = await pool.query(sql, params);
    return rows;
  }

  public static async setUserStatus(
    userId: string,
    status: 'active' | 'suspended',
    adminId: string
  ): Promise<{ message: string }> {
    if (userId === adminId) {
      throw new BadRequestError('No puedes cambiar el estado de tu propia cuenta de administrador.');
    }

    const pool = PostgresPool.getInstance();
    const res = await pool.query('UPDATE oomfy SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id', [
      status,
      userId,
    ]);

    if (res.rowCount === 0) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    await MongoDatabase.getDb()
      .collection('members')
      .updateOne(
        { $or: [{ id: userId }, ...MongoIdHelper.idFilter(userId).$or] },
        { $set: { status, updated_at: new Date() } }
      );

    return { message: `Usuario actualizado a estado ${status}.` };
  }

  public static async setUserRole(
    userId: string,
    role: Role,
    adminId: string
  ): Promise<{ message: string }> {
    if (userId === adminId) {
      throw new BadRequestError('No puedes cambiar tu propio rol.');
    }

    const pool = PostgresPool.getInstance();
    const res = await pool.query('UPDATE oomfy SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id', [
      role,
      userId,
    ]);

    if (res.rowCount === 0) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    await MongoDatabase.getDb()
      .collection('members')
      .updateOne(
        { $or: [{ id: userId }, ...MongoIdHelper.idFilter(userId).$or] },
        { $set: { role, updated_at: new Date() } }
      );

    return { message: `Rol del usuario actualizado a ${role}.` };
  }
}

