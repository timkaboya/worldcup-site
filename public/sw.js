// World Cup 2026 — service worker.
// Strategy:
//   • Precache the app shell + static data on install.
//   • Navigations: network-first (fresh app), cache fallback.
//   • /api/* AND static data JSON (fixtures/standings/scorers/news):
//     network-first so the latest scores/tables/bracket always win, with a
//     cached last-known snapshot as offline fallback.
//   • Other static assets (JS/CSS/icons): cache-first, revalidate in background.
const VERSION = 'wc2026-v5';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE = [
  '/',
  '/tables/',
  '/scorers/',
  '/bracket/',
  '/news/',
  '/fixtures.json',
  '/standings.json',
  '/scorers.json',
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

// Fresh-data endpoints: live API + build-time data snapshots.
function isData(pathname) {
  return (
    pathname.startsWith('/api/') ||
    pathname === '/fixtures.json' ||
    pathname === '/standings.json' ||
    pathname === '/scorers.json' ||
    pathname === '/news.json'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isData(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, 3500).then((res) => res || caches.match('/')));
    return;
  }

  event.respondWith(cacheFirst(request));
});
