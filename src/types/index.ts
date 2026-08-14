export type NoteType = "markdown" | "html" | "pdf" | "docx" | "pptx";

export interface Year {
  id: string;
  name: string;
  order: number;
  createdBy: string;
  createdAt: number;
}

export interface Subject {
  id: string;
  yearId: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  createdBy: string;
  createdAt: number;
}

export interface Folder {
  id: string;
  yearId: string;
  subjectId: string;
  name: string;
  order: number;
  createdBy: string;
  createdAt: number;
}

export interface Note {
  id: string;
  yearId: string;
  subjectId: string;
  folderId: string | null;
  title: string;
  description: string;
  type: NoteType;
  storagePath: string;
  downloadURL: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  createdAt: number;
  size: number;
  /**
   * True between "Escribir apunte" creating the document and its first save. The note
   * exists from the start only so pasted images have somewhere to upload to, so it must
   * not be announced yet — nobody wants a notification for an empty note. Absent on notes
   * created before this field existed, which reads as published.
   */
  draft?: boolean;
}
