import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
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

  public static async applyMediaUpdate(
    table: 'icon' | 'banner',
    userId: string,
    action?: 'none' | 'update' | 'delete',
    file?: Express.Multer.File
  ): Promise<string | null | undefined> {
    if (!action || action === 'none') return undefined;
    const pool = PostgresPool.getInstance();
    const existing = await pool.query(`SELECT delete_url FROM ${table} WHERE id = $1`, [userId]);
    const oldDeleteUrl = existing.rows[0]?.delete_url;

    if (action === 'update' && file) {
      const upload = await ImgBBStorageAdapter.upload(file.buffer);
      await pool.query(
        `INSERT INTO ${table} (id, url, delete_url, source, imgbb_id)
         VALUES ($1, $2, $3, 'imgbb', $4)
         ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, delete_url = EXCLUDED.delete_url, source = 'imgbb', imgbb_id = EXCLUDED.imgbb_id`,
        [userId, upload.url, upload.delete_url, upload.imgbb_id]
      );
      if (oldDeleteUrl) ImgBBStorageAdapter.delete(oldDeleteUrl).catch(() => {});
      return upload.url;
    }
    if (action === 'delete') {
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [userId]);
      if (oldDeleteUrl) ImgBBStorageAdapter.delete(oldDeleteUrl).catch(() => {});
      return null;
    }
    return undefined;
  }
}
