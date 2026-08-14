// Deliberately minimal: only exists so the browser considers the app installable, plus a
// small offline fallback for the app shell. Firebase requests (Auth/Firestore/Storage) are
// a different origin and are never intercepted, so note data always comes straight from the
// network — this never risks serving stale notes.
const CACHE_NAME = "fatty-apuntes-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Next's build output is content-hashed — the same filename is always the same bytes, so
  // it's safe (and fast) to cache aggressively.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Pages and other same-origin assets: prefer the network so content stays fresh, falling
  // back to the last cached copy only when actually offline.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});

// --- Notificaciones -------------------------------------------------------------------
// The announceNote function sends data-only messages, so the notification is built here
// rather than by the browser. That is what keeps the click-through link under our control.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const data = payload.data ?? payload;
  if (!data.body) return;

  event.waitUntil(
    self.registration.showNotification(data.title || "Fatty Apuntes", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { link: data.link || "/dashboard" },
      // Same link collapses into one notification instead of stacking duplicates.
      tag: data.link || "fatty-apuntes",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/dashboard";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an already-open tab when there is one; opening a second copy of the app is
      // disorienting on mobile, where it is usually the only tab.
      for (const client of clients) {
        if (client.url === link) return client.focus();
      }
      const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        return existing.navigate(link).catch(() => {});
      }
      return self.clients.openWindow(link);
    })(),
  );
});
