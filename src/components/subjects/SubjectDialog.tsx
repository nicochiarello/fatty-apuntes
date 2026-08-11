"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { createSubject, updateSubject } from "@/lib/firebase/subjects";
import {
  DEFAULT_SUBJECT_COLOR,
  DEFAULT_SUBJECT_ICON,
  SUBJECT_COLORS,
  SUBJECT_ICONS,
} from "@/lib/subjectAppearance";
import { cn } from "@/lib/utils";
import type { Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SubjectDialog({
  yearId,
  subject,
  trigger,
}: {
  yearId: string;
  subject?: Subject;
  trigger: ReactNode;
}) {
  const isEdit = !!subject;
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(subject?.name ?? "");
  const [icon, setIcon] = useState(subject?.icon ?? DEFAULT_SUBJECT_ICON);
  const [color, setColor] = useState(subject?.color ?? DEFAULT_SUBJECT_COLOR);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setName(subject?.name ?? "");
      setIcon(subject?.icon ?? DEFAULT_SUBJECT_ICON);
      setColor(subject?.color ?? DEFAULT_SUBJECT_COLOR);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      if (isEdit && subject) {
        await updateSubject(subject.id, { name: name.trim(), icon, color });
        toast.success("Materia actualizada");
      } else {
        await createSubject(name.trim(), yearId, user.uid, icon, color);
        toast.success("Materia creada");
      }
      setOpen(false);
    } catch {
      toast.error(isEdit ? "No pudimos actualizar la materia" : "No pudimos crear la materia");
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
            <DialogTitle>{isEdit ? "Editar materia" : "Crear materia"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Cambiá el nombre, ícono o color de la materia."
                : "Ej: Análisis Matemático, Programación I…"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="subject-name">Nombre</Label>
              <Input
                id="subject-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Análisis Matemático"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Ícono</Label>
              <div className="grid grid-cols-8 gap-2">
                {SUBJECT_ICONS.map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(key)}
                    aria-label={key}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted",
                      icon === key && "border-primary bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map(({ key, swatch }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setColor(key)}
                    aria-label={key}
                    className={cn(
                      "size-8 rounded-full ring-offset-2 ring-offset-card transition-shadow",
                      swatch,
                      color === key && "ring-2 ring-primary",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Guardando…" : isEdit ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
