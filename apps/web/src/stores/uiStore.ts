import { create } from 'zustand';
import { Publication } from '@oomfy/shared';

interface UIState {
  isPostModalOpen: boolean;
  quotedPublication: Publication | null;
  isMobileDrawerOpen: boolean;
  openPostModal: (quoted?: Publication | null) => void;
  closePostModal: () => void;
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  toggleMobileDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isPostModalOpen: false,
  quotedPublication: null,
  isMobileDrawerOpen: false,
  openPostModal: (quoted = null) => set({ isPostModalOpen: true, quotedPublication: quoted || null }),
  closePostModal: () => set({ isPostModalOpen: false, quotedPublication: null }),
  openMobileDrawer: () => set({ isMobileDrawerOpen: true }),
  closeMobileDrawer: () => set({ isMobileDrawerOpen: false }),
  toggleMobileDrawer: () => set((state) => ({ isMobileDrawerOpen: !state.isMobileDrawerOpen })),
}));
