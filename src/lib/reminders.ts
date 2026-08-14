import {
  addZonedDays,
  instantFromZoned,
  startOfZonedDay,
  zonedParts,
} from "./calendarTime";
import type { CalendarEvent, ReminderNode } from "../types";

/*
 * Imported relatively rather than through the @/ alias, and this file is kept free of any
 * browser or React dependency: the same two modules are compiled into the Cloud Functions
 * package before deploy (see the build:shared script), and tsc does not rewrite path
 * aliases in its output. One source of truth matters more than usual here — if the copies
 * drifted, the editor's preview would confidently show times the server never fires.
 */

/**
 * Rule semantics for reminders, as a step-at-a-time transition rather than a precomputed
 * list.
 *
 * Each rule is a chain: a scheduled task fires occurrence N, then asks for occurrence N+1
 * and schedules that one. Nothing ever needs the whole series at once, which is what lets
 * a reminder sit further out than Cloud Tasks can schedule. The preview in the editor is
 * the one place that does walk the chain to the end, and only to show it.
 *
 * Every function here is pure and takes the event it refers to, so the same code answers
 * "what should the editor show" and "what fires next" identically.
 */

/** A rule cannot expand past this, whatever the user typed. */
export const MAX_OCCURRENCES_PER_RULE = 60;

/** Keeps one event from turning into an unbounded pile of scheduled tasks. */
export const MAX_RULES_PER_EVENT = 6;

export interface ReminderStep {
  ruleIndex: number;
  occurrenceIndex: number;
  fireAt: number;
}

/** The same day as `at`, but at `minute` minutes past midnight in the calendar zone. */
function atMinuteOfDay(at: number, minute: number): number {
  const { year, month, day } = zonedParts(at);
  return instantFromZoned(year, month, day, minute);
}

/**
 * Instant of a rule's occurrence `index`, or null once the chain is over.
 *
 * A reminder is never scheduled after the event it is reminding about, so every kind ends
 * by comparing against `dueAt`.
 */
export function occurrenceAt(
  event: Pick<CalendarEvent, "dueAt">,
  rule: ReminderNode,
  index: number,
): number | null {
  if (index < 0 || index >= MAX_OCCURRENCES_PER_RULE) return null;

  if (rule.kind === "once") {
    if (index !== 0) return null;
    const at = event.dueAt - rule.beforeMinutes * 60_000;
    return at <= event.dueAt ? at : null;
  }

  // Stepping in whole calendar days keeps the wall-clock hour stable, which is the point
  // of "every day at 09:00" — an offset in milliseconds would drift across a DST change.
  const firstDay = addZonedDays(startOfZonedDay(event.dueAt), -rule.startDaysBefore);
  const at = atMinuteOfDay(addZonedDays(firstDay, index), rule.atMinute);
  return at <= event.dueAt ? at : null;
}

/** Every instant a rule would fire at, in order. Used by the editor's preview. */
export function occurrencesOf(
  event: Pick<CalendarEvent, "dueAt">,
  rule: ReminderNode,
): number[] {
  const out: number[] = [];
  for (let index = 0; index < MAX_OCCURRENCES_PER_RULE; index += 1) {
    const at = occurrenceAt(event, rule, index);
    // `once` ends immediately; `daily` can start before the window and only later produce
    // times, so a null is the end of the chain rather than a gap to skip over.
    if (at === null) break;
    out.push(at);
  }
  return out;
}

/**
 * All reminders of an event, merged across rules, de-duplicated and sorted.
 *
 * Two rules landing on the same minute would otherwise send the same notification twice.
 */
export function allOccurrences(
  event: Pick<CalendarEvent, "dueAt" | "reminders">,
): number[] {
  const seen = new Set<number>();
  for (const rule of event.reminders.slice(0, MAX_RULES_PER_EVENT)) {
    for (const at of occurrencesOf(event, rule)) seen.add(at);
  }
  return [...seen].sort((a, b) => a - b);
}

/**
 * The first step of a rule's chain that is still ahead of `from` — where a chain starts,
 * and where it restarts after the event is edited, so already-passed occurrences are
 * skipped rather than fired late in a burst.
 */
export function firstStepAfter(
  event: Pick<CalendarEvent, "dueAt" | "reminders">,
  ruleIndex: number,
  from: number,
): ReminderStep | null {
  const rule = event.reminders[ruleIndex];
  if (!rule) return null;

  for (let index = 0; index < MAX_OCCURRENCES_PER_RULE; index += 1) {
    const at = occurrenceAt(event, rule, index);
    if (at === null) return null;
    if (at > from) return { ruleIndex, occurrenceIndex: index, fireAt: at };
  }
  return null;
}

/** The hop after `occurrenceIndex`, or null when the chain is finished. */
export function nextStep(
  event: Pick<CalendarEvent, "dueAt" | "reminders">,
  ruleIndex: number,
  occurrenceIndex: number,
): ReminderStep | null {
  const rule = event.reminders[ruleIndex];
  if (!rule) return null;

  const index = occurrenceIndex + 1;
  const at = occurrenceAt(event, rule, index);
  return at === null ? null : { ruleIndex, occurrenceIndex: index, fireAt: at };
}

/** Where every chain of an event begins. One entry per rule that still has a future hop. */
export function initialSteps(
  event: Pick<CalendarEvent, "dueAt" | "reminders">,
  from: number,
): ReminderStep[] {
  return event.reminders
    .slice(0, MAX_RULES_PER_EVENT)
    .map((_, ruleIndex) => firstStepAfter(event, ruleIndex, from))
    .filter((step): step is ReminderStep => step !== null);
}

/** Human description of a rule, for the editor and for notification copy. */
export function describeRule(rule: ReminderNode): string {
  if (rule.kind === "once") {
    const minutes = rule.beforeMinutes;
    if (minutes % 1440 === 0) {
      const days = minutes / 1440;
      return days === 1 ? "1 día antes" : `${days} días antes`;
    }
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return hours === 1 ? "1 hora antes" : `${hours} horas antes`;
    }
    return `${minutes} minutos antes`;
  }

  const hour = String(Math.floor(rule.atMinute / 60)).padStart(2, "0");
  const minute = String(rule.atMinute % 60).padStart(2, "0");
  const days = rule.startDaysBefore;
  return days === 0
    ? `El mismo día a las ${hour}:${minute}`
    : `Todos los días desde ${days} ${days === 1 ? "día" : "días"} antes, a las ${hour}:${minute}`;
}
