"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { createFolder, updateFolder } from "@/lib/firebase/folders";
import type { Folder } from "@/types";
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

export function FolderDialog({
  yearId,
  subjectId,
  folder,
  trigger,
}: {
  yearId: string;
  subjectId: string;
  folder?: Folder;
  trigger: ReactNode;
}) {
  const isEdit = !!folder;
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(folder?.name ?? "");
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setName(folder?.name ?? "");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      if (isEdit && folder) {
        await updateFolder(folder.id, name.trim());
        toast.success("Carpeta actualizada");
      } else {
        await createFolder(name.trim(), yearId, subjectId, user.uid);
        toast.success("Carpeta creada");
      }
      setOpen(false);
    } catch {
      toast.error(isEdit ? "No pudimos actualizar la carpeta" : "No pudimos crear la carpeta");
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
            <DialogTitle>{isEdit ? "Editar carpeta" : "Crear carpeta"}</DialogTitle>
            <DialogDescription>Ej: TPs, Exámenes, Resúmenes…</DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-2">
            <Label htmlFor="folder-name">Nombre</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exámenes"
              autoFocus
            />
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
