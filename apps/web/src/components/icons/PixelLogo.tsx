import React from 'react';

interface Props {
  className?: string;
  size?: number;
}

export const PixelLogo: React.FC<Props> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center select-none font-mono ${className}`}>
      <span className="font-bold tracking-wider text-white text-xl hover:text-brand-400 transition-colors">
        oomfy
      </span>
    </div>
  );
};
