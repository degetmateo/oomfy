import React, { useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CustomEmote } from '@oomfy/shared';
import { UrlHelper } from '../../utils/UrlHelper.js';
import { InlineToken, parseMarkdownBlocks } from '../../utils/markdownParser.js';
import { useEmoteStore } from '../../stores/emoteStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useDialogStore } from '../../stores/dialogStore.js';

interface Props { text: string | null | undefined; className?: string; authorId?: string; }

export const FormattedText: React.FC<Props> = ({ text, className = '', authorId }) => {
  const navigate = useNavigate();
  const viewerId = useAuthStore((s) => s.user?.id);
  const { emoteMap, userEmoteMap, emotes, isLoaded, isLoading, fetchEmotes, importEmote } = useEmoteStore();
  const hasEmoteSyntax = useMemo(() => Boolean(text && /:([a-zA-Z0-9_]{2,32}):/.test(text)), [text]);

  useEffect(() => {
    if (hasEmoteSyntax && !isLoaded && !isLoading) void fetchEmotes();
  }, [hasEmoteSyntax, isLoaded, isLoading, fetchEmotes]);

  if (!text) return null;
  const blocks = parseMarkdownBlocks(text);
  const hasBlockElements = blocks.some((b) => b.type !== 'line');

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.getSelection()?.toString()) navigate(UrlHelper.isInternalUrl(url) ? UrlHelper.getInternalPath(url) : `/external?url=${encodeURIComponent(url)}`);
  };
  const handleTokenNav = (e: React.MouseEvent) => { e.stopPropagation(); if (window.getSelection()?.toString()) e.preventDefault(); };
  const handleImportEmote = async (e: React.MouseEvent, emote: CustomEmote) => {
    e.preventDefault(); e.stopPropagation();
    const dialog = useDialogStore.getState();
    if (!await dialog.confirm({ title: 'Importar emote', message: `¿Importar :${emote.name}: a tu colección personal?`, confirmText: 'Importar' })) return;
    try { await importEmote(emote.id); await dialog.alert(`Emote :${emote.name}: agregado a tu colección.`, 'Personalización'); }
    catch (err) { await dialog.alert((err as Error).message, 'No se pudo importar'); }
  };
  const renderAnchor = (key: string, url: string, label: string) => {
    const isInternal = UrlHelper.isInternalUrl(url);
    return <a key={key} href={url} target={isInternal ? undefined : '_blank'} rel={isInternal ? undefined : 'ugc nofollow noopener noreferrer'} onClick={(e) => handleLinkClick(e, url)} title={`Ir a ${url}`} className="text-brand-400 font-bold hover:underline cursor-pointer break-all">{label}</a>;
  };

  const renderInline = (tokens: InlineToken[], prefix: string): React.ReactNode[] =>
    tokens.map((tok, i) => {
      const key = `${prefix}-${i}`;
      switch (tok.type) {
        case 'text': return <React.Fragment key={key}>{tok.text}</React.Fragment>;
        case 'code': return <code key={key} className="px-1 py-0.5 bg-dark-card border border-dark-border rounded font-mono text-[0.9em] text-brand-300">{tok.content}</code>;
        case 'bold_italic': return <strong key={key} className="font-bold italic text-white">{renderInline(tok.children, key)}</strong>;
        case 'underline_italic': return <u key={key} className="underline italic underline-offset-2">{renderInline(tok.children, key)}</u>;
        case 'bold': return <strong key={key} className="font-bold text-white">{renderInline(tok.children, key)}</strong>;
        case 'italic': return <em key={key} className="italic">{renderInline(tok.children, key)}</em>;
        case 'underline': return <u key={key} className="underline underline-offset-2">{renderInline(tok.children, key)}</u>;
        case 'strike': return <del key={key} className="line-through opacity-75">{renderInline(tok.children, key)}</del>;
        case 'md_link': return renderAnchor(key, tok.url, tok.label);
        case 'url': return renderAnchor(key, tok.url, tok.url);
        case 'mention': return <Link key={key} to={`/${tok.username.slice(1)}`} onClick={handleTokenNav} title={`Ver perfil de ${tok.username}`} className="text-brand-400 font-bold hover:underline cursor-pointer">{tok.username}</Link>;
        case 'hashtag': return <Link key={key} to={`/t/${encodeURIComponent(tok.tag.slice(1).toLowerCase())}`} onClick={handleTokenNav} title={`Explorar ${tok.tag}`} className="text-brand-400 hover:underline cursor-pointer">{tok.tag}</Link>;
        case 'emote': {
          const lower = tok.name.toLowerCase();
          const emote = authorId ? (userEmoteMap?.[authorId]?.[lower] ?? emotes.find((e) => e.creator_id === authorId && e.name.toLowerCase() === lower)) : emoteMap[lower];
          if (!emote) return <React.Fragment key={key}>:{tok.name}:</React.Fragment>;
          const canImport = Boolean(viewerId && viewerId !== emote.creator_id && !userEmoteMap?.[viewerId]?.[lower] && !emotes.some((e) => e.creator_id === viewerId && e.name.toLowerCase() === lower));
          const img = <img src={emote.image_url} alt={`:${emote.name}:`} title={canImport ? `:${emote.name}: (clic para importar a tu colección)` : `:${emote.name}:`} className="inline-block w-5 h-5 align-text-bottom object-contain mx-0.5" />;
          return canImport ? <button key={key} type="button" data-no-card-nav="true" onClick={(e) => void handleImportEmote(e, emote)} className="inline-flex p-0 border-0 bg-transparent cursor-pointer align-text-bottom">{img}</button> : <React.Fragment key={key}>{img}</React.Fragment>;
        }
      }
    });

  if (!hasBlockElements) {
    return <span className={className}>{blocks.map((b, idx) => b.type === 'line' && <React.Fragment key={idx}>{idx > 0 && '\n'}{renderInline(b.children, `l${idx}`)}</React.Fragment>)}</span>;
  }

  return (
    <div className={className}>
      {blocks.map((block, idx) => {
        if (block.type === 'codeblock') return <pre key={idx} className="my-1.5 p-2.5 bg-dark-card border border-dark-border rounded font-mono text-xs text-brand-300 overflow-x-auto whitespace-pre">{block.code}</pre>;
        if (block.type === 'hr') return <hr key={idx} className="my-2 border-dark-border" />;
        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return <ListTag key={idx} className={`${block.ordered ? 'list-decimal' : 'list-disc'} pl-5 my-1 space-y-0.5`}>{block.items.map((item, j) => <li key={j}>{renderInline(item, `b${idx}-${j}`)}</li>)}</ListTag>;
        }
        const children = renderInline(block.children, `b${idx}`);
        if (block.type === 'heading') {
          if (block.level === 1) return <h1 key={idx} className="text-xl sm:text-2xl font-bold text-white leading-tight my-1">{children}</h1>;
          if (block.level === 2) return <h2 key={idx} className="text-lg sm:text-xl font-bold text-white leading-snug my-1">{children}</h2>;
          return <h3 key={idx} className="text-base sm:text-lg font-bold text-brand-300 leading-snug my-0.5">{children}</h3>;
        }
        if (block.type === 'blockquote') return <blockquote key={idx} className="border-l-2 border-brand-500/70 pl-2.5 italic text-dark-muted my-0.5">{children}</blockquote>;
        return <div key={idx} className="min-h-[1.2em]">{children}</div>;
      })}
    </div>
  );
};
