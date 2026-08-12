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
  listAll,
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
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

export function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

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

// Uploads each attached image under the note's assets/ folder, then rewrites the
// markdown's image references (![alt](path) and <img src="path">) from local/relative
// paths to the resulting Storage URLs, matching by filename. Uploaded markdown otherwise
// has no way to reference images since only the .md text itself gets stored.
async function uploadImagesAndRewrite(
  text: string,
  images: File[],
  yearId: string,
  subjectId: string,
  noteId: string,
): Promise<string> {
  const urlByFileName = new Map<string, string>();

  for (const image of images) {
    const assetPath = `notes/${yearId}/${subjectId}/${noteId}/assets/${image.name}`;
    const assetRef = ref(storage, assetPath);
    await uploadBytes(assetRef, image, { contentType: image.type || "application/octet-stream" });
    urlByFileName.set(image.name.toLowerCase(), await getDownloadURL(assetRef));
  }

  const resolve = (path: string) => urlByFileName.get(path.split("/").pop()?.toLowerCase() ?? "");

  return text
    .replace(/!\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (match, alt, path, title) => {
      const url = resolve(path);
      return url ? `![${alt}](${url}${title})` : match;
    })
    .replace(/(<img[^>]*\ssrc=["'])([^"']+)(["'][^>]*>)/gi, (match, pre, path, post) => {
      const url = resolve(path);
      return url ? `${pre}${url}${post}` : match;
    });
}

interface UploadNoteInput {
  file: File;
  images?: File[];
  title: string;
  description: string;
  yearId: string;
  subjectId: string;
  folderId?: string | null;
  user: User;
}

export async function uploadNote({
  file,
  images = [],
  title,
  description,
  yearId,
  subjectId,
  folderId = null,
  user,
}: UploadNoteInput) {
  const type = assertValidFile(file);

  const noteRef = doc(notesCol);
  const storagePath = `notes/${yearId}/${subjectId}/${noteRef.id}/${file.name}`;
  const storageRef = ref(storage, storagePath);

  let body: File | Blob = file;
  if (type === "markdown" && images.length > 0) {
    const text = await file.text();
    const rewritten = await uploadImagesAndRewrite(text, images, yearId, subjectId, noteRef.id);
    body = new Blob([rewritten], { type: "text/markdown" });
  }

  await uploadBytes(storageRef, body, { contentType: contentTypeFor(type) });
  const downloadURL = await getDownloadURL(storageRef);

  const note: Omit<Note, "id"> = {
    yearId,
    subjectId,
    folderId,
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

// listAll only lists a folder's immediate children, so the assets/ subfolder (image
// attachments) needs its own recursive pass to actually get deleted.
async function deleteStorageFolder(folderRef: ReturnType<typeof ref>): Promise<void> {
  const { items, prefixes } = await listAll(folderRef);
  await Promise.all([
    ...items.map((item) => deleteObject(item).catch(() => {})),
    ...prefixes.map((prefix) => deleteStorageFolder(prefix)),
  ]);
}

export async function deleteNote(note: Note) {
  await deleteDoc(doc(db, "notes", note.id));

  // Deletes the whole notes/{yearId}/{subjectId}/{noteId}/ folder — the primary file plus
  // any image assets uploaded alongside a markdown note — not just the primary file.
  const folderRef = ref(storage, `notes/${note.yearId}/${note.subjectId}/${note.id}`);
  await deleteStorageFolder(folderRef).catch(() => {
    // La carpeta puede ya no existir en Storage; ignoramos el error.
  });
}

function contentTypeFor(type: NoteType) {
  if (type === "markdown") return "text/markdown";
  if (type === "html") return "text/html";
  return "application/pdf";
}
