"use client";

import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { RefreshCw, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { detectNoteType, getNoteFileName, updateNote } from "@/lib/firebase/notes";
import { NOTE_TYPE_META } from "@/lib/noteTypeMeta";
import { cn } from "@/lib/utils";
import type { Note } from "@/types";
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

export function EditNoteDialog({
  note,
  trigger,
  onUpdated,
}: {
  note: Note;
  trigger: ReactNode;
  onUpdated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(note.title);
  const [description, setDescription] = useState(note.description);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const dropped = acceptedFiles[0];
    if (!dropped) return;
    if (!detectNoteType(dropped.name)) {
      toast.error("Solo se aceptan archivos .md, .html o .pdf");
      return;
    }
    setFile(dropped);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/markdown": [".md", ".markdown"],
      "text/html": [".html", ".htm"],
      "application/pdf": [".pdf"],
    },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setFile(null);
      setTitle(note.title);
      setDescription(note.description);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateNote({ note, title, description, file });
      toast.success("Apunte actualizado");
      setOpen(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos actualizar el apunte");
    } finally {
      setLoading(false);
    }
  };

  const CurrentIcon = NOTE_TYPE_META[note.type].icon;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar apunte</DialogTitle>
            <DialogDescription>
              Cambiá el título, la descripción, o reemplazá el archivo.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition-colors",
                isDragActive && "border-primary bg-primary/5",
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <>
                  {(() => {
                    const type = detectNoteType(file.name);
                    const Icon = type ? NOTE_TYPE_META[type].icon : UploadCloud;
                    return <Icon className="size-6 text-primary" />;
                  })()}
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">Va a reemplazar el archivo actual</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600"
                  >
                    <X className="size-3" /> Cancelar reemplazo
                  </button>
                </>
              ) : (
                <>
                  <CurrentIcon className="size-6 text-muted-foreground" />
                  <p className="text-sm font-medium">{getNoteFileName(note)}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="size-3" />
                    Arrastrá un archivo nuevo o hacé click para reemplazarlo
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-note-title">Título</Label>
              <Input
                id="edit-note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resumen de la unidad 3"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-note-description">Descripción (opcional)</Label>
              <Textarea
                id="edit-note-description"
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
              {loading ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
