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
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { CalendarEvent, ReminderNode } from "@/types";
import type { User } from "firebase/auth";

const eventsCol = collection(db, "calendarEvents");

export function subscribeCalendarEvents(callback: (events: CalendarEvent[]) => void) {
  const q = query(eventsCol, orderBy("dueAt", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as CalendarEvent));
    },
    (error) => {
      console.error("subscribeCalendarEvents error:", error);
      callback([]);
    },
  );
}

export async function getCalendarEvent(eventId: string): Promise<CalendarEvent | null> {
  const snap = await getDoc(doc(db, "calendarEvents", eventId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as CalendarEvent) : null;
}

export interface CalendarEventInput {
  title: string;
  description: string;
  dueAt: number;
  allDay: boolean;
  subjectId: string | null;
  reminders: ReminderNode[];
}

export async function createCalendarEvent(input: CalendarEventInput, user: User) {
  const title = input.title.trim();
  if (!title) throw new Error("El evento necesita un título");

  const ref = doc(eventsCol);
  const event: Omit<CalendarEvent, "id"> = {
    title,
    description: input.description.trim(),
    dueAt: input.dueAt,
    allDay: input.allDay,
    subjectId: input.subjectId,
    reminders: input.reminders,
    scheduleVersion: 1,
    done: false,
    doneBy: null,
    doneByName: null,
    doneAt: null,
    createdBy: user.uid,
    createdByName: user.displayName ?? "Anónimo",
    createdAt: Date.now(),
  };

  await setDoc(ref, event);
  return ref.id;
}

/**
 * Bumping scheduleVersion is what retires the reminder chain already in flight: its next
 * task sees a version it no longer recognises and dies instead of firing. Only the fields
 * that change *when* a reminder is due need it — renaming an event should not restart
 * anything.
 */
export async function updateCalendarEvent(event: CalendarEvent, input: CalendarEventInput) {
  const title = input.title.trim();
  if (!title) throw new Error("El evento necesita un título");

  const remindersChanged =
    JSON.stringify(input.reminders) !== JSON.stringify(event.reminders);
  const rescheduled = input.dueAt !== event.dueAt || remindersChanged;

  await updateDoc(doc(db, "calendarEvents", event.id), {
    title,
    description: input.description.trim(),
    dueAt: input.dueAt,
    allDay: input.allDay,
    subjectId: input.subjectId,
    reminders: input.reminders,
    ...(rescheduled ? { scheduleVersion: event.scheduleVersion + 1 } : {}),
  });
}

/**
 * Marking done needs no bump: the queued task re-reads the event when it fires, finds it
 * done, and stops without scheduling the next hop.
 *
 * Un-marking does need one. By then the chain may already have hit that guard and died
 * without queueing anything, and nothing would ever revive it — the event would go quiet
 * with no sign that it had. The bump makes the trigger build a fresh chain.
 */
export async function setCalendarEventDone(event: CalendarEvent, done: boolean, user: User) {
  await updateDoc(doc(db, "calendarEvents", event.id), {
    done,
    doneBy: done ? user.uid : null,
    doneByName: done ? (user.displayName ?? "Anónimo") : null,
    doneAt: done ? Date.now() : null,
    ...(done ? {} : { scheduleVersion: event.scheduleVersion + 1 }),
  });
}

export async function deleteCalendarEvent(eventId: string) {
  await deleteDoc(doc(db, "calendarEvents", eventId));
}
