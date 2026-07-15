const CACHE_VERSION = 'agrovision-pwa-v6';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// No precachear favicons/iconos: el SW los dejaba congelados (logo Laravel viejo).
const PRECACHE_URLS = ['/manifest.webmanifest?v=6'];

function isBrandAsset(pathname) {
  return (
    pathname.startsWith('/icons/') ||
    pathname === '/icon.png' ||
    pathname.startsWith('/favicon') ||
    pathname === '/apple-touch-icon.png' ||
    pathname.endsWith('.webmanifest')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'Agrovision',
      body: event.data ? event.data.text() : '',
    };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Agrovision', {
      body: payload.body || '',
      icon: '/icons/icon-192x192.png?v=6',
      badge: '/icons/icon-192x192.png?v=6',
      tag: payload.tag || 'agrovision',
      data: {
        url: payload.url || '/',
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    return;
  }

  if (
    request.headers.get('X-Inertia') ||
    request.headers.get('X-Livewire') ||
    request.headers.get('Purpose') === 'prefetch' ||
    request.destination === 'document'
  ) {
    return;
  }

  // Favicon / PWA icons / manifest: siempre red (evita icono viejo en caché).
  if (isBrandAsset(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: 'reload' }).catch(() => fetch(request)),
    );
    return;
  }

  const isStaticAsset =
    url.pathname.startsWith('/build/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff');

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }

        return response;
      });
    }),
  );
});
