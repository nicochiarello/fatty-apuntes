export type NoteType = "markdown" | "html" | "pdf";

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
  order: number;
  createdBy: string;
  createdAt: number;
}

export interface Note {
  id: string;
  yearId: string;
  subjectId: string;
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
}
