import { describe, it, expect, vi, beforeEach } from 'vitest';
import dns from 'dns/promises';
import { UrlExtractor } from '../src/infrastructure/adapters/UrlExtractor.js';
import { OpenGraphParser } from '../src/infrastructure/adapters/OpenGraphParser.js';
import { AnimeEmbedAdapter } from '../src/infrastructure/adapters/AnimeEmbedAdapter.js';
import { SocialOEmbedAdapter } from '../src/infrastructure/adapters/SocialOEmbedAdapter.js';
import { TikTokEmbedAdapter } from '../src/infrastructure/adapters/TikTokEmbedAdapter.js';
import { SpotifyEmbedAdapter } from '../src/infrastructure/adapters/SpotifyEmbedAdapter.js';
import { PublicationMapper } from '../src/infrastructure/repositories/mongo/PublicationMapper.js';
import { CreatePublicationService } from '../src/services/publications/CreatePublicationService.js';
import { MongoPublicationRepository } from '../src/infrastructure/repositories/mongo/MongoPublicationRepository.js';
import { MongoMemberRepository } from '../src/infrastructure/repositories/mongo/MongoMemberRepository.js';
import { SystemSettingsService } from '../src/services/admin/SystemSettingsService.js';
import { UrlPreviewAdapter } from '../src/infrastructure/adapters/UrlPreviewAdapter.js';
import { AuthorProfileResolver } from '../src/services/publications/AuthorProfileResolver.js';
import { MentionNotificationHelper } from '../src/services/publications/MentionNotificationHelper.js';

describe('Multi-Link URL Extraction, Provider Embeds & Sanitization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts up to 4 unique valid URLs with balanced parens and ignores code blocks', () => {
    const text = [
      'Check https://en.wikipedia.org/wiki/Naruto_(TV_series)! and https://anilist.co/anime/20/Naruto.',
      '`https://ignored-inline.com` ```\nhttps://ignored-block.com\n```',
      '[link](https://myanimelist.net/anime/20/Naruto) plus https://youtu.be/dQw4w9WgXcQ and https://x.com/user/status/1',
      'Duplicate https://youtu.be/dQw4w9WgXcQ ignored',
    ].join(' ');
    const urls = UrlExtractor.extract(text, 4);
    expect(urls).toEqual([
      'https://en.wikipedia.org/wiki/Naruto_(TV_series)',
      'https://anilist.co/anime/20/Naruto',
      'https://myanimelist.net/anime/20/Naruto',
      'https://youtu.be/dQw4w9WgXcQ',
    ]);
  });

  it('parses attribute-order-independent OpenGraph HTML, decodes entities once, and clamps length', () => {
    const longDesc = 'A'.repeat(600);
    const html = `
      <meta content="Title &amp; &quot;Test&quot; &#999999999;" property="og:title">
      <meta name="twitter:description" content="${longDesc}">
      <meta property="og:image" content="http://cdn.example.com/pic.jpg">
    `;
    const parsed = OpenGraphParser.parse(html, 'https://example.com/page');
    expect(parsed.title).toContain('Title & "Test"');
    expect(parsed.description?.length).toBe(400);
    expect(parsed.image).toBe('https://cdn.example.com/pic.jpg');
  });

  it('fetches AniList GraphQL embed and falls back cleanly on MyAnimeList / Spotify / YouTube', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === 'https://graphql.anilist.co') {
        return new Response(JSON.stringify({
          data: { Media: { title: { english: 'Frieren' }, format: 'TV', episodes: 28, averageScore: 91, genres: ['Adventure'], description: '<p>Great journey<br/>now.</p>', coverImage: { large: 'http://s4.anilist.co/cover.jpg' } } },
        }), { status: 200 });
      }
      if (url.includes('youtube.com/oembed')) return new Response('fail', { status: 500 });
      if (url.includes('open.spotify.com/oembed')) return new Response('fail', { status: 503 });
      return new Response('', { status: 404 });
    });

    const ani = await AnimeEmbedAdapter.fetchAniList('https://anilist.co/anime/154587/Frieren');
    expect(ani?.type).toBe('anilist');
    expect(ani?.title).toBe('Frieren');
    expect(ani?.score).toBe(9.1);
    expect(ani?.description).toBe('Great journey now.');
    expect(ani?.thumbnail_url).toBe('https://s4.anilist.co/cover.jpg');
    expect(fetchSpy).toHaveBeenCalled();

    const yt = await SocialOEmbedAdapter.fetchYouTube('https://youtu.be/dQw4w9WgXcQ');
    expect(yt?.video_id).toBe('dQw4w9WgXcQ');
    expect(yt?.iframe_url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');

    const sp = await SpotifyEmbedAdapter.fetchEmbed('https://open.spotify.com/track/123');
    expect(sp.type).toBe('spotify');
    expect(sp.iframe_url).toBe('');
  });

  it('keeps reply type intact even if reply contains Oomfy URL, and strips viewer flags in PublicationMapper', async () => {
    vi.spyOn(SystemSettingsService, 'getSettings').mockResolvedValue({ disable_post_creation: false } as any);
    vi.spyOn(AuthorProfileResolver, 'resolve').mockResolvedValue({ iconUrl: null, bannerUrl: null });
    vi.spyOn(MentionNotificationHelper, 'notifyPublicationCreated').mockResolvedValue(undefined);
    vi.spyOn(MongoMemberRepository, 'findById').mockResolvedValue({ id: 'u1', username: 'u1', name: 'U1', icon_url: null, banner_url: null } as any);
    vi.spyOn(MongoMemberRepository, 'incrementCounters').mockResolvedValue(undefined);
    vi.spyOn(MongoPublicationRepository, 'incrementCounters').mockResolvedValue(undefined);
    vi.spyOn(MongoPublicationRepository, 'create').mockResolvedValue(undefined);
    vi.spyOn(MongoPublicationRepository, 'findById').mockResolvedValue({
      id: 'parent-1', author: { id: 'u1', username: 'u1', name: 'U1', role: 'member', icon_url: null, banner_url: null },
      type: 'default', content: 'Parent', created_at: new Date().toISOString(), parent_publication_id: null, root_publication_id: null,
      thread_ids: [], upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0,
    });
    vi.spyOn(UrlPreviewAdapter, 'getPreviews').mockResolvedValue([
      { type: 'quote', url: 'https://oomfy.online/publication/other-1', title: 'Other', target_publication: { id: 'other-1', author: { id: 'u2', username: 'u2', name: 'U2', role: 'member', icon_url: null, banner_url: null }, type: 'default', content: 'Hi', created_at: new Date().toISOString(), parent_publication_id: null, root_publication_id: null, upvotes_count: 0, shares_count: 0, quotes_count: 0, comments_count: 0 } },
    ]);

    const reply = await CreatePublicationService.execute(
      { content: 'Mira https://oomfy.online/publication/other-1', target_id: 'parent-1' },
      { id: 'u1', username: 'u1', name: 'U1', role: 'member' }
    );
    expect(reply.type).toBe('reply');
    expect(reply.embeds?.[0]?.type).toBe('link');

    const domain = PublicationMapper.toDomain({
      _id: 'p-1', author: { id: 'u1', username: 'u1', name: 'U1' },
      is_upvoted: true, is_shared: true,
      embeds: [{ type: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ', iframe_url: 'https://evil.com/embed' }],
    });
    expect(domain.is_upvoted).toBeUndefined();
    expect(domain.is_shared).toBeUndefined();
    expect((domain.embeds?.[0] as any).iframe_url).toBeUndefined();

    const persisted = PublicationMapper.toPersistence({ ...domain, is_upvoted: true, is_shared: true, is_quoted: true });
    expect('is_upvoted' in persisted).toBe(false);
    expect('is_shared' in persisted).toBe(false);
    expect('is_quoted' in persisted).toBe(false);
  });

  it('resolves short vm.tiktok.com URLs, rejects empty oEmbed HTTP 200 errors, falls back to TikWM without usuario desconocido, and themes Spotify dark', async () => {
    vi.spyOn(dns, 'lookup').mockResolvedValue([{ address: '104.16.10.10', family: 4 }] as any);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === 'https://vm.tiktok.com/ZMshort1/') {
        return new Response('', {
          status: 302,
          headers: { location: 'https://www.tiktok.com/@coolcreator/video/7400112233?is_from_webapp=1&sender_device=pc' },
        });
      }
      if (url.includes('tiktok.com/oembed')) {
        return new Response(JSON.stringify({ code: 400, status_msg: 'Something went wrong' }), { status: 200 });
      }
      if (url.includes('tikwm.com/api')) {
        return new Response(JSON.stringify({
          code: 0,
          data: {
            title: 'Bailando en pixel',
            cover: 'http://p16.tiktokcdn.com/thumb.jpg',
            author: { unique_id: 'coolcreator', nickname: 'Cool Creator', avatar: 'http://p16.tiktokcdn.com/ava.jpg' },
          },
        }), { status: 200 });
      }
      if (url.includes('open.spotify.com/oembed')) {
        return new Response(JSON.stringify({
          title: 'Night Drive',
          author_name: 'Synth Artist',
          thumbnail_url: 'http://i.scdn.co/cover.jpg',
          html: '<iframe src="https://open.spotify.com/embed/track/abc123?utm_source=oembed"></iframe>',
        }), { status: 200 });
      }
      return new Response('', { status: 404 });
    });

    const tt = await TikTokEmbedAdapter.fetchTikTok('https://vm.tiktok.com/ZMshort1/');
    expect(tt?.url).toBe('https://www.tiktok.com/@coolcreator/video/7400112233');
    expect(tt?.author_username).toBe('coolcreator');
    expect(tt?.author_name).toBe('Cool Creator');
    expect(tt?.title).toBe('Bailando en pixel');
    expect(tt?.thumbnail_url).toBe('https://p16.tiktokcdn.com/thumb.jpg');
    expect(JSON.stringify(tt)).not.toContain('undefined');
    expect(JSON.stringify(tt)).not.toContain('desconocido');

    const sp = await SpotifyEmbedAdapter.fetchEmbed('https://open.spotify.com/track/abc123');
    expect(sp.media_kind).toBe('Pista');
    expect(sp.iframe_url).toContain('theme=0');
  });
});
