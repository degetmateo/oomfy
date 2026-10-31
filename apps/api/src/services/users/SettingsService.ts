import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../../errors/AppError.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { SystemSettingsService } from '../admin/SystemSettingsService.js';

export class SettingsService {
  public static async updateUsername(userId: string, newUsername: string): Promise<{ username: string }> {
    const user = await PostgresUserRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado.');

    const settings = await SystemSettingsService.getSettings();
    if (settings.disable_profile_editing && user.role !== 'admin') {
      throw new ForbiddenError('La edición de perfiles está desactivada temporalmente por mantenimiento.');
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      throw new BadRequestError('El nombre de usuario debe tener entre 3 y 20 caracteres (solo letras, números y guiones bajos).');
    }

    const pool = PostgresPool.getInstance();
    const existing = await pool.query(
      'SELECT id FROM oomfy WHERE LOWER(username) = LOWER($1) AND id <> $2',
      [cleanUsername, userId]
    );

    if (existing.rows.length > 0) {
      throw new BadRequestError('Ese nombre de usuario ya está en uso por otra cuenta.');
    }

    await pool.query('UPDATE oomfy SET username = $1, updated_at = NOW() WHERE id = $2', [cleanUsername, userId]);

    const db = MongoDatabase.getDb();
    const mongoId = MongoIdHelper.toMongoId(userId);

    await db.collection('members').updateOne(
      MongoIdHelper.idFilter(userId),
      { $set: { username: cleanUsername } }
    );

    await db.collection('publications').updateMany(
      { $or: [{ 'author.id': userId }, { 'author._id': mongoId }] },
      { $set: { 'author.username': cleanUsername } }
    );

    await db.collection('follows').updateMany(
      { $or: [{ follower_id: userId }, { follower_id: mongoId }, { 'follower.id': userId }] },
      { $set: { 'follower.username': cleanUsername } }
    );

    await db.collection('follows').updateMany(
      { $or: [{ followed_id: userId }, { followed_id: mongoId }, { 'followed.id': userId }] },
      { $set: { 'followed.username': cleanUsername } }
    );

    return { username: cleanUsername };
  }

  public static async updatePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    if (!newPass || newPass.length < 8) {
      throw new BadRequestError('La nueva contraseña debe tener al menos 8 caracteres.');
    }

    const user = await PostgresUserRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado.');

    const pool = PostgresPool.getInstance();
    const { rows } = await pool.query('SELECT password FROM oomfy WHERE id = $1', [userId]);
    if (!rows[0]) throw new NotFoundError('Usuario no encontrado.');

    const isValid = await PasswordHasher.compare(currentPass, rows[0].password);
    if (!isValid) {
      throw new UnauthorizedError('La contraseña actual es incorrecta.');
    }

    const hashed = await PasswordHasher.hash(newPass);
    await PostgresUserRepository.updatePassword(userId, hashed);
  }
}

