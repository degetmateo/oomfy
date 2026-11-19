import { create } from 'zustand';

export type ToastVariant = 'success' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toast: ToastItem | null;
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (message, variant = 'success') => set({ toast: { id: nextId++, message, variant } }),
  dismissToast: () => set({ toast: null }),
}));
