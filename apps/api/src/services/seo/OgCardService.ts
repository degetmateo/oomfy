import { MongoMemberRepository } from '../../infrastructure/repositories/mongo/MongoMemberRepository.js';
import { MongoPublicationRepository } from '../../infrastructure/repositories/mongo/MongoPublicationRepository.js';

const BASE_URL = 'https://oomfy.online';
const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class OgCardService {
  public static async generateUserOgSvg(username: string): Promise<string> {
    const user = await MongoMemberRepository.findByUsername(username).catch(() => null);
    const name = esc(user?.name || username || 'Usuario');
    const handle = esc(user?.username || username || 'oomfy');
    const bio = esc((user?.bio || `Descubre las publicaciones y actividad de @${handle} en Oomfy.`).slice(0, 110));
    const initials = esc(handle.slice(0, 2).toUpperCase());
    const followers = user?.follower_count || 0;
    const posts = user?.publication_count || 0;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0d0f12"/>
  <rect x="36" y="36" width="1128" height="558" fill="#151921" stroke="#4ade80" stroke-width="4"/>
  <rect x="84" y="88" width="140" height="140" fill="#0d0f12" stroke="#4ade80" stroke-width="4"/>
  <text x="154" y="176" font-family="monospace" font-size="56" font-weight="bold" fill="#4ade80" text-anchor="middle">${initials}</text>
  <text x="256" y="148" font-family="sans-serif" font-size="48" font-weight="bold" fill="#ffffff">${name}</text>
  <text x="256" y="198" font-family="monospace" font-size="30" fill="#4ade80">@${handle}</text>
  <text x="84" y="310" font-family="sans-serif" font-size="28" fill="#cbd5e1">${bio}</text>
  <text x="84" y="495" font-family="monospace" font-size="26" font-weight="bold" fill="#94a3b8">${followers} SEGUIDORES  •  ${posts} PUBLICACIONES</text>
  <text x="1116" y="535" font-family="monospace" font-size="32" font-weight="bold" fill="#4ade80" text-anchor="end">OOMFY.ONLINE</text>
</svg>`;
  }

  public static async generateBotHtml(rawPath: string): Promise<string> {
    const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    let title = 'Oomfy — Tu comunidad y red social para compartir y conectar';
    let desc = 'Explora publicaciones, debates, arte digital, gaming y comunidades en tiempo real en Oomfy.';
    let canonical = `${BASE_URL}${cleanPath.split('?')[0]}`;
    let ogImage = `${BASE_URL}/pwa-512x512.png`, ogType = 'website', robots = 'index, follow';
    let jsonLd: Record<string, any> = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Oomfy', url: BASE_URL };

    const pubMatch = cleanPath.match(/^\/publication\/([^/?#]+)/);
    const topicMatch = cleanPath.match(/^\/t\/([^/?#]+)/);
    const userMatch = !pubMatch && !topicMatch && !['/', '/explore', '/signin', '/register'].includes(cleanPath)
      ? cleanPath.match(/^\/([a-zA-Z0-9_]{3,30})$/) : null;

    if (pubMatch) {
      const pub = await MongoPublicationRepository.findById(pubMatch[1]).catch(() => null);
      if (pub) {
        const snippet = (pub.content || 'Publicación multimedia').replace(/\s+/g, ' ').trim();
        const plain = snippet.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]/gu, '');
        const mediaList = pub.images || (pub as any).media || [];
        const gifUrl = (pub as any).gif_url;
        if (plain.length < 15 && mediaList.length === 0 && !gifUrl) robots = 'noindex, follow';
        title = `${pub.author.name}: "${snippet.slice(0, 60)}" en Oomfy`;
        desc = snippet.slice(0, 155);
        ogImage = mediaList[0]?.url || gifUrl || `${BASE_URL}/og/user/${pub.author.username}`;
        ogType = 'article';
        jsonLd = {
          '@context': 'https://schema.org', '@type': 'SocialMediaPosting',
          headline: snippet.slice(0, 110), articleBody: pub.content || '', datePublished: pub.created_at,
          author: { '@type': 'Person', name: pub.author.name, url: `${BASE_URL}/${pub.author.username}` },
          interactionStatistic: [
            { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: pub.upvotes_count ?? (pub as any).upvote_count ?? 0 },
            { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: pub.comments_count ?? (pub as any).comment_count ?? 0 },
          ],
        };
      }
    } else if (userMatch) {
      const user = await MongoMemberRepository.findByUsername(userMatch[1]).catch(() => null);
      if (user) {
        if (!user.publication_count && !user.follower_count && !user.bio) robots = 'noindex, follow';
        title = `${user.name} (@${user.username}) — Perfil y Publicaciones | Oomfy`;
        desc = (user.bio || `Mira las últimas publicaciones, fotos y actividad de ${user.name} (@${user.username}) en Oomfy.`).slice(0, 155);
        ogImage = `${BASE_URL}/og/user/${user.username}`;
        ogType = 'profile';
        jsonLd = {
          '@context': 'https://schema.org', '@type': 'ProfilePage',
          mainEntity: { '@type': 'Person', name: user.name, alternateName: `@${user.username}`, description: user.bio || desc, image: user.icon_url || ogImage, url: `${BASE_URL}/${user.username}` },
        };
      }
    } else if (topicMatch) {
      const tag = decodeURIComponent(topicMatch[1]);
      title = `#${tag} — Publicaciones y Comunidad sobre ${tag} | Oomfy`;
      desc = `Explora las mejores publicaciones, imágenes y conversaciones sobre #${tag} en Oomfy.`;
    }

    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/><meta name="robots" content="${robots}"/><link rel="canonical" href="${esc(canonical)}"/>
<meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${esc(canonical)}"/><meta property="og:image" content="${esc(ogImage)}"/>
<meta property="og:type" content="${ogType}"/><meta property="og:site_name" content="Oomfy"/>
<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/><meta name="twitter:image" content="${esc(ogImage)}"/>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script></head><body><h1>${esc(title)}</h1><p>${esc(desc)}</p></body></html>`;
  }
}
