const STATIC_CACHE = 'oomfy-static-v2';
const IMAGE_CACHE = 'oomfy-images-v1';
const MAX_IMAGE_CACHE_ITEMS = 160;
const ACTIVE_CACHES = new Set([STATIC_CACHE, IMAGE_CACHE]);

async function trimImageCache(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length > MAX_IMAGE_CACHE_ITEMS) {
      await Promise.all(keys.slice(0, keys.length - MAX_IMAGE_CACHE_ITEMS).map((k) => cache.delete(k)));
    }
  } catch {}
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !ACTIVE_CACHES.has(k)).map((k) => caches.delete(k))))
      .catch(() => {})
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/'))) {
    const isCacheableAsset = (res) => {
      const ct = String(res.headers.get('content-type') || '').toLowerCase();
      return res.ok && res.type === 'basic' && !res.redirected && !ct.includes('text/html');
    };
    event.respondWith(
      caches.match(req).catch(() => null).then((cached) => {
        if (cached) {
          const cachedCt = String(cached.headers.get('content-type') || '').toLowerCase();
          if (!cachedCt.includes('text/html')) return cached;
          caches.open(STATIC_CACHE).then((c) => c.delete(req)).catch(() => {});
        }
        return fetch(req).then((res) => {
          if (isCacheableAsset(res)) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        });
      }).catch(() => fetch(req).catch(() => Response.error()))
    );
    return;
  }

  const isMemberMedia = /^\/members\/[^/]+\/(icon|banner)$/.test(url.pathname);
  if (req.destination !== 'image' && !isMemberMedia) return;

  const isCacheableImage = (res) => {
    if (res.type === 'opaque') return true;
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    return res.ok && (res.type === 'basic' || res.type === 'cors') && ct.startsWith('image/');
  };

  event.respondWith((async () => {
    const cache = await caches.open(IMAGE_CACHE).catch(() => null);
    const cached = cache ? await cache.match(req).catch(() => null) : null;
    const networkFetch = fetch(req).then(async (res) => {
      if (cache && isCacheableImage(res)) {
        await cache.put(req, res.clone()).catch(() => {});
        await trimImageCache(cache);
      }
      return res;
    });
    if (isMemberMedia) return networkFetch.catch(() => cached || Response.error());
    if (cached) {
      event.waitUntil(networkFetch.catch(() => {}));
      return cached;
    }
    return networkFetch.catch(() => Response.error());
  })());
});

function getApiBase() {
  return (self.location.hostname !== 'localhost' && self.location.hostname !== '127.0.0.1')
    ? 'https://api.oomfy.online' : '';
}

function toSafeInternalPath(rawUrl, fallback = '/notifications') {
  const s = String(rawUrl || '');
  return (s.startsWith('/') && !s.startsWith('//') && !s.startsWith('\\') && !/^\/\\/.test(s)) ? s : fallback;
}

function resolveNotificationIcon(rawIcon) {
  if (!rawIcon || typeof rawIcon !== 'string') return '/assets/oomfy-logo-black-bg.png';
  const trimmed = rawIcon.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/assets/')) {
    return trimmed;
  }
  if (trimmed.startsWith('/members/') || trimmed.startsWith('/api/')) {
    const apiBase = getApiBase();
    return apiBase ? `${apiBase}${trimmed}` : '/assets/oomfy-logo-black-bg.png';
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  return '/assets/oomfy-logo-black-bg.png';
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
        if (data.icon) options.icon = resolveNotificationIcon(data.icon);
        if (data.image) options.image = resolveNotificationIcon(data.image);
        if (data.url) options.data.url = toSafeInternalPath(data.url);
        if (data.tag) options.tag = String(data.tag);
        if (typeof data.silent === 'boolean') {
          options.silent = data.silent;
          if (data.silent) options.renotify = false;
        }
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
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if ('navigate' in client) client.navigate(safePath);
          return client.focus();
        }
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
