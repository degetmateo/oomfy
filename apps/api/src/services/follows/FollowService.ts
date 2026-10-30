import { v7 as uuidv7 } from 'uuid';
import { MongoFollowRepository } from '../../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoNotificationRepository } from '../../infrastructure/repositories/mongo/MongoNotificationRepository.js';
import { BadRequestError, NotFoundError } from '../../errors/AppError.js';
import { SocketGateway } from '../../socket/SocketGateway.js';

export class FollowService {
  public static async follow(
    follower: { id: string; username: string; name: string; role: any },
    targetParam: string
  ): Promise<{ message: string }> {
    let target = await MongoMemberRepository.findByUsername(targetParam);
    if (!target) {
      target = await MongoMemberRepository.findById(targetParam);
    }
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
          id: follower.id,
          username: follower.username,
          name: follower.name,
          role: follower.role,
          icon_url: followerProfile?.icon_url || null,
          banner_url: followerProfile?.banner_url || null,
        },
        followed: {
          id: target.id,
          username: target.username,
          name: target.name,
          role: target.role,
          icon_url: target.icon_url,
          banner_url: target.banner_url,
        },
        created_at: new Date().toISOString(),
      };

      await MongoFollowRepository.follow(relation);
      await MongoMemberRepository.incrementCounters(follower.id, { followed_count: 1 });
      await MongoMemberRepository.incrementCounters(target.id, { follower_count: 1 });

      const notif = {
        id: uuidv7(),
        recipient_id: target.id,
        sender: relation.follower,
        type: 'follow' as const,
        target_publication_id: null,
        status: 'pending' as const,
        created_at: new Date().toISOString(),
      };
      await MongoNotificationRepository.create(notif);
      SocketGateway.sendNotification(target.id, notif);
    }

    return { message: `Ahora sigues a @${target.username}.` };
  }

  public static async unfollow(followerId: string, targetParam: string): Promise<{ message: string }> {
    let target = await MongoMemberRepository.findByUsername(targetParam);
    if (!target) {
      target = await MongoMemberRepository.findById(targetParam);
    }
    if (!target) throw new NotFoundError('Usuario no encontrado.');

    const removed = await MongoFollowRepository.unfollow(followerId, target.id);
    if (removed) {
      await MongoMemberRepository.incrementCounters(followerId, { followed_count: -1 });
      await MongoMemberRepository.incrementCounters(target.id, { follower_count: -1 });
    }
    return { message: `Dejaste de seguir a @${target.username}.` };
  }
}

