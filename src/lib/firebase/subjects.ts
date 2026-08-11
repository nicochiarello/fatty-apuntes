import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Subject } from "@/types";

const subjectsCol = collection(db, "subjects");

export function subscribeSubjects(yearId: string, callback: (subjects: Subject[]) => void) {
  const q = query(subjectsCol, where("yearId", "==", yearId), orderBy("order", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Subject));
  });
}

export async function getSubject(subjectId: string): Promise<Subject | null> {
  const snap = await getDoc(doc(db, "subjects", subjectId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Subject) : null;
}

export async function createSubject(name: string, yearId: string, userId: string) {
  await addDoc(subjectsCol, {
    name,
    yearId,
    order: Date.now(),
    createdBy: userId,
    createdAt: Date.now(),
  });
}

export async function deleteSubject(subjectId: string) {
  await deleteDoc(doc(db, "subjects", subjectId));
}
