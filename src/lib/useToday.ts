"use client";

import { useSyncExternalStore } from "react";
import { startOfZonedDay } from "@/lib/calendarTime";

/**
 * Midnight of the current day in the calendar zone.
 *
 * Read through a store rather than calling Date.now() while rendering: a component that
 * reads the clock mid-render is not a pure function of its props, which React's compiler
 * rejects — and the value would also go stale, leaving "today" highlighting yesterday on a
 * tab left open overnight. This re-renders exactly once, when the day actually turns over.
 */

let cached = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function readToday(): number {
  const day = startOfZonedDay(Date.now());
  // getSnapshot must return a stable value between calls or React re-renders forever, so
  // the number is cached and only replaced when the day genuinely changes.
  if (day !== cached) cached = day;
  return cached;
}

function scheduleRollover() {
  if (timer) clearTimeout(timer);
  const nextMidnight = readToday() + 24 * 60 * 60 * 1000;
  // Capped: setTimeout overflows past ~24.8 days, and a minimum keeps a clock jump from
  // spinning. A minute of lateness on a date highlight costs nothing.
  const delay = Math.min(Math.max(nextMidnight - Date.now(), 1000), 60 * 60 * 1000);
  timer = setTimeout(() => {
    readToday();
    listeners.forEach((notify) => notify());
    scheduleRollover();
  }, delay);
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (listeners.size === 1) scheduleRollover();
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

export function useToday(): number {
  return useSyncExternalStore(subscribe, readToday, () => 0);
}
