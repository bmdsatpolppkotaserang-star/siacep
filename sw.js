// =========================================================================
// SERVICE WORKER - SI-ACEP (PWA CACHE MANAGEMENT)
// =========================================================================

const CACHE_NAME = 'si-acep-cache-v20'; // <--- Naikkan versi jika ada update file frontend
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 1. Instalasikan Service Worker & Simpan File Utama ke Cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW SI-ACEP] Caching app shell & static assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Bersihkan Cache Lama jika Ada Pembaruan Versi
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

// 3. Jalankan Pengambilan Data (Network First, Fallback to Cache)
self.addEventListener('fetch', (e) => {
  // Abaikan request ke API Google Apps Script & CDN eksternal agar selalu fresh
  if (
    e.request.url.includes('script.google.com') ||
    e.request.url.includes('api.iconify.design') ||
    e.request.url.includes('cdnjs.cloudflare.com')
  ) {
    return;
  }

  // Strategi: Coba Network dulu, jika offline gunakan Cache
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        // Simpan pembaruan aset ke cache secara dinamis jika berhasil
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline atau koneksi gagal, ambil dari cache
        return caches.match(e.request);
      })
  );
});
