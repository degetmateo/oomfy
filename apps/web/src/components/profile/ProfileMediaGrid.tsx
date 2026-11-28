import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff } from 'lucide-react';
import { MediaWarning, Publication } from '@oomfy/shared';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

interface Props {
  posts: Publication[];
  loadingPosts: boolean;
  isFetchingNextPage: boolean;
  loadMoreRef: React.Ref<HTMLDivElement>;
}

interface MediaGridTile {
  key: string;
  postId: string;
  url: string;
  warning: MediaWarning | null;
  isGif: boolean;
}

export const ProfileMediaGrid: React.FC<Props> = ({
  posts,
  loadingPosts,
  isFetchingNextPage,
  loadMoreRef,
}) => {
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});

  const tiles = useMemo<MediaGridTile[]>(() => {
    const items: MediaGridTile[] = [];
    for (const post of posts) {
      for (let i = 0; i < (post.images || []).length; i++) {
        const img = post.images![i];
        const resolved = resolveMediaUrl(img?.url);
        if (!resolved || failedUrls[resolved]) continue;
        const isGif = Boolean(
          img.is_gif ||
          img.source === 'tenor' ||
          /\.gif(?:$|[?#])/i.test(resolved)
        );
        items.push({
          key: `${post.id}-${i}-${resolved}`,
          postId: post.id,
          url: resolved,
          warning: img.warning ?? null,
          isGif,
        });
      }
    }
    return items;
  }, [posts, failedUrls]);

  if (loadingPosts) {
    return (
      <div className="p-8 text-center text-xs text-dark-muted font-mono">
        Cargando contenido multimedia...
      </div>
    );
  }

  if (tiles.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-dark-muted font-mono">
        No hay contenido multimedia todavía.
      </div>
    );
  }

  return (
    <div className="font-mono">
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1 p-0.5 sm:p-1">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            to={`/publication/${tile.postId}`}
            aria-label={
              tile.warning
                ? `Ver publicación con ${tile.warning === 'spoiler' ? 'spoiler' : 'contenido sensible'}`
                : 'Ver publicación multimedia'
            }
            className="aspect-square relative overflow-hidden bg-dark-card border border-dark-border/60 hover:border-brand-500/80 transition-colors block group"
          >
            <img
              src={tile.url}
              alt="Contenido multimedia de publicación"
              loading="lazy"
              decoding="async"
              onError={() => setFailedUrls((prev) => ({ ...prev, [tile.url]: true }))}
              className={`w-full h-full object-cover ${
                tile.warning
                  ? 'blur-xl scale-110 brightness-50'
                  : 'group-hover:scale-[1.03] transition-transform duration-200'
              }`}
            />
            {tile.warning ? (
              <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1 p-1 text-center">
                <EyeOff className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide leading-tight">
                  {tile.warning === 'spoiler' ? 'Spoiler' : 'Sensible'}
                </span>
              </div>
            ) : (
              tile.isGif && (
                <span className="absolute bottom-1 left-1 bg-black/80 text-brand-400 text-[10px] font-bold px-1.5 py-0.5 border border-dark-border leading-none">
                  GIF
                </span>
              )
            )}
          </Link>
        ))}
      </div>
      <div ref={loadMoreRef} className="py-4 text-center text-xs text-dark-muted">
        {isFetchingNextPage && <span>Cargando más multimedia...</span>}
      </div>
    </div>
  );
};
