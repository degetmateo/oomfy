import React, { useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UrlHelper } from '../../utils/UrlHelper.js';
import { InlineToken, parseMarkdownBlocks } from '../../utils/markdownParser.js';
import { useEmoteStore } from '../../stores/emoteStore.js';

interface Props {
  text: string | null | undefined;
  className?: string;
}

export const FormattedText: React.FC<Props> = ({ text, className = '' }) => {
  const navigate = useNavigate();
  const { emoteMap, isLoaded, isLoading, fetchEmotes } = useEmoteStore();

  const hasEmoteSyntax = useMemo(() => Boolean(text && /:([a-zA-Z0-9_]{2,32}):/.test(text)), [text]);
  useEffect(() => {
    if (hasEmoteSyntax && !isLoaded && !isLoading) void fetchEmotes();
  }, [hasEmoteSyntax, isLoaded, isLoading, fetchEmotes]);

  if (!text) return null;

  const blocks = parseMarkdownBlocks(text);
  const hasBlockElements = blocks.some((b) => b.type !== 'line');

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault(); e.stopPropagation();
    if (window.getSelection()?.toString()) return;
    navigate(UrlHelper.isInternalUrl(url) ? UrlHelper.getInternalPath(url) : `/external?url=${encodeURIComponent(url)}`);
  };

  const handleTokenNav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.getSelection()?.toString()) e.preventDefault();
  };

  const renderInline = (tokens: InlineToken[], prefix: string): React.ReactNode[] =>
    tokens.map((tok, i) => {
      const key = `${prefix}-${i}`;
      switch (tok.type) {
        case 'text': return <React.Fragment key={key}>{tok.text}</React.Fragment>;
        case 'code': return <code key={key} className="px-1 py-0.5 bg-dark-card border border-dark-border rounded font-mono text-[0.9em] text-brand-300">{tok.content}</code>;
        case 'bold_italic': return <strong key={key} className="font-bold italic text-white">{renderInline(tok.children, key)}</strong>;
        case 'bold': return <strong key={key} className="font-bold text-white">{renderInline(tok.children, key)}</strong>;
        case 'italic': return <em key={key} className="italic">{renderInline(tok.children, key)}</em>;
        case 'underline': return <u key={key} className="underline underline-offset-2">{renderInline(tok.children, key)}</u>;
        case 'strike': return <del key={key} className="line-through opacity-75">{renderInline(tok.children, key)}</del>;
        case 'url': {
          const isInternal = UrlHelper.isInternalUrl(tok.url);
          return <a key={key} href={tok.url} target={isInternal ? undefined : '_blank'} rel={isInternal ? undefined : 'ugc nofollow noopener noreferrer'} onClick={(e) => handleLinkClick(e, tok.url)} title={`Ir a ${tok.url}`} className="text-brand-400 font-bold hover:underline cursor-pointer break-all">{tok.url}</a>;
        }
        case 'mention':
          return <Link key={key} to={`/${tok.username.slice(1)}`} onClick={handleTokenNav} title={`Ver perfil de ${tok.username}`} className="text-brand-400 font-bold hover:underline cursor-pointer">{tok.username}</Link>;
        case 'hashtag':
          return <Link key={key} to={`/t/${encodeURIComponent(tok.tag.slice(1).toLowerCase())}`} onClick={handleTokenNav} title={`Explorar ${tok.tag}`} className="text-brand-400 hover:underline cursor-pointer">{tok.tag}</Link>;
        case 'emote': {
          const emote = emoteMap[tok.name.toLowerCase()];
          if (!emote) return <React.Fragment key={key}>:{tok.name}:</React.Fragment>;
          return <img key={key} src={emote.image_url} alt={`:${emote.name}:`} title={`:${emote.name}:`} className="inline-block w-5 h-5 align-text-bottom object-contain mx-0.5" />;
        }
      }
    });

  if (!hasBlockElements) {
    return (
      <span className={className}>
        {blocks.map((block, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && '\n'}
            {renderInline(block.children, `l${idx}`)}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return (
    <div className={className}>
      {blocks.map((block, idx) => {
        const children = renderInline(block.children, `b${idx}`);
        if (block.type === 'heading') {
          if (block.level === 1) return <h1 key={idx} className="text-lg font-bold text-white leading-snug my-0.5">{children}</h1>;
          if (block.level === 2) return <h2 key={idx} className="text-base font-bold text-white leading-snug my-0.5">{children}</h2>;
          return <h3 key={idx} className="text-sm font-bold text-brand-300 leading-snug my-0.5">{children}</h3>;
        }
        if (block.type === 'blockquote') {
          return <blockquote key={idx} className="border-l-2 border-brand-500/70 pl-2.5 italic text-dark-muted my-0.5">{children}</blockquote>;
        }
        return <div key={idx} className="min-h-[1.2em]">{children}</div>;
      })}
    </div>
  );
};
