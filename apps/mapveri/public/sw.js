// MapVeri Progressive Web App - Service Worker
const CACHE_NAME_STATIC = 'mapveri-static-v2';
const CACHE_NAME_TILES = 'mapveri-tiles-v1';
const CACHE_NAME_API = 'mapveri-api-v1';
const MAX_TILE_CACHE = 400; // Limit cached map tiles

const PRECACHE_ASSETS = [
  '/',
  '/login',
  '/register',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-192x192.png',
  '/maskable-icon-512x512.png',
];

// Helper: Trim cache to max items
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      await cache.delete(keys[0]);
      trimCache(cacheName, maxItems);
    }
  } catch (err) {
    console.warn('[SW] trimCache error:', err);
  }
}

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME_STATIC)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (
              name !== CACHE_NAME_STATIC &&
              name !== CACHE_NAME_TILES &&
              name !== CACHE_NAME_API
            ) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore chrome-extension or non-HTTP(S) schemes
  if (!url.protocol.startsWith('http')) return;

  // 1. Navigation Requests (HTML / App Shell / Instant Login Page Loading)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Return instantly from cache if available (0ms loading for login page)
        const cached = await caches.match(request);
        const fallbackShell = cached || (await caches.match('/index.html'));

        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME_STATIC).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => null);

        // If cached page or app shell exists, return immediately for instant render
        if (fallbackShell) {
          // Update in background
          networkFetch;
          return fallbackShell;
        }

        const freshResponse = await networkFetch;
        if (freshResponse) return freshResponse;

        return new Response('Offline - MapVeri is ready once connected.', {
          headers: { 'Content-Type': 'text/plain' },
        });
      })()
    );
    return;
  }

  // 2. Map Tiles (OpenStreetMap, Humanitarian, Esri Satellite)
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('tile.openstreetmap.fr') ||
    url.hostname.includes('arcgisonline.com')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME_TILES).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Stale-while-revalidate in background
          fetch(request)
            .then((fresh) => {
              if (fresh && fresh.status === 200) {
                cache.put(request, fresh.clone());
                trimCache(CACHE_NAME_TILES, MAX_TILE_CACHE);
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            trimCache(CACHE_NAME_TILES, MAX_TILE_CACHE);
          }
          return networkResponse;
        } catch {
          // Return transparent 1x1 tile if offline and not cached
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 3. API Requests (e.g. /api/pins, /api/auth/me)
  if (url.pathname.startsWith('/api/')) {
    // Only cache GET requests (never cache mutations like POST/PUT/DELETE)
    if (request.method !== 'GET') return;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME_API).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(JSON.stringify({ error: 'Offline', offline: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          });
        })
    );
    return;
  }

  // 4. Static Assets (Scripts, Styles, Fonts, Images)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached and refresh in background
        fetch(request)
          .then((fresh) => {
            if (fresh && fresh.status === 200) {
              caches.open(CACHE_NAME_STATIC).then((cache) => cache.put(request, fresh));
            }
          })
          .catch(() => {});
        return cached;
      }

      return fetch(request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|webp|woff2|woff|ttf)$/) ||
            url.hostname.includes('fonts.gstatic.com') ||
            url.hostname.includes('fonts.googleapis.com'))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME_STATIC).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      });
    })
  );
});

// Push Notification Support (Optional future expansion)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'MapVeri Update';
    const options = {
      body: data.body || 'A new pin was added near Boisar.',
      icon: '/pwa-192x192.png',
      badge: '/badge-72x72.png',
      data: { url: data.url || '/map' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('[SW] Push error:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/map';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
