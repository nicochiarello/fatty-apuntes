"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCalendarEvent,
  subscribeCalendarEvents,
} from "@/lib/firebase/calendar";
import {
  CALENDAR_TIME_ZONE,
  isSameZonedDay,
  startOfZonedDay,
  zonedParts,
} from "@/lib/calendarTime";
import { useToday } from "@/lib/useToday";
import type { CalendarEvent } from "@/types";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { EventRow } from "@/components/calendar/EventRow";
import { EventDialog } from "@/components/calendar/EventDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MONTH_LABEL = new Intl.DateTimeFormat("es-AR", {
  timeZone: CALENDAR_TIME_ZONE,
  month: "long",
  year: "numeric",
});
const DAY_LABEL = new Intl.DateTimeFormat("es-AR", {
  timeZone: CALENDAR_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [toDelete, setToDelete] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = useToday();
  const todayParts = zonedParts(today);
  const [cursor, setCursor] = useState(() => {
    const at = zonedParts(startOfZonedDay(Date.now()));
    return { year: at.year, month: at.month };
  });

  useEffect(() => subscribeCalendarEvents(setEvents), []);

  const monthEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((event) => {
      const { year, month } = zonedParts(event.dueAt);
      return year === cursor.year && month === cursor.month;
    });
  }, [events, cursor]);

  const upcoming = useMemo(() => {
    if (!events) return [];
    return events.filter((event) => !event.done && event.dueAt >= today).slice(0, 8);
  }, [events, today]);

  const overdue = useMemo(() => {
    if (!events) return [];
    return events.filter((event) => !event.done && event.dueAt < today);
  }, [events, today]);

  const dayEvents = useMemo(() => {
    if (!events || selectedDay === null) return [];
    return events.filter((event) => isSameZonedDay(event.dueAt, selectedDay));
  }, [events, selectedDay]);

  const shift = (delta: number) => {
    setSelectedDay(null);
    setCursor((current) => {
      const month = current.month + delta;
      if (month < 1) return { year: current.year - 1, month: 12 };
      if (month > 12) return { year: current.year + 1, month: 1 };
      return { year: current.year, month };
    });
  };

  const monthTitle = MONTH_LABEL.format(
    new Date(Date.UTC(cursor.year, cursor.month - 1, 15)),
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-bold sm:text-3xl">Calendario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entregas y fechas del grupo, con avisos programables.
          </p>
        </div>
        <EventDialog
          defaultDate={selectedDay ?? undefined}
          trigger={
            <Button>
              <Plus className="size-4" />
              Nuevo evento
            </Button>
          }
        />
      </div>

      {events === null ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="min-w-0 truncate font-display text-lg font-semibold capitalize">
                {monthTitle}
              </h2>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shift(-1)}
                  className="size-8 p-0"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDay(null);
                    setCursor({ year: todayParts.year, month: todayParts.month });
                  }}
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shift(1)}
                  className="size-8 p-0"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>

            <MonthGrid
              year={cursor.year}
              month={cursor.month}
              events={monthEvents}
              onSelectDay={(at) => setSelectedDay((current) => (current === at ? null : at))}
            />

            {selectedDay !== null && (
              <div className="mt-4 rounded-xl border border-border p-3">
                <p className="mb-2 text-sm font-medium capitalize">
                  {DAY_LABEL.format(selectedDay)}
                </p>
                {dayEvents.length === 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-muted-foreground">Sin eventos ese día.</p>
                    <EventDialog
                      defaultDate={selectedDay}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Plus className="size-4" />
                          Agregar acá
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dayEvents.map((event) => (
                      <EventRow key={event.id} event={event} onDelete={() => setToDelete(event)} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="min-w-0 lg:w-80">
            {overdue.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-2 font-display text-lg font-semibold text-red-600">Vencidos</h2>
                <div className="flex flex-col gap-2">
                  {overdue.map((event) => (
                    <EventRow key={event.id} event={event} onDelete={() => setToDelete(event)} />
                  ))}
                </div>
              </div>
            )}

            <h2 className="mb-2 font-display text-lg font-semibold">Próximos</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay nada pendiente. Aprovechá.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming.map((event) => (
                  <EventRow key={event.id} event={event} onDelete={() => setToDelete(event)} />
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {events !== null && events.length === 0 && (
        <div className="mt-8">
          <EmptyState
            icon={CalendarDays}
            title="Todavía no hay eventos"
            description="Cargá la primera entrega o parcial para que el grupo la tenga presente."
            action={
              <EventDialog
                trigger={
                  <Button>
                    <Plus className="size-4" />
                    Nuevo evento
                  </Button>
                }
              />
            }
          />
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Eliminar "${toDelete?.title}"`}
        description="Se elimina el evento y sus avisos programados. No se puede deshacer."
        onConfirm={async () => {
          if (toDelete) {
            await deleteCalendarEvent(toDelete.id);
            toast.success("Evento eliminado");
          }
        }}
      />
    </div>
  );
}
