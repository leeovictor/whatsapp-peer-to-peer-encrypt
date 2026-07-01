/// <reference lib="webworker" />

const SW = self as unknown as ServiceWorkerGlobalScope;

declare let self: ServiceWorkerGlobalScope;

self.__WB_MANIFEST = [];

SW.addEventListener('install', () => {
  SW.skipWaiting();
});

SW.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

SW.addEventListener('push', (event) => {
  let data: { title: string; body: string } = {
    title: 'New message',
    body: 'You have a new encrypted message',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
      };
    } catch {
      // use defaults
    }
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    tag: 'new-message',
  };

  event.waitUntil(SW.registration.showNotification(data.title, options));
});

SW.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const appUrl = SW.registration.scope;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((client) => 'focus' in client);
        if (existing) {
          return existing.focus();
        }
        return clients.openWindow(appUrl);
      }),
  );
});
