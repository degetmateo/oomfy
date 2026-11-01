import React from 'react';

interface Props {
  className?: string;
  size?: number;
}

export const PixelLogo: React.FC<Props> = ({ className = '', size = 32 }) => {
  return (
    <div className={`inline-flex items-center gap-2 select-none font-mono ${className}`}>
      <img
        src="/assets/oomfy-logo-no-bg.png"
        alt="oomfy logo"
        width={size}
        height={size}
        className="object-contain flex-shrink-0"
        style={{ width: `${size}px`, height: `${size}px` }}
        draggable={false}
      />
      <span className="font-bold tracking-wider text-white text-xl hover:text-brand-400 transition-colors">
        oomfy
      </span>
    </div>
  );
};
