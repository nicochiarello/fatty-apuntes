"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { auth, googleProvider, db } from "@/lib/firebase/client";

export type ApprovalStatus = "pending" | "approved" | null;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  approvalStatus: ApprovalStatus;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(null);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error("Google redirect sign-in failed:", err);
      toast.error(`Error al volver de Google (${err.code ?? "sin código"})`);
    });
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) setApprovalStatus(null);
    });
    return unsubscribe;
  }, []);

  // Every signed-in Google account gets a users/{uid} doc — new ones start "pending" and
  // stay locked out (both in the UI and in firestore.rules/storage.rules) until someone
  // flips status to "approved" directly in the Firestore console. Subscribed live so an
  // approval takes effect immediately, no re-login needed.
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    getDoc(userRef).then((snap) => {
      if (!snap.exists()) {
        setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          status: "pending",
          createdAt: Date.now(),
        }).catch(() => {});
      }
    });

    return onSnapshot(userRef, (snap) => {
      const status = snap.data()?.status;
      setApprovalStatus(status === "approved" ? "approved" : "pending");
    });
  }, [user]);

  const signInWithGoogle = async () => {
    await signInWithRedirect(auth, googleProvider);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, approvalStatus, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
