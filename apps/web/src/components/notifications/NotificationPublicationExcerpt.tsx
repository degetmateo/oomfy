import React, { useEffect, useMemo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { CustomEmote, Publication } from '@oomfy/shared';
import { useEmoteStore } from '../../stores/emoteStore.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';
import { UrlHelper } from '../../utils/UrlHelper.js';

interface Props {
  publication?: Publication | null;
  isExplicitlyMissing?: boolean;
  isUnread?: boolean;
}

const EMOTE_SYNTAX_RE = /:([a-zA-Z0-9_]{2,32}):/;

function clampExcerptText(raw: string): string {
  const normalized = raw.trim().replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n');
  return normalized.length > 280 ? `${normalized.slice(0, 277)}…` : normalized;
}

function renderTextWithEmotes(
  text: string,
  resolveEmote: (name: string) => CustomEmote | undefined
): React.ReactNode[] {
  const regex = new RegExp(EMOTE_SYNTAX_RE.source, 'g');
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const emote = resolveEmote(match[1]);
    if (emote) {
      nodes.push(
        <img
          key={`ne-${keyIdx++}`}
          src={emote.image_url}
          alt={`:${emote.name}:`}
          width={16}
          height={16}
          loading="lazy"
          decoding="async"
          className="inline-block w-4 h-4 align-text-bottom object-contain mx-0.5"
        />
      );
    } else {
      nodes.push(match[0]);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export const NotificationPublicationExcerpt: React.FC<Props> = ({
  publication,
  isExplicitlyMissing = false,
  isUnread = false,
}) => {
  const { emoteMap, userEmoteMap, emotes, isLoaded, isLoading, fetchEmotes } = useEmoteStore();
  const rawContent = publication?.content?.trim() || '';
  const hasEmoteSyntax = useMemo(() => Boolean(rawContent && EMOTE_SYNTAX_RE.test(rawContent)), [rawContent]);

  useEffect(() => {
    if (hasEmoteSyntax && !isLoaded && !isLoading) void fetchEmotes();
  }, [hasEmoteSyntax, isLoaded, isLoading, fetchEmotes]);

  if (!publication) {
    if (!isExplicitlyMissing) return null;
    return <p className="mt-1.5 text-xs italic text-dark-muted font-sans">Publicación no disponible.</p>;
  }

  const containerClass = `mt-1.5 pl-2.5 border-l-2 ${
    isUnread ? 'border-brand-500/50 text-dark-text/85' : 'border-dark-border text-dark-muted'
  }`;

  if (rawContent) {
    const clamped = clampExcerptText(rawContent);
    const authorId = publication.author?.id;
    const resolveEmote = (name: string): CustomEmote | undefined => {
      const lower = name.toLowerCase();
      return authorId
        ? (userEmoteMap?.[authorId]?.[lower] ??
            emotes.find((e) => e.creator_id === authorId && e.name.toLowerCase() === lower))
        : emoteMap[lower];
    };

    return (
      <div className={containerClass}>
        <p className="text-[0.8125rem] sm:text-sm font-sans leading-[1.45] line-clamp-3 whitespace-pre-line break-words">
          {renderTextWithEmotes(clamped, resolveEmote)}
        </p>
      </div>
    );
  }

  const imageUrls = (publication.images || [])
    .map((img) => resolveMediaUrl(img?.url))
    .filter((url): url is string => Boolean(url && UrlHelper.isSafeHttpUrl(url)))
    .slice(0, 4);

  if (imageUrls.length > 0) {
    return (
      <div className={containerClass}>
        <div className="flex flex-col gap-0.5 text-xs font-mono leading-[1.45] min-w-0">
          {imageUrls.map((url, idx) => (
            <div key={`${url}-${idx}`} className="flex items-start gap-1.5 min-w-0">
              <ImageIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-80" aria-hidden="true" />
              <span className={imageUrls.length === 1 ? 'break-all line-clamp-2' : 'truncate'}>{url}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const embedUrl = (publication.embeds || []).find((emb) => emb?.url && UrlHelper.isSafeHttpUrl(emb.url))?.url;
  if (embedUrl) {
    return (
      <div className={containerClass}>
        <p className="text-xs font-mono leading-[1.45] break-all line-clamp-2">{embedUrl}</p>
      </div>
    );
  }

  const quoted = publication.target_publication;
  if (quoted) {
    const quotedText = quoted.content?.trim();
    const quotedImg = resolveMediaUrl(quoted.images?.[0]?.url);
    const quoteSnippet = quotedText
      ? clampExcerptText(quotedText)
      : quotedImg && UrlHelper.isSafeHttpUrl(quotedImg)
        ? quotedImg
        : '';
    if (quoteSnippet) {
      return (
        <div className={containerClass}>
          <p className="text-[0.8125rem] sm:text-sm font-sans leading-[1.45] line-clamp-2 whitespace-pre-line break-words">
            Cita: {quoteSnippet}
          </p>
        </div>
      );
    }
  }

  return null;
};
