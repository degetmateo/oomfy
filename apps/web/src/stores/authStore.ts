import { create } from 'zustand';
import { PublicUser } from '@oomfy/shared';

interface AuthState {
  user: PublicUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: PublicUser, token: string) => void;
  setUser: (user: PublicUser) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('oomfy_token'),
  isAuthenticated: Boolean(localStorage.getItem('oomfy_token')),
  isLoading: false,

  setAuth: (user, token) => {
    localStorage.setItem('oomfy_token', token);
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('oomfy_token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));

