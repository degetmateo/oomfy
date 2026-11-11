import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';
import { MongoIdHelper } from '../../infrastructure/repositories/mongo/MongoIdHelper.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { PushSubscriptionRepository } from '../../infrastructure/repositories/mongo/PushSubscriptionRepository.js';
import { PostgresSessionRepository } from '../../infrastructure/repositories/postgres/PostgresSessionRepository.js';
import { PasswordHasher } from '../../infrastructure/adapters/PasswordHasher.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
import { AuthSessionValidator } from '../auth/AuthSessionValidator.js';
import { SocketGateway } from '../../socket/SocketGateway.js';
import { ProfileMediaService } from './ProfileMediaService.js';
import { NotFoundError, UnauthorizedError } from '../../errors/AppError.js';

export class AccountLifecycleService {
  public static async exportMyData(userId: string) {
    const pool = PostgresPool.getInstance();
    const { rows } = await pool.query(
      `SELECT id, username, name, email, role, status, bio, location, link, terms_accepted, terms_accepted_at, created_at, updated_at
       FROM members WHERE id = $1`,
      [userId]
    );
    if (!rows[0]) throw new NotFoundError('Usuario no encontrado.');

    const db = MongoDatabase.getDb();
    const variants = MongoIdHelper.idVariants(userId);
    const [sessions, publications, follows, notifications, chats, messages, pushPrefs] = await Promise.all([
      PostgresSessionRepository.listByUser(userId),
      db.collection('publications').find({ $or: [{ 'author.id': { $in: variants } }, { 'author._id': { $in: variants } }] }).toArray(),
      db.collection('follows').find({ $or: [{ follower_id: { $in: variants } }, { followed_id: { $in: variants } }] }).toArray(),
      db.collection('notifications').find({ recipient_id: { $in: variants } }).toArray(),
      db.collection('chats').find({ participant_ids: { $in: variants } }).toArray(),
      db.collection('messages').find({ sender_id: { $in: variants } }).toArray(),
      PushSubscriptionRepository.getPreferences(userId),
    ]);

    return {
      exported_at: new Date().toISOString(),
      account: rows[0],
      sessions,
      publications: publications.map(({ images, ...rest }) => ({
        ...rest,
        images: (images || []).map((img: any) => ({ url: img.url, source: img.source, index: img.index })),
      })),
      follows,
      notifications,
      chats,
      messages,
      push_preferences: pushPrefs.preferences,
    };
  }

  public static async deleteMyAccount(userId: string, password: string): Promise<{ message: string }> {
    const pool = PostgresPool.getInstance();
    const { rows } = await pool.query('SELECT id, username, password FROM members WHERE id = $1', [userId]);
    if (!rows[0]) throw new NotFoundError('Usuario no encontrado.');

    const valid = await PasswordHasher.compare(password, rows[0].password);
    if (!valid) throw new UnauthorizedError('Contraseña incorrecta.');

    const [iconRes, bannerRes] = await Promise.all([
      pool.query('SELECT delete_url FROM icon WHERE id = $1', [userId]),
      pool.query('SELECT delete_url FROM banner WHERE id = $1', [userId]),
    ]);
    const deleteUrls = [iconRes.rows[0]?.delete_url, bannerRes.rows[0]?.delete_url].filter(Boolean);

    const db = MongoDatabase.getDb();
    const variants = MongoIdHelper.idVariants(userId);
    const userPubs = await db.collection('publications')
      .find({ $or: [{ 'author.id': { $in: variants } }, { 'author._id': { $in: variants } }] }, { projection: { images: 1 } })
      .toArray();
    for (const pub of userPubs) {
      for (const img of pub.images || []) {
        if (img?.delete_url) deleteUrls.push(img.delete_url);
      }
    }

    await PostgresSessionRepository.revokeUserSessions(userId);
    AuthSessionValidator.suspendUser(userId);
    SocketGateway.disconnectUser(userId);

    await Promise.all([
      db.collection('publications').deleteMany({ $or: [{ 'author.id': { $in: variants } }, { 'author._id': { $in: variants } }] }),
      db.collection('upvotes').deleteMany({ user_id: { $in: variants } }),
      db.collection('follows').deleteMany({ $or: [{ follower_id: { $in: variants } }, { followed_id: { $in: variants } }] }),
      db.collection('notifications').deleteMany({ $or: [{ recipient_id: { $in: variants } }, { 'sender.id': { $in: variants } }] }),
      db.collection('messages').deleteMany({ sender_id: { $in: variants } }),
      db.collection('chats').updateMany({ participant_ids: { $in: variants } }, { $pull: { participant_ids: { $in: variants }, participants: { id: { $in: variants } } } as any }),
      PushSubscriptionRepository.deleteByUserId(userId),
      MongoMemberRepository.deleteById(userId),
    ]);
    await db.collection('chats').deleteMany({ participant_ids: { $size: 0 } });

    await pool.query('DELETE FROM members WHERE id = $1', [userId]);
    ProfileMediaService.invalidateCache(rows[0].username);
    for (const url of deleteUrls) ImgBBStorageAdapter.delete(url).catch(() => {});

    return { message: 'Tu cuenta y datos asociados han sido eliminados permanentemente.' };
  }
}
