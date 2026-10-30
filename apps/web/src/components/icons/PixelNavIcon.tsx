import React from 'react';

export type NavIconType = 'home' | 'explore' | 'notifications' | 'messages' | 'member' | 'settings';

interface Props {
  name: NavIconType;
  active?: boolean;
  className?: string;
  size?: number;
}

export const PixelNavIcon: React.FC<Props> = ({ name, active = false, className = '', size = 22 }) => {
  const state = active ? 'on' : 'off';
  const ext = name === 'explore' ? 'png' : 'svg';
  const src = `/assets/nav/${name}-${state}.${ext}`;

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`inline-block pixel-button select-none ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

