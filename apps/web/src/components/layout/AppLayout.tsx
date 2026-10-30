import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.js';
import { Aside } from './Aside.js';
import { MobileHeader } from './MobileHeader.js';
import { MobileBottomNav } from './MobileBottomNav.js';
import { MobileFloatingButton } from './MobileFloatingButton.js';
import { CreatePostModal } from '../publication/CreatePostModal.js';
import { PixelDialogModal } from '../common/PixelDialogModal.js';
import { useUIStore } from '../../stores/uiStore.js';

export const AppLayout: React.FC = () => {
  const { isPostModalOpen, closePostModal } = useUIStore();

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text flex flex-col md:flex-row justify-center max-w-7xl mx-auto font-mono">
      <MobileHeader />

      <Navbar />

      <main className="flex-1 min-w-0 max-w-2xl min-h-screen border-x-0 md:border-r border-dark-border pb-16 md:pb-0">
        <Outlet />
      </main>

      <Aside />

      <MobileBottomNav />
      <MobileFloatingButton />
      <CreatePostModal isOpen={isPostModalOpen} onClose={closePostModal} />
      <PixelDialogModal />
    </div>
  );
};
