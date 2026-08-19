// =========================================================================
// SERVICE WORKER - SI-ACEP (PWA CACHE MANAGEMENT)
// =========================================================================

const CACHE_NAME = 'si-acep-cache-v62';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './logo.png',
  './polpp.png',
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
  const reqUrl = new URL(e.request.url);

  // Filter request yang BUKAN http/https
  if (reqUrl.protocol !== 'http:' && reqUrl.protocol !== 'https:') {
    return;
  }

  // Abaikan request ke API Google Apps Script & CDN eksternal agar selalu fresh
  if (
    reqUrl.hostname.includes('script.google.com') ||
    reqUrl.hostname.includes('api.iconify.design') ||
    reqUrl.hostname.includes('cdnjs.cloudflare.com') ||
    reqUrl.hostname.includes('unpkg.com')
  ) {
    return;
  }

  // Strategi: Network first, fallback to cache
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          networkResponse.type === 'basic' &&
          e.request.method === 'GET'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        if (e.request.method === 'GET') {
          return caches.match(e.request);
        }
      })
  );
});
