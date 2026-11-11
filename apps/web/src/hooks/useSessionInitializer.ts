import { useEffect, useRef } from 'react';
import { ApiClient } from '../services/api.js';
import { PushNotificationService } from '../services/PushNotificationService.js';
import { useAuthStore } from '../stores/authStore.js';

export function useSessionInitializer(): void {
  const { token, user, setToken, setUser, setLoading, logout } = useAuthStore();
  const bootCheckedRef = useRef(false);

  useEffect(() => {
    let active = true;
    const syncSession = async () => {
      let currentToken = token;
      if (!currentToken && !bootCheckedRef.current) {
        bootCheckedRef.current = true;
        setLoading(true);
        const refreshed = await ApiClient.refreshAccessToken();
        if (!active) return;
        if (refreshed) {
          setToken(refreshed);
          currentToken = refreshed;
        } else {
          setLoading(false);
          return;
        }
      }
      if (currentToken && !useAuthStore.getState().user) {
        try {
          const res = await ApiClient.get<any>('/members/me');
          if (!active) return;
          setUser(res.data);
          if (PushNotificationService.isPermissionGranted()) {
            PushNotificationService.syncSubscription().catch(() => {});
          }
        } catch {
          if (active) logout(false);
        }
      }
      if (active) setLoading(false);
    };
    void syncSession();
    return () => { active = false; };
  }, [token, user, setToken, setUser, setLoading, logout]);
}

