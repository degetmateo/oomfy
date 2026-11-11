import { LIMITS, Role } from '@oomfy/shared';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';
import { UserSyncService } from '../users/UserSyncService.js';
import { UserStatusEnforcementHelper } from './UserStatusEnforcementHelper.js';

export interface AdminUserUpdateInput {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  status?: 'active' | 'pending' | 'suspended';
  role?: Role;
}

const USERNAME_RE = new RegExp(`^[a-zA-Z0-9_]{${LIMITS.USERNAME_MIN},${LIMITS.USERNAME_MAX}}$`);

export class AdminUserUpdateService {
  public static async updateUser(userId: string, adminId: string, input: AdminUserUpdateInput) {
    const pool = PostgresPool.getInstance();
    const currentRes = await pool.query('SELECT id, username, name, email, role, status FROM members WHERE id = $1', [userId]);
    if (currentRes.rowCount === 0) throw new NotFoundError('Usuario no encontrado.');
    const current = currentRes.rows[0];
    const updates: Record<string, any> = {};
    const mongoUpdates: Record<string, any> = {};

    if (input.name?.trim()) {
      updates.name = input.name.trim().slice(0, LIMITS.NAME_MAX);
      mongoUpdates.name = updates.name;
    }
    if (input.username?.trim()) {
      const cleanUser = input.username.trim().toLowerCase();
      if (!USERNAME_RE.test(cleanUser)) throw new BadRequestError(`El username debe tener ${LIMITS.USERNAME_MIN}-${LIMITS.USERNAME_MAX} caracteres alfanuméricos o guiones bajos.`);
      const dup = await pool.query('SELECT 1 FROM members WHERE LOWER(username) = $1 AND id <> $2', [cleanUser, userId]);
      if (dup.rowCount && dup.rowCount > 0) throw new BadRequestError('El nombre de usuario ya está en uso.');
      updates.username = cleanUser;
      mongoUpdates.username = cleanUser;
    }
    if (input.email?.trim()) {
      const cleanEmail = input.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new BadRequestError('Correo electrónico inválido.');
      const dup = await pool.query('SELECT 1 FROM members WHERE LOWER(email) = $1 AND id <> $2', [cleanEmail, userId]);
      if (dup.rowCount && dup.rowCount > 0) throw new BadRequestError('El correo electrónico ya está en uso.');
      updates.email = cleanEmail;
    }
    if (input.password && input.password.trim().length > 0) {
      if (input.password.length < LIMITS.PASSWORD_MIN || input.password.length > LIMITS.PASSWORD_MAX) {
        throw new BadRequestError(`La contraseña debe tener entre ${LIMITS.PASSWORD_MIN} y ${LIMITS.PASSWORD_MAX} caracteres.`);
      }
      updates.password = await PasswordHasher.hash(input.password);
    }
    if (input.status) {
      if (!['active', 'pending', 'suspended'].includes(input.status)) throw new BadRequestError('Estado inválido.');
      if (userId === adminId && input.status === 'suspended') throw new BadRequestError('No puedes suspender tu propia cuenta.');
      updates.status = input.status;
      mongoUpdates.status = input.status;
    }
    if (input.role) {
      if (!['member', 'tester', 'mod', 'admin'].includes(input.role)) throw new BadRequestError('Rol inválido.');
      if (userId === adminId && input.role !== 'admin') throw new BadRequestError('No puedes remover tu propio rol de administrador.');
      updates.role = input.role;
      mongoUpdates.role = input.role;
    }

    if (Object.keys(updates).length === 0) return { message: 'Sin cambios.', user: current };
    const keys = Object.keys(updates);
    const setSql = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE members SET ${setSql}, updated_at = NOW() WHERE id = $1 RETURNING id, username, name, email, role, status`,
      [userId, ...keys.map((k) => updates[k])]
    );

    await MongoDatabase.getDb().collection('members').updateOne(
      { $or: [{ id: userId }, ...MongoIdHelper.idFilter(userId).$or] },
      { $set: { ...mongoUpdates, updated_at: new Date() } }
    );

    const updatedUser = rows[0];
    await UserStatusEnforcementHelper.onStatusUpdated(userId, updates.status);
    if (updates.password || (updates.role && updates.role !== current.role)) {
      await UserStatusEnforcementHelper.revokeForSecurityChange(userId);
    }
    if (updates.username && updates.username !== current.username) UserSyncService.enqueueUsernameSync(userId, current.username, updates.username);
    if ((updates.name && updates.name !== current.name) || (updates.role && updates.role !== current.role)) {
      UserSyncService.enqueueProfileSync(userId, updatedUser.username, { name: updates.name, role: updates.role });
    }
    return { message: 'Usuario actualizado correctamente.', user: updatedUser };
  }
}
