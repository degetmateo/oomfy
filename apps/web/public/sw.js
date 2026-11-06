self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function getApiBase() {
  return (self.location.hostname !== 'localhost' && self.location.hostname !== '127.0.0.1')
    ? 'https://api-oomfy.onrender.com' : '';
}

// 1. Regla de los 3 strikes en iOS: todo push debe terminar en una notificación visible
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'oomfy';
    let options = {
      body: 'Tienes una nueva notificación en oomfy.',
      icon: '/assets/nav/home-on.svg',
      badge: '/assets/nav/home-on.svg',
      data: { url: '/notifications' },
    };

    if (event.data) {
      try {
        const data = event.data.json();
        if (data.title) title = data.title;
        if (data.body) options.body = data.body;
        if (data.icon) options.icon = data.icon;
        if (data.url) options.data.url = data.url;
      } catch {
        try {
          const text = event.data.text();
          if (text) options.body = text;
        } catch {}
      }
    }

    try {
      await self.registration.showNotification(title, options);
    } catch (err) {
      console.error('Error al mostrar notificación push:', err);
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});

// 2. Renovación automática pushsubscriptionchange (iOS 16.4+ y navegadores modernos)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
      let newSub = event.newSubscription;

      if (!newSub) {
        const apiBase = getApiBase();
        const keyRes = await fetch(`${apiBase}/notifications/vapid-public-key`);
        const keyData = await keyRes.json();
        if (!keyData || !keyData.publicKey) return;

        const padding = '='.repeat((4 - (keyData.publicKey.length % 4)) % 4);
        const base64 = (keyData.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const appKey = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) appKey[i] = rawData.charCodeAt(i);

        newSub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
      }

      if (newSub) {
        const json = newSub.toJSON();
        const apiBase = getApiBase();
        await fetch(`${apiBase}/notifications/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, previous_endpoint: oldEndpoint }),
        });
      }
    } catch (err) {
      console.error('Error en pushsubscriptionchange:', err);
    }
  })());
});
