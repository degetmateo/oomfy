self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Tienes una nueva notificación en oomfy.',
        icon: data.icon || '/assets/nav/home-on.svg',
        badge: '/assets/nav/home-on.svg',
        data: { url: data.url || '/notifications' },
      };
      event.waitUntil(self.registration.showNotification(data.title || 'oomfy', options));
    } catch {
      event.waitUntil(
        self.registration.showNotification('oomfy', {
          body: event.data.text(),
          icon: '/assets/nav/home-on.svg',
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
        const keyRes = await fetch('/api/notifications/vapid-public-key');
        const keyData = await keyRes.json();
        if (!keyData || !keyData.publicKey) return;

        const padding = '='.repeat((4 - (keyData.publicKey.length % 4)) % 4);
        const base64 = (keyData.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const appKey = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) appKey[i] = rawData.charCodeAt(i);

        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appKey,
        });

        const json = newSub.toJSON();
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: json.keys,
            previous_endpoint: oldEndpoint,
          }),
        });
      } catch {}
    })()
  );
});

