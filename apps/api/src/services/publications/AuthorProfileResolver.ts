import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { PostgresUserRepository } from '../../infrastructure/repositories/postgres/PostgresUserRepository.js';

export class AuthorProfileResolver {
  public static async resolve(user: { id: string; username: string; name: string; role: any }): Promise<{
    iconUrl: string | null;
    bannerUrl: string | null;
  }> {
    const authorProfile = await MongoMemberRepository.findById(user.id);
    let iconUrl = authorProfile?.icon_url || null;
    let bannerUrl = authorProfile?.banner_url || null;

    if (!iconUrl) {
      const pgUser = await PostgresUserRepository.findById(user.id);
      if (pgUser?.icon_url) {
        iconUrl = pgUser.icon_url;
        await MongoMemberRepository.createOrUpdate({
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          icon_url: iconUrl,
        });
      }
    }

    return { iconUrl, bannerUrl };
  }
}

