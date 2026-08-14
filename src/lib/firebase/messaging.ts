import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { app, db } from "@/lib/firebase/client";

/**
 * Web push subscription, one document per browser keyed by its FCM token.
 *
 * The firebase/messaging SDK is imported lazily throughout: it is a sizeable chunk that
 * only matters once somebody actually turns notifications on, and calling into it at all
 * on an unsupported browser throws.
 */

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Which token this browser registered, so it can be revoked later. Kept in localStorage
// because getToken() would otherwise happily hand back a token we can no longer match to
// its Firestore document.
const TOKEN_STORAGE_KEY = "fatty-apuntes:fcm-token";

export type NotificationState =
  | "unsupported" // browser (or this context) cannot do web push at all
  | "unconfigured" // no VAPID key was compiled in
  | "denied" // the user refused the browser prompt
  | "off"
  | "on";

export async function notificationsSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  const { isSupported } = await import("firebase/messaging");
  return isSupported();
}

export async function getNotificationState(): Promise<NotificationState> {
  if (!(await notificationsSupported())) return "unsupported";
  if (!VAPID_KEY) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  return localStorage.getItem(TOKEN_STORAGE_KEY) ? "on" : "off";
}

/**
 * The push subscription belongs to a service worker registration, and ours is registered
 * from an effect on mount — so someone who opens the account menu immediately can get here
 * first. Waits for it, but never indefinitely: `ready` simply never resolves when nothing
 * is registering at all, which is exactly the case in development.
 */
async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
}

export async function enableNotifications(uid: string): Promise<NotificationState> {
  if (!(await notificationsSupported())) return "unsupported";
  if (!VAPID_KEY) return "unconfigured";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const registration = await serviceWorkerRegistration();
  if (!registration) throw new Error("El service worker todavía no está listo, probá de nuevo");

  const { getMessaging, getToken } = await import("firebase/messaging");
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return "off";

  await setDoc(doc(db, "fcmTokens", token), {
    uid,
    userAgent: navigator.userAgent.slice(0, 300),
    createdAt: serverTimestamp(),
  });
  localStorage.setItem(TOKEN_STORAGE_KEY, token);

  return "on";
}

export async function disableNotifications(): Promise<NotificationState> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);

  if (token) {
    // Drop the document first: if revoking the token itself fails, a stale document would
    // keep this browser receiving notifications it asked to stop.
    await deleteDoc(doc(db, "fcmTokens", token)).catch(() => {});
    try {
      const { deleteToken, getMessaging } = await import("firebase/messaging");
      await deleteToken(getMessaging(app));
    } catch {
      // Already revoked, or the SDK cannot reach FCM; the document is gone either way.
    }
  }

  return "off";
}
