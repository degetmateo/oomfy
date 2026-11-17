import { useEffect, useRef } from 'react';
import { PublicUser } from '@oomfy/shared';
import { ApiClient } from '../services/api.js';
import { PushNotificationService } from '../services/PushNotificationService.js';
import { getAccessToken } from '../services/sessionTokenMemory.js';
import { useAuthStore } from '../stores/authStore.js';
import { safeLocalGet } from '../utils/safeStorage.js';

function readCachedUser(): PublicUser | null {
  if (!safeLocalGet('oomfy_refresh_token')) return null;
  const raw = safeLocalGet('oomfy_cached_user');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.id && parsed?.username ? parsed : null;
  } catch { return null; }
}

async function fetchAndSyncProfile(): Promise<void> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller?.abort(); reject(Object.assign(new Error('Session init timeout'), { status: 408 })); }, 8_000);
  });
  try {
    const res = await Promise.race([ApiClient.get<any>('/members/me', controller ? { signal: controller.signal } : undefined), timeout]);
    useAuthStore.getState().setUser(res.data);
    if (PushNotificationService.isPermissionGranted()) PushNotificationService.syncSubscription().catch(() => {});
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403) useAuthStore.getState().logout(false);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
            } else { return; }
          }

          if (currentToken && !useAuthStore.getState().user) {
            const cachedUser = readCachedUser();
            if (cachedUser) {
              useAuthStore.getState().setUser(cachedUser);
              fetchAndSyncProfile().catch(() => {});
            } else {
              await fetchAndSyncProfile();
            }
          }
        } finally {
          useAuthStore.getState().setLoading(false);
        }
      })();
    }
  }, []);
}

