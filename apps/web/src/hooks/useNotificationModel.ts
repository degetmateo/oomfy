import { useSyncExternalStore } from 'react';
import { notificationIdentityMap } from '../models/NotificationIdentityMap.js';

export function useNotificationModel() {
  const notifications = useSyncExternalStore(
    (cb) => notificationIdentityMap.subscribeList(cb),
    () => notificationIdentityMap.getNotifications()
  );
  const pendingCount = useSyncExternalStore(
    (cb) => notificationIdentityMap.subscribeCount(cb),
    () => notificationIdentityMap.getPendingCount()
  );
  return { notifications, pendingCount };
}
