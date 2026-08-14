import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This SDK is only ever used from the browser (all data fetching happens client-side).
// Guarding init against `window` keeps `next build`'s static prerendering pass — which
// evaluates this module in Node without real env vars — from crashing on an invalid API key.
function createFirebaseServices() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  // NODE_ENV is checked as well as the flag, and deliberately first: `next build` also
  // loads .env.local, so a developer's emulator flag would otherwise be compiled straight
  // into the production bundle and point the deployed app at localhost — which fails in a
  // way that looks like an auth problem (everyone suddenly "not approved") rather than a
  // misconfiguration. The flag alone is not safe to trust at build time.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
  ) {
    // Guarded because Next.js Fast Refresh can re-run this module while the singleton
    // Firebase app instance survives, and connecting an emulator twice throws.
    // Must match the hostname the app itself is served on ("localhost"), not "127.0.0.1" —
    // browsers treat those as different sites, which defeats the whole point of emulating
    // locally (same cross-site storage blocking as talking to real Firebase).
    const g = globalThis as { __fattyEmulatorsConnected?: boolean };
    if (!g.__fattyEmulatorsConnected) {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "localhost", 8080);
      connectStorageEmulator(storage, "localhost", 9199);
      g.__fattyEmulatorsConnected = true;
    }
  }

  return { app, auth, db, storage };
}

const services = typeof window !== "undefined" ? createFirebaseServices() : null;

export const app = services?.app as FirebaseApp;
export const auth = services?.auth as Auth;
export const db = services?.db as Firestore;
export const storage = services?.storage as FirebaseStorage;
export const googleProvider = new GoogleAuthProvider();
