import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Folder } from "@/types";

const foldersCol = collection(db, "folders");

export function subscribeFolders(subjectId: string, callback: (folders: Folder[]) => void) {
  const q = query(foldersCol, where("subjectId", "==", subjectId), orderBy("order", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Folder));
    },
    (error) => {
      // Without this, a query error (e.g. a composite index still building) leaves the
      // caller's state stuck at its initial value forever — an infinite loading spinner
      // with nothing in the console to explain why.
      console.error("subscribeFolders error:", error);
      callback([]);
    },
  );
}

export async function getFolder(folderId: string): Promise<Folder | null> {
  const snap = await getDoc(doc(db, "folders", folderId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Folder) : null;
}

export async function createFolder(name: string, yearId: string, subjectId: string, userId: string) {
  await addDoc(foldersCol, {
    name,
    yearId,
    subjectId,
    order: Date.now(),
    createdBy: userId,
    createdAt: Date.now(),
  });
}

export async function updateFolder(folderId: string, name: string) {
  await updateDoc(doc(db, "folders", folderId), { name });
}

export async function deleteFolder(folderId: string) {
  // A folder is just an organizational label — deleting it un-assigns its notes back to
  // the subject's root instead of destroying them.
  const notesInFolder = await getDocs(query(collection(db, "notes"), where("folderId", "==", folderId)));
  const batch = writeBatch(db);
  notesInFolder.forEach((noteDoc) => batch.update(noteDoc.ref, { folderId: null }));
  batch.delete(doc(db, "folders", folderId));
  await batch.commit();
}
