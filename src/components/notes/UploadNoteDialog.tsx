"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";
import { ImageIcon, Upload, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { detectNoteType, isImageFile, uploadNote } from "@/lib/firebase/notes";
import { NOTE_TYPE_META } from "@/lib/noteTypeMeta";
import { cn } from "@/lib/utils";
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

function stripExtension(name: string) {
  return name.replace(/\.[^/.]+$/, "");
}

export function UploadNoteDialog({
  yearId,
  subjectId,
  folderId = null,
}: {
  yearId: string;
  subjectId: string;
  folderId?: string | null;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const primary = acceptedFiles.find((f) => detectNoteType(f.name));
      const droppedImages = acceptedFiles.filter((f) => isImageFile(f.name));
      const nextFile = primary ?? file;

      if (primary) {
        setFile(primary);
        setTitle((current) => current || stripExtension(primary.name));
      }

      if (droppedImages.length > 0) {
        if (nextFile && detectNoteType(nextFile.name) === "markdown") {
          setImages((current) => [...current, ...droppedImages]);
        } else {
          toast.error("Las imágenes solo se pueden adjuntar a un apunte en Markdown");
        }
      }

      if (!primary && droppedImages.length === 0) {
        toast.error(
          "Solo se aceptan archivos .md, .html, .pdf, .docx, .pptx, o imágenes junto a un .md",
        );
      }
    },
    [file],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "text/markdown": [".md", ".markdown"],
      "text/html": [".html", ".htm"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    },
  });

  const isMarkdown = file ? detectNoteType(file.name) === "markdown" : false;

  const reset = () => {
    setFile(null);
    setImages([]);
    setTitle("");
    setDescription("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    setLoading(true);
    try {
      await uploadNote({ file, images, title, description, yearId, subjectId, folderId, user });
      toast.success("Apunte subido");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos subir el apunte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" />
          Subir apunte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Subir apunte</DialogTitle>
            <DialogDescription>
              Archivos .md o .html (hasta 5MB), .pdf (hasta 25MB), .docx (hasta 15MB) o
              .pptx (hasta 20MB). A un .md le podés arrastrar también sus imágenes.
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
                  <p className="text-xs text-muted-foreground">
                    {isMarkdown
                      ? "Arrastrá más archivos para agregar imágenes, o…"
                      : "Arrastrá otro archivo para reemplazarlo, o…"}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setImages([]);
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-600"
                  >
                    <X className="size-3" /> Quitar
                  </button>
                </>
              ) : (
                <>
                  <UploadCloud className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arrastrá un archivo o hacé click para elegirlo
                  </p>
                </>
              )}
            </div>

            {isMarkdown && images.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {images.map((image, index) => (
                  <li
                    key={`${image.name}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm"
                  >
                    <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{image.name}</span>
                    <button
                      type="button"
                      onClick={() => setImages((current) => current.filter((_, i) => i !== index))}
                      className="shrink-0 text-muted-foreground hover:text-red-600"
                      aria-label={`Quitar ${image.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="note-title">Título</Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resumen de la unidad 3"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="note-description">Descripción (opcional)</Label>
              <Textarea
                id="note-description"
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
            <Button type="submit" disabled={loading || !file}>
              {loading ? "Subiendo…" : "Subir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
