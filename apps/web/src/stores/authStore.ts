import { create } from 'zustand';
import { PublicUser } from '@oomfy/shared';
import { PushNotificationService } from '../services/PushNotificationService.js';
import { ApiClient } from '../services/api.js';
import { SocketClient } from '../services/socket.js';
import { setAccessToken } from '../services/sessionTokenMemory.js';
import { RouteScrollStore } from './routeScrollStore.js';
import { useEntityRegistryStore } from './entityRegistryStore.js';

interface AuthState {
  user: PublicUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: PublicUser, token: string) => void;
  setToken: (token: string) => void;
  setUser: (user: PublicUser) => void;
  logout: (notifyServer?: any) => void;
  setLoading: (loading: boolean) => void;
}

if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('oomfy_token');
  localStorage.removeItem('oomfy_refresh_token');
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) => {
    setAccessToken(token);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  setToken: (token) => {
    setAccessToken(token);
    set({ token, isAuthenticated: true });
  },

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

  logout: (notifyServer = true) => {
    PushNotificationService.unsubscribe().catch(() => {});
    if (notifyServer !== false) {
      ApiClient.post('/auth/logout', {}).catch(() => {});
    }
    SocketClient.disconnect();
    setAccessToken(null);
    RouteScrollStore.clear();
    useEntityRegistryStore.getState().clearRegistry();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
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
      useAuthStore.getState().setToken(detail.accessToken);
    }
  });
}
