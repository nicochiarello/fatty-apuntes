"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronLeft, Download, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getSubject } from "@/lib/firebase/subjects";
import { getNote, downloadNote } from "@/lib/firebase/notes";
import { elementToPdf } from "@/lib/pdfExport";
import { NOTE_TYPE_META } from "@/lib/noteTypeMeta";
import type { Note, Subject } from "@/types";
import { MarkdownWithToc } from "@/components/notes/MarkdownWithToc";
import { HtmlViewer } from "@/components/notes/HtmlViewer";
import { PdfViewer } from "@/components/notes/PdfViewer";
import { EditNoteDialog } from "@/components/notes/EditNoteDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function NotePageInner() {
  const searchParams = useSearchParams();
  const yearId = searchParams.get("year") ?? "";
  const subjectId = searchParams.get("subject") ?? "";
  const noteId = searchParams.get("id") ?? "";

  const [subject, setSubject] = useState<Subject | null>(null);
  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const refreshNote = () => {
    if (!noteId) return;
    setContent(null);
    setError(false);
    getNote(noteId).then(setNote);
  };

  useEffect(() => {
    if (!yearId || !subjectId || !noteId) return;
    getSubject(subjectId).then(setSubject);
    getNote(noteId).then(setNote);
  }, [yearId, subjectId, noteId]);

  useEffect(() => {
    if (!note || note.type === "pdf") return;
    fetch(note.downloadURL)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.text();
      })
      .then(setContent)
      .catch(() => setError(true));
  }, [note]);

  const handleDownload = async () => {
    if (!note) return;
    setDownloading(true);
    try {
      await downloadNote(note);
    } catch {
      toast.error("No pudimos descargar el archivo");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!note) return;
    const target = document.getElementById("markdown-note-content");
    if (!target) return;
    setDownloading(true);
    try {
      const filename = `${note.title.replace(/[/\\]/g, "-")}.pdf`;
      await elementToPdf(target, filename);
    } catch {
      toast.error("No pudimos generar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  const backHref = `/dashboard/subject?year=${yearId}&id=${subjectId}`;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
        <Link
          href={backHref}
          className="flex shrink-0 items-center gap-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Volver a la materia"
        >
          <ChevronLeft className="size-5" />
        </Link>

        {note ? (
          <>
            <h1 className="truncate font-display text-base font-semibold sm:text-lg">
              {note.title}
            </h1>
            <Badge variant={NOTE_TYPE_META[note.type].badgeVariant} className="shrink-0">
              {NOTE_TYPE_META[note.type].label}
            </Badge>
            <div className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <EditNoteDialog
                note={note}
                onUpdated={refreshNote}
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 px-2.5">
                    <Pencil className="size-4" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                }
              />
              {note.type === "markdown" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={downloading} className="h-8 px-2.5">
                      <Download className="size-4" />
                      <span className="hidden sm:inline">
                        {downloading ? "Descargando…" : "Descargar"}
                      </span>
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={handleDownload}>Como Markdown (.md)</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleDownloadPdf}>Como PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="h-8 px-2.5"
                >
                  <Download className="size-4" />
                  <span className="hidden sm:inline">
                    {downloading ? "Descargando…" : "Descargar"}
                  </span>
                </Button>
              )}
              <div className="ml-2 hidden items-center gap-2 sm:flex">
                <Avatar className="size-6">
                  <AvatarImage src={note.authorPhotoURL ?? undefined} alt={note.authorName} />
                  <AvatarFallback className="text-[10px]">
                    {note.authorName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{note.authorName}</span>
                <span>·</span>
                <span>{formatDistanceToNow(note.createdAt, { addSuffix: true, locale: es })}</span>
              </div>
            </div>
          </>
        ) : (
          <Skeleton className="h-4 w-48" />
        )}
        {subject && (
          <span className="hidden shrink-0 text-xs text-muted-foreground lg:inline">
            {subject.name}
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1">
        {note === undefined && (
          <div className="p-6">
            <Skeleton className="h-96 w-full" />
          </div>
        )}

        {note === null && (
          <p className="p-6 text-muted-foreground">Este apunte no existe o fue eliminado.</p>
        )}

        {note && note.type === "pdf" && <PdfViewer url={note.downloadURL} />}

        {note && note.type !== "pdf" && (
          <>
            {error && (
              <p className="p-6 text-sm text-red-600">
                No pudimos cargar el contenido de este apunte.
              </p>
            )}

            {!error && content === null && (
              <div className="p-6">
                <Skeleton className="h-96 w-full" />
              </div>
            )}

            {!error && content !== null && note.type === "markdown" && (
              <MarkdownWithToc content={content} />
            )}

            {!error && content !== null && note.type === "html" && (
              <HtmlViewer content={content} />
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function NotePage() {
  return (
    <Suspense>
      <NotePageInner />
    </Suspense>
  );
}
