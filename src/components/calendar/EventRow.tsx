"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { setCalendarEventDone } from "@/lib/firebase/calendar";
import { CALENDAR_TIME_ZONE, startOfZonedDay } from "@/lib/calendarTime";
import { useToday } from "@/lib/useToday";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { EventDialog } from "@/components/calendar/EventDialog";

const DATE_FORMAT = new Intl.DateTimeFormat("es-AR", {
  timeZone: CALENDAR_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const TIME_FORMAT = new Intl.DateTimeFormat("es-AR", {
  timeZone: CALENDAR_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export function EventRow({
  event,
  onDelete,
}: {
  event: CalendarEvent;
  onDelete: () => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const today = useToday();
  // Day granularity on purpose: something due later today is not "overdue" yet, and it
  // keeps this consistent with how the page splits its Vencidos and Próximos lists.
  const daysAway = Math.round((startOfZonedDay(event.dueAt) - today) / 86400000);
  const overdue = !event.done && daysAway < 0;

  const handleToggleDone = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await setCalendarEventDone(event, !event.done, user);
      toast.success(event.done ? "Marcado como pendiente" : "Marcado como hecho");
    } catch {
      toast.error("No pudimos actualizar el evento");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-xl border border-border p-3",
        event.done && "opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={event.done}
        onChange={handleToggleDone}
        disabled={busy || !user}
        aria-label={event.done ? `Desmarcar ${event.title}` : `Marcar ${event.title} como hecho`}
        className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
      />

      <div className="min-w-0 flex-1">
        <p className={cn("break-words font-medium", event.done && "line-through")}>
          {event.title}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className={cn(overdue && "font-medium text-red-600")}>
            {DATE_FORMAT.format(event.dueAt)}
            {!event.allDay && ` · ${TIME_FORMAT.format(event.dueAt)}`}
          </span>
          {!event.done && (
            <span>
              {daysAway === 0
                ? "hoy"
                : daysAway === 1
                  ? "mañana"
                  : daysAway > 1
                    ? `en ${daysAway} días`
                    : `hace ${Math.abs(daysAway)} días`}
            </span>
          )}
          {event.done && event.doneByName && <span>· hecho por {event.doneByName}</span>}
        </p>
        {event.description && (
          <p className="mt-1 break-words text-sm text-muted-foreground">{event.description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <EventDialog
          event={event}
          trigger={
            <Button variant="ghost" size="sm" className="size-8 p-0" aria-label="Editar evento">
              <Pencil className="size-4" />
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="size-8 p-0 text-muted-foreground hover:text-red-600"
          aria-label="Eliminar evento"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
