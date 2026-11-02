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
import { BackgroundTaskDispatcher } from '../../infrastructure/async/BackgroundTaskDispatcher.js';

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

    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    if (input.name !== undefined) {
      values.push(input.name.trim() || user.name);
      updates.push(`name = $${values.length}`);
    }
    if (input.bio !== undefined) {
      values.push(input.bio ? input.bio.trim() : null);
      updates.push(`bio = $${values.length}`);
    }
    if (input.location !== undefined) {
      values.push(input.location ? input.location.trim() : null);
      updates.push(`location = $${values.length}`);
    }
    if (input.link !== undefined) {
      values.push(input.link ? input.link.trim() : null);
      updates.push(`link = $${values.length}`);
    }
    values.push(userId);
    await PostgresPool.getInstance().query(
      `UPDATE members SET ${updates.join(', ')} WHERE id = $${values.length}`,
      values
    );

    const mongoUpdate: Partial<PublicUser> & { id: string; username: string } = {
      id: userId,
      username: user.username,
    };
    if (input.name !== undefined) mongoUpdate.name = input.name.trim() || user.name;
    if (input.bio !== undefined) mongoUpdate.bio = input.bio ? input.bio.trim() : null;
    if (input.location !== undefined) mongoUpdate.location = input.location ? input.location.trim() : null;
    if (input.link !== undefined) mongoUpdate.link = input.link ? input.link.trim() : null;
    if (iconUrl !== undefined) mongoUpdate.icon_url = iconUrl;
    if (bannerUrl !== undefined) mongoUpdate.banner_url = bannerUrl;

    await MongoMemberRepository.createOrUpdate(mongoUpdate);

    if (input.name !== undefined || iconUrl !== undefined || bannerUrl !== undefined) {
      BackgroundTaskDispatcher.dispatch(`sync-profile-${userId}`, () =>
        UserSyncService.syncProfile(userId, user.username, {
          name: input.name?.trim(),
          icon_url: iconUrl,
          banner_url: bannerUrl,
        })
      );
    }

    if (iconUrl !== undefined || bannerUrl !== undefined) {
      ProfileMediaService.invalidateCache(user.username);
    }
    const updated = await MongoMemberRepository.findById(userId);
    return updated!;
  }

  public static getUserIcon(username: string): Promise<string | null> {
    return ProfileMediaService.getUserIcon(username);
  }

  public static getUserBanner(username: string): Promise<string | null> {
    return ProfileMediaService.getUserBanner(username);
  }
}
