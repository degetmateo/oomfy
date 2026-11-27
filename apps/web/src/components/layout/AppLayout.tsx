import React from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { Aside } from './Aside.js';
import { MobileBottomNav } from './MobileBottomNav.js';
import { MobileSideDrawer } from './MobileSideDrawer.js';
import { MobileFloatingButton } from './MobileFloatingButton.js';
import { GuestBottomBanner } from './GuestBottomBanner.js';
import { PersistentViewHost } from './PersistentViewHost.js';
import { CreatePostModal } from '../publication/CreatePostModal.js';
import { PixelDialogModal } from '../common/PixelDialogModal.js';
import { PublicationToastBanner } from '../common/PublicationToastBanner.js';
import { TermsAcceptanceModal } from '../legal/TermsAcceptanceModal.js';
import { PushReconnectBanner } from '../notifications/PushReconnectBanner.js';
import { useUIStore } from '../../stores/uiStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useVirtualKeyboard } from '../../hooks/useVirtualKeyboard.js';

export const AppLayout: React.FC = () => {
  const { isPostModalOpen, closePostModal } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const isChatsRoute = location.pathname.startsWith('/chats');
  useVirtualKeyboard();

  return (
    <div
      className={`bg-dark-bg text-dark-text flex flex-col md:flex-row justify-center ${
        isChatsRoute
          ? 'max-w-[1440px] w-full h-[100dvh] max-h-[100dvh] overflow-hidden'
          : 'max-w-7xl min-h-screen'
      } mx-auto font-mono`}
    >
      <Navbar />

      <main
        className={`relative flex-1 min-w-0 ${
          isChatsRoute ? 'max-w-none h-full overflow-hidden' : 'max-w-2xl min-h-screen pb-40 md:pb-24'
        } border-x-0 md:border-r border-dark-border`}
      >
        <PushReconnectBanner />
        <PersistentViewHost isChatsRoute={isChatsRoute} />
      </main>

      {!isChatsRoute && <Aside />}

      <MobileBottomNav />
      <MobileSideDrawer />
      {isAuthenticated && <MobileFloatingButton />}
      <GuestBottomBanner />
      <CreatePostModal isOpen={isPostModalOpen} onClose={closePostModal} />
      <TermsAcceptanceModal />
      <PixelDialogModal />
      <PublicationToastBanner />
    </div>
  );
};
