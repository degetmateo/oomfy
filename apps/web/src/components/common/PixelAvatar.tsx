import React, { useState } from 'react';

interface Props {
  src?: string | null;
  username?: string;
  sizeClass?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const PixelAvatar: React.FC<Props> = ({
  src,
  username = 'OM',
  sizeClass = 'w-10 h-10',
  className = '',
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const initials = (username || 'OM').slice(0, 2).toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`${sizeClass} border border-dark-border bg-dark-bg flex items-center justify-center font-bold text-xs text-brand-400 flex-shrink-0 overflow-hidden select-none ${className}`}
    >
      {!hasError && src ? (
        <img
          src={src}
          alt={username}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

