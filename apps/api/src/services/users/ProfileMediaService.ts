import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';

export class ProfileMediaService {
  private static mediaCache = new Map<string, { icon_url: string | null; banner_url: string | null; cachedAt: number }>();

  public static invalidateCache(username: string): void {
    this.mediaCache.delete(username.toLowerCase());
  }

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

