export type NoteType = "markdown" | "html" | "pdf" | "docx" | "pptx";

/**
 * A rule for when to remind about an event. Each one compiles into a self-perpetuating
 * chain of scheduled tasks rather than a precomputed list of times: every hop notifies and
 * then schedules the next, which is what lets a reminder sit further in the future than
 * Cloud Tasks' 30-day scheduling limit.
 *
 * - `once`  — a single reminder, `beforeMinutes` before the event.
 * - `daily` — one a day at a fixed wall-clock time, from `startDaysBefore` until the event.
 */
export type ReminderNode =
  | { kind: "once"; beforeMinutes: number }
  | { kind: "daily"; startDaysBefore: number; atMinute: number };

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  /** Epoch ms. For all-day events this is CALENDAR_TIME_ZONE midnight of that day. */
  dueAt: number;
  allDay: boolean;
  /** Optional link to a subject, used for colour and filtering. */
  subjectId: string | null;
  reminders: ReminderNode[];
  /**
   * Bumped by anything that invalidates already-scheduled reminders (a new date, edited
   * rules, un-marking it done). A queued task carries the version it was created with and
   * kills itself instead of firing when the two no longer match, so nothing ever has to
   * hunt down and delete tasks.
   */
  scheduleVersion: number;
  /** Shared across the group: marking it done silences the reminders for everyone. */
  done: boolean;
  doneBy: string | null;
  doneByName: string | null;
  doneAt: number | null;
  createdBy: string;
  createdByName: string;
  createdAt: number;
}

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
