import { UpdateProfileInput, PublicUser } from '@oomfy/shared';
import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoFollowRepository } from '../../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { isHttpUrl } from '../../utils/UrlSecurityHelper.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../errors/AppError.js';
import { SystemSettingsService } from '../admin/SystemSettingsService.js';
import { UserSyncService } from './UserSyncService.js';
import { ProfileMediaService } from './ProfileMediaService.js';

export class ProfileService {
  public static async getProfile(username: string, viewerId?: string): Promise<PublicUser> {
    const profile = await MongoMemberRepository.findByUsername(username);
    if (!profile) throw new NotFoundError(`Usuario @${username} no encontrado.`);

    if (viewerId && viewerId !== profile.id) {
      const [isFollowing, followsYou] = await Promise.all([
        MongoFollowRepository.isFollowing(viewerId, profile.id),
        MongoFollowRepository.isFollowing(profile.id, viewerId),
      ]);
      profile.is_following = isFollowing;
      profile.follows_you = followsYou;
    }

    if (profile.pinned_publication_id) {
      profile.pinned_publication = await MongoPublicationRepository.findById(profile.pinned_publication_id, viewerId);
      if (!profile.pinned_publication) profile.pinned_publication_id = null;
    }

    return profile;
  }

  public static async updateProfile(
    userId: string,
    input: UpdateProfileInput,
    files: { icon?: Express.Multer.File; banner?: Express.Multer.File } = {}
  ): Promise<PublicUser> {
    const existingUser = await PostgresUserRepository.findById(userId);
    if (!existingUser) throw new NotFoundError('Usuario no encontrado.');

    const settings = await SystemSettingsService.getSettings();
    if (settings.disable_profile_editing && existingUser.role !== 'admin') {
      throw new ForbiddenError('La edición de perfiles está desactivada temporalmente por mantenimiento.');
    }

    if (input.link && !isHttpUrl(input.link)) throw new BadRequestError('El enlace debe comenzar por http:// o https://.');

    const [iconUrl, bannerUrl] = await Promise.all([
      ProfileMediaService.applyMediaUpdate('icon', userId, input.icon_action, files.icon),
      ProfileMediaService.applyMediaUpdate('banner', userId, input.banner_action, files.banner),
    ]);

    const pool = PostgresPool.getInstance();
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (input.name !== undefined) { fields.push(`name = $${idx++}`); values.push(input.name); }
    if (input.bio !== undefined) { fields.push(`bio = $${idx++}`); values.push(input.bio); }
    if (input.location !== undefined) { fields.push(`location = $${idx++}`); values.push(input.location); }
    if (input.link !== undefined) { fields.push(`link = $${idx++}`); values.push(input.link); }
    if (fields.length > 0) {
      values.push(userId);
      await pool.query(`UPDATE members SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values);
    }

    const mongoUpdates: Partial<PublicUser> & { id: string; username: string } = { id: userId, username: existingUser.username };
    if (input.name !== undefined) mongoUpdates.name = input.name;
    if (input.bio !== undefined) mongoUpdates.bio = input.bio;
    if (input.location !== undefined) mongoUpdates.location = input.location;
    if (input.link !== undefined) mongoUpdates.link = input.link;
    if (iconUrl !== undefined) mongoUpdates.icon_url = iconUrl;
    if (bannerUrl !== undefined) mongoUpdates.banner_url = bannerUrl;

    await MongoMemberRepository.createOrUpdate(mongoUpdates);
    if (iconUrl !== undefined || bannerUrl !== undefined) ProfileMediaService.invalidateCache(existingUser.username);
    UserSyncService.enqueueProfileSync(userId, existingUser.username, { name: input.name, icon_url: iconUrl, banner_url: bannerUrl });

    return (await MongoMemberRepository.findById(userId))!;
  }

  public static async acceptTerms(userId: string): Promise<PublicUser> {
    await PostgresPool.getInstance().query(`UPDATE members SET terms_accepted = TRUE, terms_accepted_at = COALESCE(terms_accepted_at, NOW()) WHERE id = $1`, [userId]);
    const updated = await MongoMemberRepository.acceptTerms(userId);
    if (!updated) throw new NotFoundError('Usuario no encontrado.');
    return updated;
  }

  public static getUserIcon = (username: string) => ProfileMediaService.getUserIcon(username);
  public static getUserBanner = (username: string) => ProfileMediaService.getUserBanner(username);
}
