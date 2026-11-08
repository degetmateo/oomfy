import { MongoDatabase } from '../../infrastructure/database/mongo/MongoDatabase.js';

const BASE_URL = 'https://oomfy.online';
const DEFAULT_TOPICS = ['gaming', 'arte-digital', 'desarrollo-web', 'musica', 'pixel-art', 'anime', 'tecnologia', 'retro'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class SitemapService {
  public static getRobotsTxt(): string {
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /settings',
      'Disallow: /messages',
      'Disallow: /chats',
      'Disallow: /notifications',
      'Disallow: /admin',
      'Disallow: /moderation',
      'Disallow: /*?sort=',
      'Disallow: /*?filter=',
      '',
      `Sitemap: ${BASE_URL}/sitemap_index.xml`,
    ].join('\n');
  }

  public static getSitemapIndex(): string {
    const now = new Date().toISOString();
    const maps = ['sitemap-static.xml', 'sitemap-topics.xml', 'sitemap-users-1.xml', 'sitemap-posts-1.xml'];
    const items = maps.map((m) => `  <sitemap><loc>${BASE_URL}/${m}</loc><lastmod>${now}</lastmod></sitemap>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`;
  }

  public static getStaticSitemap(): string {
    const urls = [
      { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'hourly' },
      { loc: `${BASE_URL}/explore`, priority: '0.9', changefreq: 'hourly' },
    ];
    return this.wrapUrlSet(urls);
  }

  public static async getTopicsSitemap(): Promise<string> {
    const tags = new Set<string>(DEFAULT_TOPICS);
    try {
      const pubs = await MongoDatabase.getDb().collection('publications')
        .find({ content: { $regex: /#[a-zA-Z0-9_-]{3,30}/ } }, { projection: { content: 1 } })
        .limit(200).toArray();
      for (const p of pubs) {
        const matches = String(p.content || '').match(/#([a-zA-Z0-9_-]{3,30})/g) || [];
        matches.forEach((m) => tags.add(m.slice(1).toLowerCase()));
      }
    } catch { /* fallback to default topics */ }
    return this.wrapUrlSet(Array.from(tags).slice(0, 500).map((t) => ({
      loc: `${BASE_URL}/t/${encodeURIComponent(t)}`, priority: '0.8', changefreq: 'daily',
    })));
  }

  public static async getUsersSitemap(): Promise<string> {
    try {
      const users = await MongoDatabase.getDb().collection('members')
        .find({ $or: [{ publication_count: { $gt: 0 } }, { follower_count: { $gt: 0 } }, { bio: { $nin: [null, ''] } }] })
        .project({ username: 1, updated_at: 1, created_at: 1 }).limit(5000).toArray();
      return this.wrapUrlSet(users.filter((u) => u.username).map((u) => ({
        loc: `${BASE_URL}/${encodeURIComponent(u.username)}`,
        lastmod: new Date(u.updated_at || u.created_at || Date.now()).toISOString(),
        priority: '0.7', changefreq: 'daily',
      })));
    } catch {
      return this.wrapUrlSet([]);
    }
  }

  public static async getPostsSitemap(): Promise<string> {
    try {
      const posts = await MongoDatabase.getDb().collection('publications')
        .find({ type: { $ne: 'share' } })
        .project({ id: 1, _id: 1, content: 1, media: 1, gif_url: 1, created_at: 1 })
        .sort({ created_at: -1 }).limit(5000).toArray();
      const indexable = posts.filter((p) => {
        const text = String(p.content || '').replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]/gu, '');
        return text.length >= 15 || (Array.isArray(p.media) && p.media.length > 0) || Boolean(p.gif_url);
      });
      return this.wrapUrlSet(indexable.map((p) => ({
        loc: `${BASE_URL}/publication/${encodeURIComponent(String(p.id || p._id))}`,
        lastmod: new Date(p.created_at || Date.now()).toISOString(),
        priority: '0.6', changefreq: 'weekly',
      })));
    } catch {
      return this.wrapUrlSet([]);
    }
  }

  private static wrapUrlSet(urls: Array<{ loc: string; lastmod?: string; changefreq?: string; priority?: string }>): string {
    const body = urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}${u.priority ? `<priority>${u.priority}</priority>` : ''}</url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
  }
}

