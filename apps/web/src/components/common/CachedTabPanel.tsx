import React, { useLayoutEffect, useRef } from 'react';
import { ViewActivityProvider, useViewActivity } from '../../contexts/ViewActivityContext.js';

interface Props {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

export const CachedTabPanel: React.FC<Props> = ({ active, children, className = '' }) => {
  const hasRenderedRef = useRef(active);
  if (active) hasRenderedRef.current = true;

  const panelRef = useRef<HTMLDivElement | null>(null);
  const parentActivity = useViewActivity();

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (!active) {
      const focused = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      if (focused && el.contains(focused) && typeof focused.blur === 'function') {
        focused.blur();
      }
    }
    (el as any).inert = !active;
  }, [active]);

  if (!hasRenderedRef.current) return null;

  return (
    <div
      ref={panelRef}
      className={`${active ? 'spa-tab-panel-active' : 'spa-tab-panel-inactive'} ${className}`.trim()}
      aria-hidden={!active}
    >
      <ViewActivityProvider
        isActive={parentActivity.isActive && active}
        viewKey={parentActivity.viewKey}
        isPersistent={parentActivity.isPersistent}
      >
        {children}
      </ViewActivityProvider>
    </div>
  );
};
