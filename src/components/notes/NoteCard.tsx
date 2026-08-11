"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { downloadNote } from "@/lib/firebase/notes";
import { NOTE_TYPE_META } from "@/lib/noteTypeMeta";
import type { Note } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function NoteCard({
  note,
  yearId,
  onDelete,
}: {
  note: Note;
  yearId: string;
  onDelete: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const Icon = NOTE_TYPE_META[note.type].icon;

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloading(true);
    try {
      await downloadNote(note);
    } catch {
      toast.error("No pudimos descargar el archivo");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="group relative">
      <Link href={`/note?year=${yearId}&subject=${note.subjectId}&id=${note.id}`}>
        <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold leading-tight">{note.title}</h3>
              <Badge variant={NOTE_TYPE_META[note.type].badgeVariant}>
                {NOTE_TYPE_META[note.type].label}
              </Badge>
            </div>
            {note.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {note.description}
              </p>
            )}
          </div>
          <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Avatar className="size-5">
              <AvatarImage src={note.authorPhotoURL ?? undefined} alt={note.authorName} />
              <AvatarFallback className="text-[10px]">
                {note.authorName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{note.authorName}</span>
            <span>·</span>
            <span>{formatDistanceToNow(note.createdAt, { addSuffix: true, locale: es })}</span>
          </div>
        </Card>
      </Link>
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="rounded-full bg-card p-1.5 text-muted-foreground shadow-sm hover:text-primary disabled:opacity-50"
          aria-label={`Descargar ${note.title}`}
        >
          <Download className="size-4" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-full bg-card p-1.5 text-muted-foreground shadow-sm hover:text-red-600"
          aria-label={`Eliminar ${note.title}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
