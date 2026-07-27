// =========================================================================
// SERVICE WORKER - SI-ACEP (PWA CACHE MANAGEMENT)
// =========================================================================

const CACHE_NAME = 'si-acep-cache-v26'; // <--- Naikkan versi cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './print-label.html', // <--- Wajib ditambah agar fitur cetak stiker tersimpan di cache
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 1. Install & Cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW SI-ACEP] Caching static assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate & Hapus Cache Lama
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW SI-ACEP] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch (Network First, Fallback to Cache)
self.addEventListener('fetch', (e) => {
  if (
    e.request.url.includes('script.google.com') ||
    e.request.url.includes('api.iconify.design') ||
    e.request.url.includes('cdnjs.cloudflare.com')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
