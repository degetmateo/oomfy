import React, { useState, useEffect } from 'react';

interface Props {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

export const CachedTabPanel: React.FC<Props> = ({ active, children, className = '' }) => {
  const [hasRendered, setHasRendered] = useState(active);

  useEffect(() => {
    if (active && !hasRendered) setHasRendered(true);
  }, [active, hasRendered]);

  if (!hasRendered) return null;

  return (
    <div
      className={`${active ? 'spa-tab-panel-active' : 'spa-tab-panel-inactive'} ${className}`.trim()}
      aria-hidden={!active}
      {...(!active ? ({ inert: '' } as any) : {})}
    >
      {children}
    </div>
  );
};
