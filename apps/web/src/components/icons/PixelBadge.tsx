import React from 'react';

interface Props {
  role?: string;
}

export const PixelBadge: React.FC<Props> = ({ role }) => {
  const normRole = (role || 'member').toLowerCase();
  const isAdmin = normRole === 'admin';
  const isMod = normRole === 'mod';
  const label = isAdmin ? 'ADMIN' : isMod ? 'MOD' : 'MEMBER';

  const colorClass = isAdmin
    ? 'bg-brand-950/60 text-brand-400 border-brand-500'
    : isMod
    ? 'bg-purple-950/60 text-purple-400 border-purple-600'
    : 'bg-dark-card text-dark-muted border-dark-border';

  return (
    <span
      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border select-none font-bold tracking-wider ${colorClass}`}
      style={{ imageRendering: 'pixelated' }}
    >
      [{label}]
    </span>
  );
};

