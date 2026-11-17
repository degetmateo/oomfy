import { PostgresPool } from '../../infrastructure/database/postgres/PostgresPool.js';
import { ImgBBStorageAdapter } from '../../infrastructure/adapters/ImgBBStorageAdapter.js';
import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';

export class ProfileMediaService {
  private static mediaCache = new Map<string, { icon_url: string | null; banner_url: string | null; cachedAt: number }>();

  public static invalidateCache(username: string): void {
    this.mediaCache.delete(username.toLowerCase());
  }

  private static async fetchMedia(identifier: string): Promise<{ icon_url: string | null; banner_url: string | null }> {
    const raw = await MongoMemberRepository.getRawMediaUrls(identifier).catch(() => null);
    let icon_url = raw?.icon_url && !raw.icon_url.startsWith('/members/') ? raw.icon_url : null;
    let banner_url = raw?.banner_url && !raw.banner_url.startsWith('/members/') ? raw.banner_url : null;

    if (!icon_url || !banner_url) {
      try {
        const pool = PostgresPool.getInstance();
        const { rows } = await pool.query(
          `SELECT i.url as icon_url, b.url as banner_url, m.username, m.id
           FROM members m
           LEFT JOIN icon i ON i.id = m.id
           LEFT JOIN banner b ON b.id = m.id
           WHERE LOWER(m.username) = LOWER($1) OR m.id::text = $1
           LIMIT 1`,
          [identifier]
        );
        if (rows[0]) {
          if (!icon_url && rows[0].icon_url) icon_url = rows[0].icon_url;
          if (!banner_url && rows[0].banner_url) banner_url = rows[0].banner_url;
          if (rows[0].username && (icon_url || banner_url)) {
            await MongoMemberRepository.createOrUpdate({
              id: rows[0].id,
              username: rows[0].username,
              ...(icon_url ? { icon_url } : {}),
              ...(banner_url ? { banner_url } : {}),
            }).catch(() => {});
          }
        }
      } catch {}
    }

    return { icon_url, banner_url };
  }

  public static async getUserIcon(identifier: string): Promise<string | null> {
    const key = identifier.toLowerCase();
    const cached = this.mediaCache.get(key);
    if (cached && Date.now() - cached.cachedAt < 300000) return cached.icon_url;
    const media = await this.fetchMedia(identifier);
    this.mediaCache.set(key, { ...media, cachedAt: Date.now() });
    return media.icon_url;
  }

  public static async getUserBanner(identifier: string): Promise<string | null> {
    const key = identifier.toLowerCase();
    const cached = this.mediaCache.get(key);
    if (cached && Date.now() - cached.cachedAt < 300000) return cached.banner_url;
    const media = await this.fetchMedia(identifier);
    this.mediaCache.set(key, { ...media, cachedAt: Date.now() });
    return media.banner_url;
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
