const CACHE_NAME = 'SisKeu-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/css/tour.css',
  '/assets/js/app.js',
  '/assets/js/auth.js',
  '/assets/js/accounts.js',
  '/assets/js/advanced-listeners.js',
  '/assets/js/budgets.js',
  '/assets/js/charts.js',
  '/assets/js/charts-enhanced.js',
  '/assets/js/recurring.js',
  '/assets/js/tour.js',
  '/assets/js/config.js',
  '/assets/image/icon/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        }).catch(() => cached)
      )
    );
  } else {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});

