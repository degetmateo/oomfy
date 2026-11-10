import { PublicUser, UpdateProfileInput } from '@oomfy/shared';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoFollowRepository } from '../../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
import { NotFoundError, ForbiddenError } from '../../errors/AppError.js';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { SystemSettingsService } from '../admin/SystemSettingsService.js';
import { UserSyncService } from './UserSyncService.js';
import { ProfileMediaService } from './ProfileMediaService.js';

export class ProfileService {
  public static async getProfile(username: string, viewerId?: string): Promise<PublicUser> {
    const profile = await MongoMemberRepository.findByUsername(username);
    if (!profile) throw new NotFoundError('Perfil de usuario no encontrado.');
    if (!viewerId) return { ...profile, is_following: false, follows_you: false };

    const [isFollowing, followsYou] = await Promise.all([
      MongoFollowRepository.isFollowing(viewerId, profile.id),
      MongoFollowRepository.isFollowing(profile.id, viewerId),
    ]);
    return { ...profile, is_following: isFollowing, follows_you: followsYou };
  }

  private static async handleMediaUpdate(
    table: 'icon' | 'banner', userId: string, action?: 'none' | 'update' | 'delete', file?: Express.Multer.File
  ): Promise<string | null | undefined> {
    if (action === 'update' && file) {
      const upload = await ImgBBStorageAdapter.upload(file.buffer);
      await PostgresPool.getInstance().query(`UPDATE ${table} SET url = $1, imgbb_id = $2 WHERE id = $3`, [upload.url, upload.imgbb_id, userId]);
      return upload.url;
    }
    if (action === 'delete') {
      await PostgresPool.getInstance().query(`UPDATE ${table} SET url = NULL WHERE id = $1`, [userId]);
      return null;
    }
    return undefined;
  }

  public static async updateProfile(
    userId: string, input: UpdateProfileInput, iconFile?: Express.Multer.File, bannerFile?: Express.Multer.File
  ): Promise<PublicUser> {
    const user = await PostgresUserRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado.');

    const settings = await SystemSettingsService.getSettings();
    if (settings.disable_profile_editing && user.role !== 'admin') {
      throw new ForbiddenError('La edición de perfiles está desactivada temporalmente por mantenimiento.');
    }

    const [iconUrl, bannerUrl] = await Promise.all([
      this.handleMediaUpdate('icon', userId, input.icon_action, iconFile),
      this.handleMediaUpdate('banner', userId, input.banner_action, bannerFile),
    ]);

    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    const mongoUpdate: Partial<PublicUser> & { id: string; username: string } = { id: userId, username: user.username };

    for (const field of ['name', 'bio', 'location', 'link'] as const) {
      if (input[field] !== undefined) {
        const val = field === 'name' ? (input.name!.trim() || user.name) : (input[field]?.trim() || null);
        values.push(val);
        updates.push(`${field} = $${values.length}`);
        (mongoUpdate as any)[field] = val;
      }
    }
    values.push(userId);
    await PostgresPool.getInstance().query(`UPDATE members SET ${updates.join(', ')} WHERE id = $${values.length}`, values);

    if (iconUrl !== undefined) mongoUpdate.icon_url = iconUrl;
    if (bannerUrl !== undefined) mongoUpdate.banner_url = bannerUrl;
    await MongoMemberRepository.createOrUpdate(mongoUpdate);

    if (input.name !== undefined || iconUrl !== undefined || bannerUrl !== undefined) {
      UserSyncService.enqueueProfileSync(userId, user.username, {
        name: input.name?.trim(),
        icon_url: iconUrl,
        banner_url: bannerUrl,
      });
    }
    if (iconUrl !== undefined || bannerUrl !== undefined) ProfileMediaService.invalidateCache(user.username);
    return (await MongoMemberRepository.findById(userId))!;
  }

  public static async acceptTerms(userId: string): Promise<PublicUser> {
    const updated = await MongoMemberRepository.acceptTerms(userId);
    if (!updated) throw new NotFoundError('Usuario no encontrado.');
    await PostgresPool.getInstance()
      .query(`UPDATE members SET terms_accepted = TRUE, terms_accepted_at = NOW(), updated_at = NOW() WHERE id = $1`, [userId])
      .catch(() => {});
    return updated;
  }

  public static getUserIcon(username: string): Promise<string | null> { return ProfileMediaService.getUserIcon(username); }
  public static getUserBanner(username: string): Promise<string | null> { return ProfileMediaService.getUserBanner(username); }
}
