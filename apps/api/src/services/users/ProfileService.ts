import { PublicUser, UpdateProfileInput } from '@oomfy/shared';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoFollowRepository } from '../../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
import { NotFoundError, ForbiddenError } from '../../errors/AppError.js';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { SystemSettingsService } from '../admin/SystemSettingsService.js';
import { UserSyncService } from './UserSyncService.js';

export class ProfileService {
  public static async getProfile(username: string, viewerId?: string): Promise<PublicUser> {
    const profile = await MongoMemberRepository.findByUsername(username);
    if (!profile) throw new NotFoundError('Perfil de usuario no encontrado.');
    if (viewerId) {
      const [isFollowing, followsYou] = await Promise.all([
        MongoFollowRepository.isFollowing(viewerId, profile.id),
        MongoFollowRepository.isFollowing(profile.id, viewerId),
      ]);
      return { ...profile, is_following: isFollowing, follows_you: followsYou };
    }
    return { ...profile, is_following: false, follows_you: false };
  }

  public static async updateProfile(
    userId: string,
    input: UpdateProfileInput,
    iconFile?: Express.Multer.File,
    bannerFile?: Express.Multer.File
  ): Promise<PublicUser> {
    const user = await PostgresUserRepository.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado.');

    const settings = await SystemSettingsService.getSettings();
    if (settings.disable_profile_editing && user.role !== 'admin') {
      throw new ForbiddenError('La edición de perfiles está desactivada temporalmente por mantenimiento.');
    }

    let iconUrl: string | null | undefined = undefined;
    let bannerUrl: string | null | undefined = undefined;

    if (input.icon_action === 'update' && iconFile) {
      const upload = await ImgBBStorageAdapter.upload(iconFile.buffer);
      iconUrl = upload.url;
      await PostgresPool.getInstance().query(`UPDATE icon SET url = $1, imgbb_id = $2 WHERE id = $3`, [upload.url, upload.imgbb_id, userId]);
    } else if (input.icon_action === 'delete') {
      iconUrl = null;
      await PostgresPool.getInstance().query(`UPDATE icon SET url = NULL WHERE id = $1`, [userId]);
    }

    if (input.banner_action === 'update' && bannerFile) {
      const upload = await ImgBBStorageAdapter.upload(bannerFile.buffer);
      bannerUrl = upload.url;
      await PostgresPool.getInstance().query(`UPDATE banner SET url = $1, imgbb_id = $2 WHERE id = $3`, [upload.url, upload.imgbb_id, userId]);
    } else if (input.banner_action === 'delete') {
      bannerUrl = null;
      await PostgresPool.getInstance().query(`UPDATE banner SET url = NULL WHERE id = $1`, [userId]);
    }

    await PostgresPool.getInstance().query(
      `UPDATE oomfy SET name = COALESCE($1, name), bio = COALESCE($2, bio), location = COALESCE($3, location), link = COALESCE($4, link), updated_at = NOW() WHERE id = $5`,
      [input.name || null, input.bio || null, input.location || null, input.link || null, userId]
    );

    await MongoMemberRepository.createOrUpdate({
      id: userId,
      username: user.username,
      name: input.name || user.name,
      bio: input.bio !== undefined ? input.bio : user.bio,
      location: input.location !== undefined ? input.location : user.location,
      link: input.link !== undefined ? input.link : user.link,
      icon_url: iconUrl !== undefined ? iconUrl : undefined,
      banner_url: bannerUrl !== undefined ? bannerUrl : undefined,
    });

    await UserSyncService.syncProfile(userId, user.username, {
      name: input.name,
      icon_url: iconUrl,
      banner_url: bannerUrl,
    });

    this.mediaCache.delete(user.username.toLowerCase());
    const updated = await MongoMemberRepository.findById(userId);
    return updated!;
  }

  private static mediaCache = new Map<string, { icon_url: string | null; banner_url: string | null; cachedAt: number }>();

  public static async getUserIcon(username: string): Promise<string | null> {
    const key = username.toLowerCase();
    const cached = this.mediaCache.get(key);
    if (cached && Date.now() - cached.cachedAt < 300000) return cached.icon_url;
    const raw = await MongoMemberRepository.getRawMediaUrls(username);
    this.mediaCache.set(key, { icon_url: raw.icon_url, banner_url: raw.banner_url, cachedAt: Date.now() });
    return raw.icon_url;
  }

  public static async getUserBanner(username: string): Promise<string | null> {
    const key = username.toLowerCase();
    const cached = this.mediaCache.get(key);
    if (cached && Date.now() - cached.cachedAt < 300000) return cached.banner_url;
    const raw = await MongoMemberRepository.getRawMediaUrls(username);
    this.mediaCache.set(key, { icon_url: raw.icon_url, banner_url: raw.banner_url, cachedAt: Date.now() });
    return raw.banner_url;
  }
}
