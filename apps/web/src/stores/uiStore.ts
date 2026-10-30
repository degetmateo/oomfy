import { create } from 'zustand';
import { Publication } from '@oomfy/shared';

interface UIState {
  isPostModalOpen: boolean;
  quotedPublication: Publication | null;
  openPostModal: (quoted?: Publication | null) => void;
  closePostModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isPostModalOpen: false,
  quotedPublication: null,
  openPostModal: (quoted = null) => set({ isPostModalOpen: true, quotedPublication: quoted || null }),
  closePostModal: () => set({ isPostModalOpen: false, quotedPublication: null }),
}));
