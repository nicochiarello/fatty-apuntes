"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { createMarkdownNote } from "@/lib/firebase/notes";
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

/**
 * Creates an empty markdown note and drops straight into the editor. The note has to exist
 * in Firestore first because the editor uploads pasted images into that note's own folder.
 */
export function NewNoteDialog({
  yearId,
  subjectId,
  folderId = null,
  trigger,
}: {
  yearId: string;
  subjectId: string;
  folderId?: string | null;
  trigger?: ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setLoading(true);
    try {
      const noteId = await createMarkdownNote({
        title,
        description,
        yearId,
        subjectId,
        folderId,
        user,
      });
      setOpen(false);
      setTitle("");
      setDescription("");
      router.push(`/note?year=${yearId}&subject=${subjectId}&id=${noteId}&edit=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos crear el apunte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <PenLine className="size-4" />
            Escribir apunte
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Escribir apunte</DialogTitle>
            <DialogDescription>
              Creá un apunte en blanco y escribilo acá mismo, con formato y todo.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-note-title">Título</Label>
              <Input
                id="new-note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resumen de la unidad 3"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="new-note-description">Descripción (opcional)</Label>
              <Textarea
                id="new-note-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="De qué trata este apunte…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Creando…" : "Crear y escribir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
