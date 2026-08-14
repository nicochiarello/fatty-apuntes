/**
 * The calendar is shared by the whole group, so "a las 9:00" has to mean the same instant
 * for everybody. Wall-clock times are therefore resolved against one fixed zone rather
 * than whatever the browser that saved the event happened to be in — and the same constant
 * is used by the Cloud Function, which otherwise runs in UTC.
 */
export const CALENDAR_TIME_ZONE = "America/Argentina/Buenos_Aires";

const PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: CALENDAR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** The calendar-zone wall clock reading of an instant. */
export function zonedParts(at: number | Date) {
  const parts = PARTS.formatToParts(at instanceof Date ? at : new Date(at));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    // Intl renders midnight as hour 24 in some engines; normalise it back to 0.
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of the calendar zone from UTC, in minutes, at a given instant. */
function zoneOffsetMinutes(at: number): number {
  const { year, month, day, hour, minute, second } = zonedParts(at);
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  // Rounded to the minute: the difference carries the milliseconds of `at`, not a real
  // offset component, and zone offsets are always whole minutes.
  return Math.round((asUtc - at) / 60000);
}

/**
 * Turns a calendar-zone wall clock reading into an absolute instant.
 *
 * Resolved in two passes because the offset itself depends on the date being resolved: the
 * first guess picks an offset that may belong to the wrong side of a DST change, and the
 * second re-reads it at the corrected instant. Argentina has no DST today, but this must
 * not quietly break an hour of reminders if that ever changes.
 */
export function instantFromZoned(
  year: number,
  month: number,
  day: number,
  minutesIntoDay = 0,
): number {
  const naive = Date.UTC(year, month - 1, day, 0, minutesIntoDay);
  const firstGuess = naive - zoneOffsetMinutes(naive) * 60000;
  return naive - zoneOffsetMinutes(firstGuess) * 60000;
}

/** Midnight, in the calendar zone, of the day containing `at`. */
export function startOfZonedDay(at: number): number {
  const { year, month, day } = zonedParts(at);
  return instantFromZoned(year, month, day);
}

/** Minutes since midnight of `at`, read in the calendar zone. */
export function minutesIntoZonedDay(at: number): number {
  const { hour, minute } = zonedParts(at);
  return hour * 60 + minute;
}

/** Same calendar day in the calendar zone — not the same 24h window. */
export function isSameZonedDay(a: number, b: number): boolean {
  return startOfZonedDay(a) === startOfZonedDay(b);
}

/** Adds whole calendar days, keeping the wall-clock time of day stable across DST. */
export function addZonedDays(at: number, days: number): number {
  const { year, month, day } = zonedParts(at);
  return instantFromZoned(year, month, day + days, minutesIntoZonedDay(at));
}

/**
 * Weekday of a calendar date, 0 = Monday. Read off a UTC date built from the same
 * year/month/day: which weekday a calendar date falls on does not depend on the zone, and
 * going through UTC keeps an offset from ever shifting it by one.
 */
export function zonedWeekday(year: number, month: number, day: number): number {
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

/** Days in a month, via the day-0 rollover of the following month. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatMinuteOfDay(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
