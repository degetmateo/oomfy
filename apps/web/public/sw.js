const STATIC_CACHE = 'oomfy-static-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/fonts/')) return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const clone = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(() => {});
      }
      return res;
    }))
  );
});

function getApiBase() {
  return (self.location.hostname !== 'localhost' && self.location.hostname !== '127.0.0.1')
    ? 'https://api.oomfy.online' : '';
}

function toSafeInternalPath(rawUrl, fallback = '/notifications') {
  const s = String(rawUrl || '');
  return (s.startsWith('/') && !s.startsWith('//') && !s.startsWith('\\') && !/^\/\\/.test(s)) ? s : fallback;
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let title = 'oomfy';
    const options = {
      body: 'Tienes una nueva notificación en oomfy.',
      icon: '/assets/oomfy-logo-black-bg.png',
      badge: '/assets/nav/home-on.svg',
      data: { url: '/notifications' },
    };

    if (event.data) {
      try {
        const data = event.data.json();
        if (data.title) title = data.title;
        if (data.body) options.body = data.body;
        if (typeof data.icon === 'string' && data.icon.startsWith('/')) options.icon = data.icon;
        if (data.url) options.data.url = toSafeInternalPath(data.url);
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
  const safePath = toSafeInternalPath(event.notification.data?.url, '/');
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(safePath);
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const apiBase = getApiBase();
      const refreshRes = await fetch(`${apiBase}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (!refreshRes.ok) return;
      const refreshData = await refreshRes.json();
      if (!refreshData?.accessToken) return;

      const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;
      let newSub = event.newSubscription;

      if (!newSub) {
        const keyRes = await fetch(`${apiBase}/notifications/vapid-public-key`);
        const keyData = await keyRes.json();
        if (!keyData?.publicKey) return;

        const padding = '='.repeat((4 - (keyData.publicKey.length % 4)) % 4);
        const base64 = (keyData.publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const appKey = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) appKey[i] = rawData.charCodeAt(i);

        newSub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
      }

      if (newSub) {
        const json = newSub.toJSON();
        await fetch(`${apiBase}/notifications/subscribe`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${refreshData.accessToken}`,
          },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, previous_endpoint: oldEndpoint }),
        });
      }
    } catch (err) {
      console.error('Error en pushsubscriptionchange:', err);
    }
  })());
});
