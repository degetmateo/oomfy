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

