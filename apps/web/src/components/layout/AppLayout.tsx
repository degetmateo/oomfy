import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { Aside } from './Aside.js';
import { MobileBottomNav } from './MobileBottomNav.js';
import { MobileFloatingButton } from './MobileFloatingButton.js';
import { CreatePostModal } from '../publication/CreatePostModal.js';
import { PixelDialogModal } from '../common/PixelDialogModal.js';
import { useUIStore } from '../../stores/uiStore.js';

export const AppLayout: React.FC = () => {
  const { isPostModalOpen, closePostModal } = useUIStore();
  const location = useLocation();
  const isChatsRoute = location.pathname.startsWith('/chats');

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
        className={`flex-1 min-w-0 ${
          isChatsRoute ? 'max-w-none h-full overflow-hidden' : 'max-w-2xl min-h-screen pb-16 md:pb-0'
        } border-x-0 md:border-r border-dark-border`}
      >
        <Outlet />
      </main>

      {!isChatsRoute && <Aside />}

      <MobileBottomNav />
      <MobileFloatingButton />
      <CreatePostModal isOpen={isPostModalOpen} onClose={closePostModal} />
      <PixelDialogModal />
    </div>
  );
};
