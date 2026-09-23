const CACHE_VERSION = 'agrovision-pwa-v9';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

const PRECACHE_URLS = ['/manifest.webmanifest?v=8'];

function isBrandAsset(pathname) {
  return (
    pathname.startsWith('/icons/') ||
    pathname === '/icon.png' ||
    pathname.startsWith('/favicon') ||
    pathname === '/apple-touch-icon.png' ||
    pathname.endsWith('.webmanifest')
  );
}

function isSkippablePage(pathname) {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/logout') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/two-factor') ||
    pathname.startsWith('/impersonate') ||
    pathname.startsWith('/sanctum') ||
    pathname.startsWith('/livewire') ||
    pathname.startsWith('/build/') ||
    pathname === '/sw.js' ||
    pathname.startsWith('/storage/') ||
    pathname.endsWith('/pdf')
  );
}

function isAppPage(pathname) {
  return pathname.startsWith('/') && !isSkippablePage(pathname) && !isBrandAsset(pathname);
}

function pageCacheKey(request) {
  const url = new URL(request.url);
  const key = new URL(url.origin + url.pathname + url.search);
  key.searchParams.set(
    '__sw',
    request.headers.get('X-Inertia') ? 'inertia' : 'document',
  );

  return new Request(key.toString(), { method: 'GET' });
}

function isInspectionPhoto(pathname) {
  return pathname.startsWith('/storage/checklists/');
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/build/') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.woff')
  );
}

function offlineDocument() {
  return new Response(
    `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;color:#1a2b4c"><h1 style="font-size:1.25rem">Sin conexión</h1><p>Abre la app con internet para cargar las pantallas. Después podrás verlas sin red.</p></body></html>`,
    {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}

async function cachePut(cacheName, request, response) {
  if (!response || !response.ok || response.type !== 'basic') {
    return;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function networkFirstPage(request, cacheName) {
  const key = pageCacheKey(request);

  try {
    const response = await fetch(request);
    await cachePut(cacheName, key, response);

    return response;
  } catch (error) {
    const cached = await caches.match(key);

    if (cached) {
      return cached;
    }

    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  await cachePut(cacheName, request, response);

  return response;
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
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
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
      icon: '/icons/icon-192x192.png?v=8',
      badge: '/icons/icon-192x192.png?v=8',
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

  if (isBrandAsset(url.pathname)) {
    event.respondWith(
      fetch(request, { cache: 'reload' }).catch(() => fetch(request)),
    );
    return;
  }

  const isInertia = Boolean(request.headers.get('X-Inertia'));
  const isDocument =
    request.mode === 'navigate' || request.destination === 'document';

  if ((isDocument || isInertia) && isAppPage(url.pathname)) {
    event.respondWith(
      networkFirstPage(request, PAGES_CACHE).catch(() => offlineDocument()),
    );
    return;
  }

  if (isDocument || isInertia || request.headers.get('X-Livewire') || request.headers.get('Purpose') === 'prefetch') {
    return;
  }

  if (isInspectionPhoto(url.pathname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  if (!isStaticAsset(url.pathname)) {
    return;
  }

  event.respondWith(cacheFirst(request, RUNTIME_CACHE));
});
