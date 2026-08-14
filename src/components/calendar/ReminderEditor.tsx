"use client";

import { Bell, Plus, X } from "lucide-react";
import { CALENDAR_TIME_ZONE } from "@/lib/calendarTime";
import { allOccurrences, MAX_RULES_PER_EVENT } from "@/lib/reminders";
import type { ReminderNode } from "@/types";
import { Button } from "@/components/ui/button";

const PREVIEW_FORMAT = new Intl.DateTimeFormat("es-AR", {
  timeZone: CALENDAR_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const PRESETS: Array<{ label: string; rule: ReminderNode }> = [
  { label: "1 hora antes", rule: { kind: "once", beforeMinutes: 60 } },
  { label: "1 día antes", rule: { kind: "once", beforeMinutes: 1440 } },
  {
    label: "Diario desde 3 días antes",
    rule: { kind: "daily", startDaysBefore: 3, atMinute: 9 * 60 },
  },
];

const UNITS = [
  { value: 1, singular: "minuto", plural: "minutos" },
  { value: 60, singular: "hora", plural: "horas" },
  { value: 1440, singular: "día", plural: "días" },
];

/** Largest unit that divides the offset evenly, so "60" reads back as "1 hora". */
function splitOffset(beforeMinutes: number) {
  for (const unit of [...UNITS].reverse()) {
    if (beforeMinutes % unit.value === 0) {
      return { amount: beforeMinutes / unit.value, unit: unit.value };
    }
  }
  return { amount: beforeMinutes, unit: 1 };
}

const pad = (value: number) => String(value).padStart(2, "0");
const selectClass =
  "h-9 min-w-0 rounded-lg border border-border bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const numberClass = `${selectClass} w-16`;

export function ReminderEditor({
  value,
  onChange,
  dueAt,
}: {
  value: ReminderNode[];
  onChange: (next: ReminderNode[]) => void;
  dueAt: number;
}) {
  const occurrences = allOccurrences({ dueAt, reminders: value });
  const full = value.length >= MAX_RULES_PER_EVENT;

  const replace = (index: number, rule: ReminderNode) =>
    onChange(value.map((current, i) => (i === index ? rule : current)));

  const add = (rule: ReminderNode) => {
    if (full) return;
    onChange([...value, rule]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Bell className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">Recordatorios</span>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Sin avisos. Agregá uno para que el grupo reciba una notificación antes de la fecha.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {value.map((rule, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm"
          >
            <select
              value={rule.kind}
              onChange={(e) =>
                replace(
                  index,
                  e.target.value === "once"
                    ? { kind: "once", beforeMinutes: 60 }
                    : { kind: "daily", startDaysBefore: 3, atMinute: 9 * 60 },
                )
              }
              className={selectClass}
              aria-label="Tipo de recordatorio"
            >
              <option value="once">Una vez</option>
              <option value="daily">Todos los días</option>
            </select>

            {rule.kind === "once" ? (
              (() => {
                const { amount, unit } = splitOffset(rule.beforeMinutes);
                return (
                  <>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={amount}
                      onChange={(e) =>
                        replace(index, {
                          kind: "once",
                          beforeMinutes: Math.max(1, Number(e.target.value) || 1) * unit,
                        })
                      }
                      className={numberClass}
                      aria-label="Cantidad"
                    />
                    <select
                      value={unit}
                      onChange={(e) =>
                        replace(index, {
                          kind: "once",
                          beforeMinutes: amount * Number(e.target.value),
                        })
                      }
                      className={selectClass}
                      aria-label="Unidad"
                    >
                      {UNITS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {amount === 1 ? option.singular : option.plural}
                        </option>
                      ))}
                    </select>
                    <span className="text-muted-foreground">antes</span>
                  </>
                );
              })()
            ) : (
              <>
                <span className="text-muted-foreground">desde</span>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={rule.startDaysBefore}
                  onChange={(e) =>
                    replace(index, {
                      ...rule,
                      startDaysBefore: Math.min(60, Math.max(0, Number(e.target.value) || 0)),
                    })
                  }
                  className={numberClass}
                  aria-label="Días antes"
                />
                <span className="text-muted-foreground">días antes, a las</span>
                <input
                  type="time"
                  value={`${pad(Math.floor(rule.atMinute / 60))}:${pad(rule.atMinute % 60)}`}
                  onChange={(e) => {
                    const [hour, minute] = e.target.value.split(":").map(Number);
                    if (Number.isNaN(hour) || Number.isNaN(minute)) return;
                    replace(index, { ...rule, atMinute: hour * 60 + minute });
                  }}
                  className={selectClass}
                  aria-label="Hora del aviso"
                />
              </>
            )}

            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="ml-auto shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
              aria-label="Quitar recordatorio"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            disabled={full}
            onClick={() => add(preset.rule)}
          >
            <Plus className="size-3.5" />
            {preset.label}
          </Button>
        ))}
      </div>

      {/* The rules say when to start and how often, never which days that lands on. Without
          this the person setting them up cannot tell what they just configured. */}
      {occurrences.length > 0 && (
        <div className="rounded-lg bg-muted/60 p-2">
          <p className="text-xs font-medium">
            {occurrences.length} aviso{occurrences.length === 1 ? "" : "s"}:
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {occurrences.slice(0, 8).map((at) => (
              <li key={at} className="text-xs text-muted-foreground">
                {PREVIEW_FORMAT.format(at)}
              </li>
            ))}
            {occurrences.length > 8 && (
              <li className="text-xs text-muted-foreground">
                y {occurrences.length - 8} más…
              </li>
            )}
          </ul>
        </div>
      )}

      {value.length > 0 && occurrences.length === 0 && (
        <p className="text-xs text-red-600">
          Estos recordatorios no generan ningún aviso: todos caen después de la fecha del
          evento.
        </p>
      )}

      {full && (
        <p className="text-xs text-muted-foreground">
          Máximo {MAX_RULES_PER_EVENT} recordatorios por evento.
        </p>
      )}
    </div>
  );
}
