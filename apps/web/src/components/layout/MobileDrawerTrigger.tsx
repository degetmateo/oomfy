import React from 'react';
import { PixelAvatar } from '../common/PixelAvatar.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useUIStore } from '../../stores/uiStore.js';

export const MobileDrawerTrigger: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { isMobileDrawerOpen, openMobileDrawer } = useUIStore();

  if (!isAuthenticated || !user) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.currentTarget.blur();
        openMobileDrawer();
      }}
      aria-label="Abrir menú de navegación"
      aria-expanded={isMobileDrawerOpen}
      aria-controls="mobile-nav-drawer"
      data-testid="mobile-drawer-trigger"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      className="md:hidden shrink-0 p-0.5 border border-dark-border [@media(hover:hover)]:hover:border-brand-400 outline-none focus:outline-none focus-visible:outline-none select-none transition-colors cursor-pointer touch-manipulation"
    >
      <PixelAvatar
        src={user.icon_url}
        username={user.username}
        sizeClass="w-8 h-8"
        priority
      />
    </button>
  );
};
