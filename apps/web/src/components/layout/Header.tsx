import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, children }) => {
  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-dark-bg/85 border-b border-dark-border px-4 sm:px-6 py-3.5 flex items-center justify-between select-none">
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
