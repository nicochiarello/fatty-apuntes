import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import type { Note, NoteType } from "@/types";
import type { User } from "firebase/auth";

const notesCol = collection(db, "notes");

const MARKDOWN_EXTENSIONS = [".md", ".markdown"];
const HTML_EXTENSIONS = [".html", ".htm"];
const PDF_EXTENSIONS = [".pdf"];

// PDFs (scanned chapters, slides) run much larger than a markdown/html note in practice.
export const MAX_NOTE_SIZE_BYTES: Record<NoteType, number> = {
  markdown: 5 * 1024 * 1024,
  html: 5 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
};

export function detectNoteType(fileName: string): NoteType | null {
  const lower = fileName.toLowerCase();
  if (MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "markdown";
  if (HTML_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "html";
  if (PDF_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "pdf";
  return null;
}

function assertValidFile(file: File): NoteType {
  const type = detectNoteType(file.name);
  if (!type) {
    throw new Error("Solo se permiten archivos .md, .html o .pdf");
  }
  const maxSize = MAX_NOTE_SIZE_BYTES[type];
  if (file.size > maxSize) {
    throw new Error(`El archivo supera el tamaño máximo permitido (${maxSize / (1024 * 1024)}MB)`);
  }
  return type;
}

export function getNoteFileName(note: Note): string {
  return note.storagePath.split("/").pop() || note.title;
}

export async function downloadNote(note: Note) {
  const res = await fetch(note.downloadURL);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = getNoteFileName(note);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function subscribeNotes(subjectId: string, callback: (notes: Note[]) => void) {
  const q = query(notesCol, where("subjectId", "==", subjectId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Note));
  });
}

export async function getNote(noteId: string): Promise<Note | null> {
  const snap = await getDoc(doc(db, "notes", noteId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Note) : null;
}

interface UploadNoteInput {
  file: File;
  title: string;
  description: string;
  yearId: string;
  subjectId: string;
  user: User;
}

export async function uploadNote({
  file,
  title,
  description,
  yearId,
  subjectId,
  user,
}: UploadNoteInput) {
  const type = assertValidFile(file);

  const noteRef = doc(notesCol);
  const storagePath = `notes/${yearId}/${subjectId}/${noteRef.id}/${file.name}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, file, { contentType: contentTypeFor(type) });
  const downloadURL = await getDownloadURL(storageRef);

  const note: Omit<Note, "id"> = {
    yearId,
    subjectId,
    title: title.trim() || file.name,
    description: description.trim(),
    type,
    storagePath,
    downloadURL,
    authorId: user.uid,
    authorName: user.displayName ?? "Anónimo",
    authorPhotoURL: user.photoURL,
    createdAt: Date.now(),
    size: file.size,
  };

  await setDoc(noteRef, note);

  return noteRef.id;
}

interface UpdateNoteInput {
  note: Note;
  title: string;
  description: string;
  file?: File | null;
}

export async function updateNote({ note, title, description, file }: UpdateNoteInput) {
  const updates: Partial<Note> = {
    title: title.trim() || note.title,
    description: description.trim(),
  };

  if (file) {
    const type = assertValidFile(file);

    await deleteObject(ref(storage, note.storagePath)).catch(() => {
      // El archivo original puede ya no existir en Storage; ignoramos el error.
    });

    const storagePath = `notes/${note.yearId}/${note.subjectId}/${note.id}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file, { contentType: contentTypeFor(type) });
    const downloadURL = await getDownloadURL(storageRef);

    updates.type = type;
    updates.storagePath = storagePath;
    updates.downloadURL = downloadURL;
    updates.size = file.size;
  }

  await updateDoc(doc(db, "notes", note.id), updates);
}

export async function deleteNote(note: Note) {
  await deleteDoc(doc(db, "notes", note.id));
  await deleteObject(ref(storage, note.storagePath)).catch(() => {
    // El archivo puede ya no existir en Storage; ignoramos el error.
  });
}

function contentTypeFor(type: NoteType) {
  if (type === "markdown") return "text/markdown";
  if (type === "html") return "text/html";
  return "application/pdf";
}
