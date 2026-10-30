import { create } from 'zustand';
import { PublicUser } from '@oomfy/shared';

interface AuthState {
  user: PublicUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: PublicUser, token: string, refreshToken?: string) => void;
  setToken: (token: string) => void;
  setUser: (user: PublicUser) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('oomfy_token'),
  refreshToken: localStorage.getItem('oomfy_refresh_token'),
  isAuthenticated: Boolean(localStorage.getItem('oomfy_token')),
  isLoading: false,

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('oomfy_token', token);
    if (refreshToken) {
      localStorage.setItem('oomfy_refresh_token', refreshToken);
    }
    set({ user, token, refreshToken: refreshToken || localStorage.getItem('oomfy_refresh_token'), isAuthenticated: true, isLoading: false });
  },

  setToken: (token) => {
    localStorage.setItem('oomfy_token', token);
    set({ token, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('oomfy_token');
    localStorage.removeItem('oomfy_refresh_token');
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

