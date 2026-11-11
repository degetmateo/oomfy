import { MongoFollowRepository } from '../../infrastructure/repositories/mongo/MongoFollowRepository.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';

export class FollowDecoratorHelper {
  public static async decorateUsers(
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
          icon_url: `/members/${fallback.username}/icon`,
          banner_url: `/members/${fallback.username}/banner`,
          follower_count: 0,
          followed_count: 0,
          publication_count: 0,
        };
      }
      if (u) {
        const uIdStr = String(u.id);
        users.push({ ...u, id: uIdStr, is_following: viewerId ? followingSet.has(uIdStr) : false });
      }
    }
    return users;
  }
}

