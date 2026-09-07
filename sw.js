const CACHE_NAME = 'teco-prayer-box-v1';

const APP_SHELL = [
  './',
  './index.html',
  './ministry.html',
  './styles.css',
  './app-config.js',
  './shared.js',
  './submit.js',
  './ministry.js',
  './manifest.json',
  './Assets/icon-192.png',
  './Assets/icon-512.png',
  './Assets/elevation-logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Let Supabase/API requests go directly to the network.
  if (
    request.url.includes('supabase.co') ||
    request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseClone);
        });

        return response;
      })
      .catch(() => caches.match(request))
  );
});
