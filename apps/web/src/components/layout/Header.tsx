import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, showBack, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldShowBack = showBack !== undefined ? showBack : location.pathname !== '/';

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
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
      <div
        onClick={handleScrollTop}
        className="cursor-pointer group flex-1 min-w-0"
        title="Volver arriba"
      >
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-brand-400 transition-colors truncate">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-dark-muted truncate">{subtitle}</p>}
      </div>
      {children && <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">{children}</div>}
    </header>
  );
};
