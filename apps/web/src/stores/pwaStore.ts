import { create } from 'zustand';

interface PwaState {
  deferredPrompt: any | null;
  isInstallable: boolean;
  isInstalled: boolean;
  setDeferredPrompt: (prompt: any) => void;
  promptInstall: () => Promise<boolean>;
  initPwa: () => void;
}

export const usePwaStore = create<PwaState>((set, get) => ({
  deferredPrompt: null,
  isInstallable: false,
  isInstalled: false,

  setDeferredPrompt: (prompt) => {
    set({ deferredPrompt: prompt, isInstallable: Boolean(prompt) });
  },

  promptInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      set({ deferredPrompt: null, isInstallable: false, isInstalled: true });
      return true;
    }
    return false;
  },

  initPwa: () => {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(display-mode: standalone)').matches) {
      set({ isInstalled: true });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      set({ deferredPrompt: e, isInstallable: true });
    });

    window.addEventListener('appinstalled', () => {
      set({ deferredPrompt: null, isInstallable: false, isInstalled: true });
    });

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
    }
  },
}));
