import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout.js';
import { HomeView } from './views/HomeView.js';
import { ExploreView } from './views/ExploreView.js';
import { NotificationsView } from './views/NotificationsView.js';
import { ChatsView } from './views/ChatsView.js';
import { SettingsView } from './views/SettingsView.js';
import { ProfileView } from './views/ProfileView.js';
import { FollowListView } from './views/FollowListView.js';
import { PublicationDetailView } from './views/PublicationDetailView.js';
import { ExternalWarningView } from './views/ExternalWarningView.js';
import { SigninView } from './views/SigninView.js';
import { SignupView } from './views/SignupView.js';
import { VerifyView } from './views/VerifyView.js';
import { ResetPasswordView } from './views/ResetPasswordView.js';
import { useAuthStore } from './stores/authStore.js';
import { ApiClient } from './services/api.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
});

export const App: React.FC = () => {
  const { token, setUser, logout } = useAuthStore();

  useEffect(() => {
    if (token) {
      ApiClient.get<any>('/members/me')
        .then((res) => setUser(res.data))
        .catch(() => logout());
    }
  }, [token, setUser, logout]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeView />} />
            <Route path="/explore" element={<ExploreView />} />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chats"
              element={
                <ProtectedRoute>
                  <ChatsView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsView />
                </ProtectedRoute>
              }
            />
            <Route path="/publication/:id" element={<PublicationDetailView />} />
            <Route path="/external" element={<ExternalWarningView />} />
            <Route path="/:username/followers" element={<FollowListView />} />
            <Route path="/:username/following" element={<FollowListView />} />
            <Route path="/:username" element={<ProfileView />} />
          </Route>
          <Route path="/signin" element={<SigninView />} />
          <Route path="/signup" element={<SignupView />} />
          <Route path="/verify" element={<VerifyView />} />
          <Route path="/reset-password" element={<ResetPasswordView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
