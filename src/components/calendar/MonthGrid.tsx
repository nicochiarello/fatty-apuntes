"use client";

import {
  daysInMonth,
  instantFromZoned,
  startOfZonedDay,
  zonedParts,
  zonedWeekday,
} from "@/lib/calendarTime";
import { useToday } from "@/lib/useToday";
import type { CalendarEvent } from "@/types";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

interface Cell {
  at: number;
  /** Day number as shown in the cell, already normalised into its real month. */
  label: number;
  inMonth: boolean;
}

/** Six weeks of cells covering `year`/`month`, padded with the neighbouring months. */
function buildCells(year: number, month: number): Cell[] {
  const leading = zonedWeekday(year, month, 1);
  const total = daysInMonth(year, month);
  const cells: Cell[] = [];

  for (let index = 0; index < 42; index += 1) {
    // Day numbers outside 1..total are normalised by Date.UTC into the adjacent month,
    // so the padding needs no special casing.
    const day = index - leading + 1;
    const at = instantFromZoned(year, month, day);
    cells.push({
      at,
      label: zonedParts(at).day,
      inMonth: day >= 1 && day <= total,
    });
  }

  // Trim a trailing week that belongs entirely to the next month.
  return cells.slice(0, cells.slice(35).every((cell) => !cell.inMonth) ? 35 : 42);
}

export function MonthGrid({
  year,
  month,
  events,
  onSelectDay,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  onSelectDay: (at: number) => void;
}) {
  const cells = buildCells(year, month);
  const today = useToday();

  const byDay = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    const key = startOfZonedDay(event.dueAt);
    const list = byDay.get(key);
    if (list) list.push(event);
    else byDay.set(key, [event]);
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-1">
        {WEEKDAYS.map((label, index) => (
          <div
            key={index}
            className="text-center text-[11px] font-medium uppercase text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayEvents = byDay.get(cell.at) ?? [];
          const isToday = cell.at === today;
          const pending = dayEvents.filter((event) => !event.done).length;

          return (
            <button
              key={cell.at}
              type="button"
              onClick={() => onSelectDay(cell.at)}
              className={cn(
                "flex min-h-16 min-w-0 flex-col items-start gap-1 rounded-lg border border-transparent p-1.5 text-left transition-colors hover:border-border hover:bg-muted sm:min-h-24",
                !cell.inMonth && "opacity-35",
                isToday && "border-primary/50 bg-primary/5",
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday ? "text-primary" : "text-muted-foreground",
                )}
              >
                {cell.label}
              </span>

              {/* Titles need room, so below sm the day only carries a count of dots. */}
              <span className="flex flex-wrap gap-0.5 sm:hidden">
                {dayEvents.slice(0, 4).map((event) => (
                  <span
                    key={event.id}
                    className={cn(
                      "size-1.5 rounded-full",
                      event.done ? "bg-muted-foreground/40" : "bg-primary",
                    )}
                  />
                ))}
              </span>

              <span className="hidden w-full min-w-0 flex-col gap-0.5 sm:flex">
                {dayEvents.slice(0, 3).map((event) => (
                  <span
                    key={event.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[11px]",
                      event.done
                        ? "text-muted-foreground line-through"
                        : "bg-primary/15 text-primary",
                    )}
                  >
                    {event.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{dayEvents.length - 3} más
                  </span>
                )}
              </span>

              {pending > 0 && (
                <span className="sr-only">{pending} evento(s) pendiente(s)</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
