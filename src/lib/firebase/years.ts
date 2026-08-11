import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Year } from "@/types";

const yearsCol = collection(db, "years");

export function subscribeYears(callback: (years: Year[]) => void) {
  const q = query(yearsCol, orderBy("order", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Year));
  });
}

export async function getYear(yearId: string): Promise<Year | null> {
  const snap = await getDoc(doc(db, "years", yearId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Year) : null;
}

export async function createYear(name: string, userId: string) {
  await addDoc(yearsCol, {
    name,
    order: Date.now(),
    createdBy: userId,
    createdAt: Date.now(),
  });
}

export async function deleteYear(yearId: string) {
  await deleteDoc(doc(db, "years", yearId));
}
