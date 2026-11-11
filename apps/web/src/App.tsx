import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout.js';
import { HomeView } from './views/HomeView.js';
import { ExploreView } from './views/ExploreView.js';
import { TopicHubView } from './views/TopicHubView.js';
import { NotificationsView } from './views/NotificationsView.js';
import { ChatsView } from './views/ChatsView.js';
import { SettingsView } from './views/SettingsView.js';
import { AdminView } from './views/AdminView.js';
import { ModerationView } from './views/ModerationView.js';
import { ProfileView } from './views/ProfileView.js';
import { FollowListView } from './views/FollowListView.js';
import { PublicationDetailView } from './views/PublicationDetailView.js';
import { ExternalWarningView } from './views/ExternalWarningView.js';
import { SigninView } from './views/SigninView.js';
import { SignupView } from './views/SignupView.js';
import { VerifyView } from './views/VerifyView.js';
import { ResetPasswordView } from './views/ResetPasswordView.js';
import { PrivacyPolicyView } from './views/PrivacyPolicyView.js';
import { TermsAndConditionsView } from './views/TermsAndConditionsView.js';
import { ProtectedRoute } from './components/auth/ProtectedRoute.js';
import { useRealtimeSync } from './hooks/useRealtimeSync.js';
import { useSessionInitializer } from './hooks/useSessionInitializer.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 },
  },
});

const RealtimeBridge: React.FC = () => {
  useRealtimeSync();
  return null;
};

export const App: React.FC = () => {
  useSessionInitializer();

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomeView />} />
            <Route path="/explore" element={<ProtectedRoute><ExploreView /></ProtectedRoute>} />
            <Route path="/t/:tag" element={<ProtectedRoute><TopicHubView /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsView /></ProtectedRoute>} />
            <Route path="/chats" element={<ProtectedRoute><ChatsView /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsView /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminView /></ProtectedRoute>} />
            <Route path="/moderation" element={<ProtectedRoute requiredRole={['admin', 'mod']}><ModerationView /></ProtectedRoute>} />
            <Route path="/publication/:id" element={<PublicationDetailView />} />
            <Route path="/external" element={<ExternalWarningView />} />
            <Route path="/privacy" element={<PrivacyPolicyView />} />
            <Route path="/terms" element={<TermsAndConditionsView />} />
            <Route path="/:username/followers" element={<ProtectedRoute><FollowListView /></ProtectedRoute>} />
            <Route path="/:username/following" element={<ProtectedRoute><FollowListView /></ProtectedRoute>} />
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
