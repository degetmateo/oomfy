import { Role, AdminUserSummary } from '@oomfy/shared';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';
import { UserSyncService } from '../users/UserSyncService.js';
import { BackgroundTaskDispatcher } from '../../infrastructure/async/BackgroundTaskDispatcher.js';
import { AdminUserFilters, AdminUserQueryBuilder } from './AdminUserQueryBuilder.js';

export class AdminUserService {
  public static async listUsers(filters: AdminUserFilters): Promise<AdminUserSummary[]> {
    const pool = PostgresPool.getInstance();
    const { sql, params } = AdminUserQueryBuilder.build(filters);
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
    const res = await pool.query('UPDATE members SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id', [
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
    const res = await pool.query('UPDATE members SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username', [
      role,
      userId,
    ]);

    if (res.rowCount === 0) {
      throw new NotFoundError('Usuario no encontrado.');
    }

    const username = res.rows[0]?.username;

    await MongoDatabase.getDb()
      .collection('members')
      .updateOne(
        { $or: [{ id: userId }, ...MongoIdHelper.idFilter(userId).$or] },
        { $set: { role, updated_at: new Date() } }
      );

    if (username) {
      BackgroundTaskDispatcher.dispatch(`sync-role-${userId}`, () =>
        UserSyncService.syncRole(userId, username, role)
      );
    }

    return { message: `Rol del usuario actualizado a ${role}.` };
  }
}
