import { Role } from '@oomfy/shared';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';
import { UserSyncService } from '../users/UserSyncService.js';

export interface AdminUserUpdateInput {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  status?: 'active' | 'pending' | 'suspended';
  role?: Role;
}

export class AdminUserUpdateService {
  public static async updateUser(userId: string, adminId: string, input: AdminUserUpdateInput) {
    const pool = PostgresPool.getInstance();
    const currentRes = await pool.query('SELECT * FROM members WHERE id = $1', [userId]);
    if (currentRes.rowCount === 0) throw new NotFoundError('Usuario no encontrado.');
    const current = currentRes.rows[0];

    const updates: Record<string, any> = {};
    const mongoUpdates: Record<string, any> = {};

    if (input.name !== undefined && input.name.trim()) {
      updates.name = input.name.trim();
      mongoUpdates.name = updates.name;
    }
    if (input.username !== undefined && input.username.trim()) {
      const u = input.username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(u)) throw new BadRequestError('El nombre de usuario debe tener entre 3 y 30 caracteres alfanuméricos.');
      const conflict = await pool.query('SELECT id FROM members WHERE LOWER(username) = $1 AND id != $2', [u, userId]);
      if (conflict.rowCount! > 0) throw new BadRequestError('El nombre de usuario ya está en uso.');
      updates.username = u;
      mongoUpdates.username = u;
    }
    if (input.email !== undefined && input.email.trim()) {
      const e = input.email.trim().toLowerCase();
      if (!/\S+@\S+\.\S+/.test(e)) throw new BadRequestError('El correo electrónico no es válido.');
      const conflict = await pool.query('SELECT id FROM members WHERE LOWER(email) = $1 AND id != $2', [e, userId]);
      if (conflict.rowCount! > 0) throw new BadRequestError('El correo electrónico ya está en uso.');
      updates.email = e;
      mongoUpdates.email = e;
    }
    if (input.password !== undefined && input.password.trim()) {
      if (input.password.length < 8) throw new BadRequestError('La contraseña debe tener al menos 8 caracteres.');
      updates.password = await PasswordHasher.hash(input.password);
    }
    if (input.status !== undefined) {
      if (!['active', 'pending', 'suspended'].includes(input.status)) throw new BadRequestError('Estado inválido.');
      if (userId === adminId && input.status !== 'active') throw new BadRequestError('No puedes cambiar tu propio estado a inactivo/suspendido.');
      updates.status = input.status;
      mongoUpdates.status = input.status;
    }
    if (input.role !== undefined) {
      if (!['member', 'mod', 'admin'].includes(input.role)) throw new BadRequestError('Rol inválido.');
      if (userId === adminId && input.role !== 'admin') throw new BadRequestError('No puedes remover tu propio rol de administrador.');
      updates.role = input.role;
      mongoUpdates.role = input.role;
    }

    if (Object.keys(updates).length === 0) return { message: 'Sin cambios.', user: current };

    const keys = Object.keys(updates);
    const setSql = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const values = keys.map((k) => updates[k]);
    const { rows } = await pool.query(
      `UPDATE members SET ${setSql}, updated_at = NOW() WHERE id = $1 RETURNING id, username, name, email, role, status`,
      [userId, ...values]
    );

    mongoUpdates.updated_at = new Date();
    await MongoDatabase.getDb().collection('members').updateOne(
      { $or: [{ id: userId }, ...MongoIdHelper.idFilter(userId).$or] },
      { $set: mongoUpdates }
    );

    const updatedUser = rows[0];
    if (updates.username && updates.username !== current.username) {
      UserSyncService.enqueueUsernameSync(userId, current.username, updates.username);
    }
    if ((updates.name && updates.name !== current.name) || (updates.role && updates.role !== current.role)) {
      UserSyncService.enqueueProfileSync(userId, updatedUser.username, {
        name: updates.name,
        role: updates.role,
      });
    }

    return { message: 'Usuario actualizado correctamente.', user: updatedUser };
  }
}

