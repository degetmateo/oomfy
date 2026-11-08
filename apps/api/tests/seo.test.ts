import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SitemapService } from '../src/services/seo/SitemapService.js';
import { OgCardService } from '../src/services/seo/OgCardService.js';
import { MongoDatabase } from '../src/infrastructure/database/mongo/MongoDatabase.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoPublicationRepository } from '../src/infrastructure/repositories/mongo/MongoPublicationRepository.js';

describe('SEO Sitemap & OpenGraph Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates valid robots.txt disallowing private routes and pointing to sitemap_index.xml', () => {
    const robots = SitemapService.getRobotsTxt();
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /settings');
    expect(robots).toContain('Disallow: /chats');
    expect(robots).toContain('Disallow: /notifications');
    expect(robots).toContain('Sitemap: https://oomfy.online/sitemap_index.xml');
  });

  it('generates sitemap_index.xml with static, topics, users and posts sitemaps', () => {
    const xml = SitemapService.getSitemapIndex();
    expect(xml).toContain('<sitemapindex');
    expect(xml).toContain('https://oomfy.online/sitemap-static.xml');
    expect(xml).toContain('https://oomfy.online/sitemap-topics.xml');
    expect(xml).toContain('https://oomfy.online/sitemap-users-1.xml');
    expect(xml).toContain('https://oomfy.online/sitemap-posts-1.xml');
  });

  it('filters out thin posts (< 15 chars without media) from posts sitemap', async () => {
    const mockPosts = [
      { id: 'post-thin', content: 'Hola 😂', media: [], created_at: '2026-01-01T00:00:00Z' },
      { id: 'post-rich', content: 'Esta es una publicación extensa con contenido indexable para motores de búsqueda.', media: [], created_at: '2026-01-01T00:00:00Z' },
      { id: 'post-img', content: 'Foto!', media: [{ url: 'https://i.ibb.co/1.png' }], created_at: '2026-01-01T00:00:00Z' },
    ];
    vi.spyOn(MongoDatabase, 'getDb').mockReturnValue({
      collection: () => ({
        find: () => ({
          project: () => ({
            sort: () => ({
              limit: () => ({ toArray: async () => mockPosts }),
            }),
          }),
        }),
      }),
    } as any);

    const xml = await SitemapService.getPostsSitemap();
    expect(xml).not.toContain('post-thin');
    expect(xml).toContain('https://oomfy.online/publication/post-rich');
    expect(xml).toContain('https://oomfy.online/publication/post-img');
  });

  it('generates dynamic 1200x630 SVG OpenGraph card for user profiles', async () => {
    vi.spyOn(MongoMemberRepository, 'findByUsername').mockResolvedValue({
      id: 'u1', username: 'pixel_artist', name: 'Pixel Artist', role: 'member',
      bio: 'Creador de arte retro en 8-bits', location: null, link: null, icon_url: null, banner_url: null,
      created_at: '2026-01-01T00:00:00Z', follower_count: 42, followed_count: 10, publication_count: 15,
    });

    const svg = await OgCardService.generateUserOgSvg('pixel_artist');
    expect(svg).toContain('width="1200" height="630"');
    expect(svg).toContain('Pixel Artist');
    expect(svg).toContain('@pixel_artist');
    expect(svg).toContain('42 SEGUIDORES');
  });

  it('pre-renders SocialMediaPosting JSON-LD and noindex meta for thin posts in bot HTML', async () => {
    vi.spyOn(MongoPublicationRepository, 'findById').mockResolvedValue({
      id: 'p-1', type: 'post', content: 'Corto',
      author: { id: 'u1', username: 'alice', name: 'Alice', role: 'member', icon_url: null, banner_url: null },
      media: [], upvote_count: 5, comment_count: 2, share_count: 0, quote_count: 0, created_at: '2026-01-01T00:00:00Z',
    } as any);

    const html = await OgCardService.generateBotHtml('/publication/p-1');
    expect(html).toContain('name="robots" content="noindex, follow"');
    expect(html).toContain('"@type":"SocialMediaPosting"');
  });
});

