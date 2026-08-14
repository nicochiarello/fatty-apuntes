"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  createCalendarEvent,
  updateCalendarEvent,
  type CalendarEventInput,
} from "@/lib/firebase/calendar";
import { instantFromZoned, minutesIntoZonedDay, zonedParts } from "@/lib/calendarTime";
import type { CalendarEvent, ReminderNode } from "@/types";
import { ReminderEditor } from "@/components/calendar/ReminderEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const pad = (value: number) => String(value).padStart(2, "0");

function dateInputValue(at: number) {
  const { year, month, day } = zonedParts(at);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function timeInputValue(at: number) {
  const minutes = minutesIntoZonedDay(at);
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function EventDialog({
  event,
  defaultDate,
  trigger,
  onSaved,
}: {
  /** Absent when creating. */
  event?: CalendarEvent;
  /** Instant whose day pre-fills the form, e.g. the calendar cell that was clicked. */
  defaultDate?: number;
  trigger: ReactNode;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("23:59");
  const [allDay, setAllDay] = useState(false);
  const [reminders, setReminders] = useState<ReminderNode[]>([]);
  // Captured when the dialog opens, so nothing here has to read the clock while rendering.
  const [seedDueAt, setSeedDueAt] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    // Re-seeded on every open so reopening after a cancel does not keep stale edits.
    const seed = event?.dueAt ?? defaultDate ?? Date.now();
    setSeedDueAt(seed);
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setDate(dateInputValue(seed));
    setTime(event ? timeInputValue(event.dueAt) : "23:59");
    setAllDay(event?.allDay ?? false);
    setReminders(event?.reminders ?? []);
  };

  // Derived from the fields as they stand, so the reminder preview tracks the date being
  // typed instead of the one already saved.
  const draftDueAt = (() => {
    const fallback = event?.dueAt ?? seedDueAt;
    if (!date) return fallback;
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = allDay ? [0, 0] : time.split(":").map(Number);
    if ([year, month, day, hour, minute].some(Number.isNaN)) return fallback;
    return instantFromZoned(year, month, day, hour * 60 + minute);
  })();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !date) return;

    const input: CalendarEventInput = {
      title,
      description,
      dueAt: draftDueAt,
      allDay,
      // Not exposed yet: the model carries it so events can be coloured per subject later.
      subjectId: event?.subjectId ?? null,
      reminders,
    };

    setLoading(true);
    try {
      if (event) {
        await updateCalendarEvent(event, input);
        toast.success("Evento actualizado");
      } else {
        await createCalendarEvent(input, user);
        toast.success("Evento creado");
      }
      setOpen(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos guardar el evento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{event ? "Editar evento" : "Nuevo evento"}</DialogTitle>
            <DialogDescription>
              Entregas, parciales o cualquier fecha que el grupo tenga que tener presente.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-title">Título</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entrega TP2"
                autoFocus
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Label htmlFor="event-date">Fecha</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              {!allDay && (
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Label htmlFor="event-time">Hora</Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Todo el día
            </label>

            <ReminderEditor value={reminders} onChange={setReminders} dueAt={draftDueAt} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="event-description">Detalle (opcional)</Label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qué hay que entregar, dónde, con quién…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title.trim() || !date}>
              {loading ? "Guardando…" : event ? "Guardar" : "Crear evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
