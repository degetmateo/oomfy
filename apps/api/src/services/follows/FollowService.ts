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
    return this.decorateUsers(relations, 'follower', viewerId);
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
    return this.decorateUsers(relations, 'followed', viewerId);
  }

  private static async decorateUsers(
    relations: any[],
    targetKey: 'follower' | 'followed',
    viewerId?: string
  ): Promise<any[]> {
    if (relations.length === 0) return [];

    const userIds = relations
      .map((r) => {
        const raw = r[`${targetKey}_id`] || r[targetKey]?.id;
        return raw ? String(raw) : null;
      })
      .filter(Boolean) as string[];

    const members = await MongoMemberRepository.findManyByIds(userIds);
    const memberMap = new Map<string, any>(members.map((m) => [String(m.id), m]));
    const followingSet = viewerId
      ? await MongoFollowRepository.filterFollowing(viewerId, userIds)
      : new Set<string>();

    const users: any[] = [];
    for (const r of relations) {
      const rawUid = r[`${targetKey}_id`] || r[targetKey]?.id;
      const uid = rawUid ? String(rawUid) : '';
      const fallback = r[targetKey];
      let u = memberMap.get(uid);
      if (!u && fallback) {
        u = {
          id: String(fallback.id || uid),
          username: fallback.username,
          name: fallback.name,
          role: fallback.role || 'member',
          icon_url: `/api/members/${fallback.username}/icon`,
          banner_url: `/api/members/${fallback.username}/banner`,
          follower_count: 0,
          followed_count: 0,
          publication_count: 0,
        };
      }
      if (u) {
        const uIdStr = String(u.id);
        users.push({
          ...u,
          id: uIdStr,
          is_following: viewerId ? followingSet.has(uIdStr) : false,
        });
      }
    }
    return users;
  }
}
