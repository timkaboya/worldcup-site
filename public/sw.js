// World Cup 2026 — service worker.
// Strategy:
//   • Precache the app shell + static data on install.
//   • Navigations & static assets: cache-first, revalidate in background.
//   • /api/* : network-first with a short timeout, falling back to cache
//     (last-known snapshot) so scores/news still render offline.
const VERSION = 'wc2026-v1';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE = [
  '/',
  '/tables/',
  '/scorers/',
  '/bracket/',
  '/news/',
  '/fixtures.json',
  '/news.json',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' }))))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

function networkFirst(request, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => fromCache(), timeoutMs);
    let settled = false;
    const done = (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(res);
    };
    const fromCache = () =>
      caches.match(request).then((cached) => cached && done(cached));

    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(request, copy)).catch(() => undefined);
        done(res);
      })
      .catch(() =>
        caches.match(request).then((cached) =>
          done(cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          }))
        )
      );
  });
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    const fetchAndUpdate = fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(request, copy)).catch(() => undefined);
        }
        return res;
      })
      .catch(() => cached);
    return cached || fetchAndUpdate;
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, 3500).then(
        (res) => res || caches.match('/')
      )
    );
    return;
  }

  event.respondWith(cacheFirst(request));
});
