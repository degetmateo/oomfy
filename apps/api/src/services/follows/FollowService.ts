import { v7 as uuidv7 } from 'uuid';
import { FollowRelation, PublicUser } from '@oomfy/shared';
import { MongoFollowRepository } from '../../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { NotificationDispatcher } from '../notifications/NotificationDispatcher.js';
import { FollowDecoratorHelper } from './FollowDecoratorHelper.js';
import { NotFoundError, BadRequestError } from '../../errors/AppError.js';

export class FollowService {
  private static async resolveTargetUser(param: string): Promise<PublicUser> {
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(param) || /^\d+$/.test(param);
    const user = isId ? await MongoMemberRepository.findById(param) : await MongoMemberRepository.findByUsername(param);
    if (!user) throw new NotFoundError('Usuario no encontrado.');
    return user;
  }

  public static async follow(
    follower: { id: string; username: string; name: string; role: string },
    targetParam: string
  ): Promise<{ message: string }> {
    const followed = await this.resolveTargetUser(targetParam);
    if (follower.id === followed.id) throw new BadRequestError('No puedes seguirte a ti mismo.');
    if (await MongoFollowRepository.isFollowing(follower.id, followed.id)) {
      return { message: `Ya sigues a @${followed.username}.` };
    }

    const fp = await MongoMemberRepository.findById(follower.id);
    const relation: FollowRelation = {
      id: uuidv7(),
      follower_id: follower.id,
      followed_id: followed.id,
      created_at: new Date().toISOString(),
      follower: { id: follower.id, username: follower.username, name: fp?.name || follower.name, role: follower.role as any, icon_url: fp?.icon_url || null, banner_url: fp?.banner_url || null },
      followed: { id: followed.id, username: followed.username, name: followed.name, role: followed.role, icon_url: followed.icon_url || null, banner_url: followed.banner_url || null },
    };

    try {
      await MongoFollowRepository.follow(relation);
    } catch (err: any) {
      if (err?.code === 11000) return { message: `Ya sigues a @${followed.username}.` };
      throw err;
    }

    await Promise.all([
      MongoMemberRepository.incrementCounters(follower.id, { followed_count: 1 }),
      MongoMemberRepository.incrementCounters(followed.id, { follower_count: 1 }),
    ]);

    await NotificationDispatcher.dispatch({
      recipientId: followed.id,
      sender: relation.follower!,
      type: 'follow',
      targetPublicationId: null,
      push: { title: `${follower.name} te empezó a seguir`, body: `@${follower.username} ahora sigue tu perfil.`, url: `/${follower.username}`, category: 'follows' },
    });

    return { message: `Ahora sigues a @${followed.username}.` };
  }

  public static async unfollow(followerId: string, targetParam: string): Promise<{ message: string }> {
    const followed = await this.resolveTargetUser(targetParam);
    const removed = await MongoFollowRepository.unfollow(followerId, followed.id);
    if (removed) {
      await Promise.all([
        MongoMemberRepository.incrementCounters(followerId, { followed_count: -1 }),
        MongoMemberRepository.incrementCounters(followed.id, { follower_count: -1 }),
      ]);
    }
    return { message: `Dejaste de seguir a @${followed.username}.` };
  }

  public static async getFollowers(targetParam: string, limit = 20, offset = 0, olderId?: string, viewerId?: string): Promise<PublicUser[]> {
    const user = await this.resolveTargetUser(targetParam);
    const edges = await MongoFollowRepository.getFollowers(user.id, user.username, Math.min(Math.max(1, limit || 20), 50), offset, olderId);
    return FollowDecoratorHelper.decorateUsers(edges, 'follower', viewerId);
  }

  public static async getFollowed(targetParam: string, limit = 20, offset = 0, olderId?: string, viewerId?: string): Promise<PublicUser[]> {
    const user = await this.resolveTargetUser(targetParam);
    const edges = await MongoFollowRepository.getFollowed(user.id, user.username, Math.min(Math.max(1, limit || 20), 50), offset, olderId);
    return FollowDecoratorHelper.decorateUsers(edges, 'followed', viewerId);
  }
}
