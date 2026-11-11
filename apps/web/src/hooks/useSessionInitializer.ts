import { useEffect, useRef } from 'react';
import { ApiClient } from '../services/api.js';
import { PushNotificationService } from '../services/PushNotificationService.js';
import { getAccessToken } from '../services/sessionTokenMemory.js';
import { useAuthStore } from '../stores/authStore.js';

export function useSessionInitializer(): void {
  const bootPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!bootPromiseRef.current) {
      bootPromiseRef.current = (async () => {
        try {
          const store = useAuthStore.getState();
          let currentToken = store.token || getAccessToken();

          if (!currentToken) {
            store.setLoading(true);
            const refreshed = await ApiClient.refreshAccessToken();
            if (refreshed) {
              useAuthStore.getState().setToken(refreshed);
              currentToken = refreshed;
            } else {
              return;
            }
          }

          if (currentToken && !useAuthStore.getState().user) {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), 15_000) : null;
            try {
              const res = await ApiClient.get<any>('/members/me', controller ? { signal: controller.signal } : undefined);
              useAuthStore.getState().setUser(res.data);
              if (PushNotificationService.isPermissionGranted()) {
                PushNotificationService.syncSubscription().catch(() => {});
              }
            } catch (err) {
              const status = (err as { status?: number })?.status;
              if (status === 401 || status === 403) {
                useAuthStore.getState().logout(false);
              }
            } finally {
              if (timer) clearTimeout(timer);
            }
          }
        } finally {
          useAuthStore.getState().setLoading(false);
        }
      })();
    }
  }, []);
}

