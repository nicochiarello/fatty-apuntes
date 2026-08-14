"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // The worker caches /_next/static/ cache-first, which is only safe because production
    // filenames are content-hashed. Dev chunks keep the same names as their contents
    // change, so a registered worker pins whatever JS it saw first and every later edit
    // silently does nothing. Never register it outside production — and tear down any
    // worker and cache a previous production build (or an earlier version of this file)
    // left behind, otherwise developers keep serving stale code from an old registration.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .catch(() => {});
      caches
        ?.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
