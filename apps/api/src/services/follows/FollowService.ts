import { v7 as uuidv7 } from 'uuid';
import { MongoFollowRepository } from '../../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { NotificationDispatcher } from '../notifications/NotificationDispatcher.js';
import { FollowDecoratorHelper } from './FollowDecoratorHelper.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';

export class FollowService {
  private static async resolveTarget(targetParam: string) {
    return (await MongoMemberRepository.findByUsername(targetParam)) || (await MongoMemberRepository.findById(targetParam));
  }

  public static async follow(
    follower: { id: string; username: string; name: string; role: any },
    targetParam: string
  ): Promise<{ message: string }> {
    const target = await this.resolveTarget(targetParam);
    if (!target) throw new NotFoundError('Usuario a seguir no encontrado.');
    if (target.id === follower.id) throw new BadRequestError('No puedes seguirte a ti mismo.');

    const alreadyFollowing = await MongoFollowRepository.isFollowing(follower.id, target.id);
    if (!alreadyFollowing) {
      const followerProfile = await MongoMemberRepository.findById(follower.id);
      const relation = {
        id: uuidv7(),
        follower_id: follower.id,
        followed_id: target.id,
        follower: {
          id: follower.id, username: follower.username, name: follower.name, role: follower.role,
          icon_url: followerProfile?.icon_url || null, banner_url: followerProfile?.banner_url || null,
        },
        followed: {
          id: target.id, username: target.username, name: target.name, role: target.role,
          icon_url: target.icon_url, banner_url: target.banner_url,
        },
        created_at: new Date().toISOString(),
      };

      await MongoFollowRepository.follow(relation);
      await MongoMemberRepository.incrementCounters(follower.id, { followed_count: 1 });
      await MongoMemberRepository.incrementCounters(target.id, { follower_count: 1 });

      await NotificationDispatcher.dispatch({
        recipientId: target.id,
        sender: relation.follower,
        type: 'follow',
        push: { title: `${follower.name} te siguió`, body: '', url: `/${follower.username}`, category: 'follows' },
      });
    }

    return { message: `Ahora sigues a @${target.username}.` };
  }

  public static async unfollow(followerId: string, targetParam: string): Promise<{ message: string }> {
    const target = await this.resolveTarget(targetParam);
    if (!target) throw new NotFoundError('Usuario no encontrado.');

    const removed = await MongoFollowRepository.unfollow(followerId, target.id);
    if (removed) {
      await MongoMemberRepository.incrementCounters(followerId, { followed_count: -1 });
      await MongoMemberRepository.incrementCounters(target.id, { follower_count: -1 });
    }
    return { message: `Dejaste de seguir a @${target.username}.` };
  }

  public static async getFollowers(
    username: string,
    limit: number = 20,
    offset: number = 0,
    olderId?: string,
    viewerId?: string
  ): Promise<any[]> {
    const target = await MongoMemberRepository.findByUsername(username);
    if (!target) throw new NotFoundError('Usuario no encontrado.');
    const relations = await MongoFollowRepository.getFollowers(target.id, target.username, limit, offset, olderId);
    return FollowDecoratorHelper.decorateUsers(relations, 'follower', viewerId);
  }

  public static async getFollowed(
    username: string,
    limit: number = 20,
    offset: number = 0,
    olderId?: string,
    viewerId?: string
  ): Promise<any[]> {
    const target = await MongoMemberRepository.findByUsername(username);
    if (!target) throw new NotFoundError('Usuario no encontrado.');
    const relations = await MongoFollowRepository.getFollowed(target.id, target.username, limit, offset, olderId);
    return FollowDecoratorHelper.decorateUsers(relations, 'followed', viewerId);
  }
}
