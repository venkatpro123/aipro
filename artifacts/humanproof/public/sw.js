// Service Worker for HumanProof PWA
// v40.0: cache-version bumped to invalidate any HTML responses that may have been
// cached by the previous SW (CVE-style cross-user data leak — see FIX-2 below).
const CACHE_VERSION = 'hp-v2-2026-05-17';
const STATIC_ASSETS = /^\/assets\//;
const API_ROUTES = /^\/api\//;
const CROSS_ORIGIN = /^https?:\/\/(?!localhost|127.0.0.1)/;

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_VERSION).map(n => caches.delete(n)))
    )
  );
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API or cross-origin
  if (API_ROUTES.test(url.pathname) || CROSS_ORIGIN.test(event.request.url)) {
    return event.respondWith(fetch(event.request));
  }

  // Cache-first for static assets
  if (STATIC_ASSETS.test(url.pathname)) {
    return event.respondWith(
      caches.match(event.request).then(r => r || fetch(event.request).then(res => {
        const cache = caches.open(CACHE_VERSION);
        cache.then(c => c.put(event.request, res.clone()));
        return res;
      }))
    );
  }

  // v40.0 FIX-2: NEVER cache HTML navigations. Previously the fallback
  // `caches.match(event.request)` could serve a stale cached HTML response
  // that was generated for a different authenticated user — e.g., User A logs
  // in, opens audit page, gets cached → User A logs out → User B logs in on
  // the same device → gets User A's cached HTML shell.
  // The HTML is intentionally a thin shell that React hydrates with current
  // user context, but cached responses can include user-specific inline data
  // (e.g., bootstrap config). Always network-fetch the HTML; if offline, fail
  // gracefully (the rest of the app remains usable via cached assets).
  if (event.request.mode === 'navigate') {
    return event.respondWith(fetch(event.request));
  }

  return event.respondWith(
    caches.match(event.request).then(r => {
      if (r) return r;
      return fetch(event.request).then(res => {
        const cache = caches.open(CACHE_VERSION);
        cache.then(c => c.put(event.request, res.clone()));
        return res;
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notification handler
self.addEventListener('push', event => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'HumanProof Alert';
    const options = {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'hp-push',
      renotify: true,
      data: { url: data.url || '/' },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch {}
});

// Notification click — open or focus the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
