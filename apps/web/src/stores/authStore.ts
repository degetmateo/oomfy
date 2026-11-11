import { create } from 'zustand';
import { PublicUser } from '@oomfy/shared';
import { PushNotificationService } from '../services/PushNotificationService.js';
import { ApiClient } from '../services/api.js';
import { RouteScrollStore } from './routeScrollStore.js';
import { useEntityRegistryStore } from './entityRegistryStore.js';

interface AuthState {
  user: PublicUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: PublicUser, token: string, refreshToken?: string) => void;
  setToken: (token: string, refreshToken?: string) => void;
  setUser: (user: PublicUser) => void;
  logout: (notifyServer?: any) => void;
  setLoading: (loading: boolean) => void;
}

const initialToken = typeof localStorage !== 'undefined' ? localStorage.getItem('oomfy_token') : null;
const initialRefresh = typeof localStorage !== 'undefined' ? localStorage.getItem('oomfy_refresh_token') : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: initialToken,
  refreshToken: initialRefresh,
  isAuthenticated: Boolean(initialToken || initialRefresh),
  isLoading: false,

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('oomfy_token', token);
    if (refreshToken) {
      localStorage.setItem('oomfy_refresh_token', refreshToken);
    }
    set({
      user,
      token,
      refreshToken: refreshToken || localStorage.getItem('oomfy_refresh_token'),
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setToken: (token, refreshToken) => {
    localStorage.setItem('oomfy_token', token);
    if (refreshToken) {
      localStorage.setItem('oomfy_refresh_token', refreshToken);
    }
    set((state) => ({
      token,
      refreshToken: refreshToken || state.refreshToken,
      isAuthenticated: true,
    }));
  },

  setUser: (user) => set({ user, isAuthenticated: true }),

  logout: (notifyServer = true) => {
    const rt = localStorage.getItem('oomfy_refresh_token');
    PushNotificationService.unsubscribe().catch(() => {});
    if (notifyServer !== false) {
      ApiClient.post('/auth/logout', { refreshToken: rt }).catch(() => {});
    }
    localStorage.removeItem('oomfy_token');
    localStorage.removeItem('oomfy_refresh_token');
    RouteScrollStore.clear();
    useEntityRegistryStore.getState().clearRegistry();
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:unauthorized', () => {
    useAuthStore.getState().logout(false);
  });
  window.addEventListener('auth:token-refreshed', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.accessToken) {
      useAuthStore.getState().setToken(detail.accessToken, detail.refreshToken);
    }
  });
}
