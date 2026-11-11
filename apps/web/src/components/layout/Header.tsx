import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onRefresh?: () => Promise<any> | void;
  isRefreshing?: boolean;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack,
  onRefresh,
  isRefreshing: externalIsRefreshing,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const shouldShowBack = showBack !== undefined ? showBack : location.pathname !== '/';
  const isRefreshing = externalIsRefreshing ?? internalRefreshing;

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefreshClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRefresh || isRefreshing) return;
    setInternalRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setInternalRefreshing(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-dark-bg/85 border-b border-dark-border px-4 sm:px-6 py-3.5 flex items-center gap-3 select-none">
      {shouldShowBack && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(-1);
          }}
          className="p-1.5 -ml-1 text-dark-muted hover:text-brand-400 hover:bg-dark-border/40 transition-colors rounded select-none flex-shrink-0"
          title="Volver"
          aria-label="Volver atrás"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <div onClick={handleScrollTop} className="cursor-pointer group flex-1 min-w-0" title="Volver arriba">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-brand-400 transition-colors truncate">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-dark-muted truncate">{subtitle}</p>}
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          title="Actualizar contenido"
          aria-label="Actualizar contenido"
          className="flex p-1.5 border border-dark-border hover:border-brand-500 text-dark-muted hover:text-brand-400 pixel-button transition-colors items-center gap-1.5 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
          <span className="hidden sm:inline text-[11px] font-mono">Actualizar</span>
        </button>
      )}

      {children && <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">{children}</div>}
    </header>
  );
};
