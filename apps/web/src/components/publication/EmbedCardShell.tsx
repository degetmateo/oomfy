import React from 'react';
import { ExternalLink, Play } from 'lucide-react';

interface Props {
  href: string;
  onOpen: (e: React.MouseEvent) => void;
  badgeLabel: string;
  badgeClass?: string;
  badgeIcon?: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  description?: string | null;
  thumb?: string | null;
  imgAlt?: string;
  isHiddenSlide?: boolean;
  showPlayIndicator?: boolean;
  onPlayClick?: (e: React.MouseEvent) => void;
  playAriaLabel?: string;
  playBadgeClass?: string;
  footerAction?: React.ReactNode;
}

export const EmbedCardShell: React.FC<Props> = ({
  href, onOpen, badgeLabel, badgeClass = 'text-brand-400 border-brand-500/40 bg-brand-500/10',
  badgeIcon, title, subtitle, description, thumb, imgAlt, isHiddenSlide = false,
  showPlayIndicator = false, onPlayClick, playAriaLabel,
  playBadgeClass = 'bg-black/75 border-dark-border text-white', footerAction,
}) => {
  const hasInteractivePlay = Boolean(onPlayClick);
  const gridCols = thumb ? 'grid-cols-[7.5rem_minmax(0,1fr)] sm:grid-cols-[9.5rem_minmax(0,1fr)]' : 'grid-cols-1';
  const rootClass = `embed-card-shell grid ${gridCols} border border-dark-border bg-dark-card/50 hover:border-brand-500 hover:bg-dark-card/80 transition-colors overflow-hidden min-h-[8.75rem] h-full w-full font-mono text-left group`;

  const mediaContent = thumb ? (
    <div className="embed-card-media relative h-full min-h-[8.75rem] bg-dark-bg overflow-hidden border-r border-dark-border">
      <img
        src={thumb}
        alt={imgAlt || title || badgeLabel}
        referrerPolicy="no-referrer"
        loading="lazy"
        fetchpriority={isHiddenSlide ? 'low' : undefined}
        className="block w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
      />
      {(onPlayClick || showPlayIndicator) && (
        <span className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
          <span className={`p-2 border shadow-pixel flex items-center justify-center ${playBadgeClass}`}>
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
          </span>
        </span>
      )}
    </div>
  ) : null;

  const headerRow = (
    <div className="flex items-center justify-between gap-2">
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-bold uppercase tracking-wide truncate ${badgeClass}`}>
        {badgeIcon}
        <span className="truncate">{badgeLabel}</span>
      </span>
      <ExternalLink className="w-3.5 h-3.5 text-dark-muted group-hover:text-brand-400 flex-shrink-0" aria-hidden="true" />
    </div>
  );

  const textBody = (
    <div className="flex flex-col gap-1 min-w-0">
      <h4 className="text-[0.8125rem] sm:text-sm font-bold text-white line-clamp-2 leading-snug">{title}</h4>
      {subtitle && <div className="text-[11px] text-dark-muted leading-snug flex flex-wrap items-center gap-x-2 gap-y-0.5">{subtitle}</div>}
      {description && <p className="text-xs text-dark-muted line-clamp-2 font-sans leading-[1.45]">{description}</p>}
    </div>
  );

  if (!hasInteractivePlay && !footerAction) {
    return (
      <a href={href} onClick={onOpen} data-no-card-nav="true" className={rootClass}>
        {mediaContent}
        <div className="p-3 flex flex-col justify-between gap-2 min-w-0">
          {headerRow}
          {textBody}
        </div>
      </a>
    );
  }

  return (
    <div data-no-card-nav="true" onClick={(e) => e.stopPropagation()} className={rootClass}>
      {mediaContent && (onPlayClick ? (
        <button type="button" onClick={onPlayClick} aria-label={playAriaLabel || `Reproducir ${title}`} className="h-full w-full block cursor-pointer text-left">
          {mediaContent}
        </button>
      ) : (
        <a href={href} onClick={onOpen} className="h-full w-full block">{mediaContent}</a>
      ))}
      <div className="p-3 flex flex-col justify-between gap-2 min-w-0">
        <a href={href} onClick={onOpen} className="flex flex-col gap-1.5 min-w-0 hover:opacity-95">
          {headerRow}
          {textBody}
        </a>
        {footerAction}
      </div>
    </div>
  );
};
