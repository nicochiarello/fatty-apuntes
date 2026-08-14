"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronLeft, Download, Pencil, PenLine, Presentation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { getSubject } from "@/lib/firebase/subjects";
import { getNote, downloadNote } from "@/lib/firebase/notes";
import { downloadMarkdownAsPdf } from "@/lib/markdownPdf";
import { NOTE_TYPE_META } from "@/lib/noteTypeMeta";
import type { Note, Subject } from "@/types";
import { MarkdownWithToc } from "@/components/notes/MarkdownWithToc";
import { MarkdownEditor } from "@/components/notes/MarkdownEditor";
import { HtmlViewer } from "@/components/notes/HtmlViewer";
import { PdfViewer } from "@/components/notes/PdfViewer";
import { DocxViewer } from "@/components/notes/DocxViewer";
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
  // NewNoteDialog lands here with ?edit=1 so a freshly created note opens straight in the
  // editor. Kept derived rather than seeded into useState: the prerendered HTML has no
  // query string, so an initial-state read would miss the flag and never recover.
  // `setEditing` overrides it once the reader opens or closes the editor by hand.
  const [editRequest, setEditRequest] = useState<boolean | null>(null);
  const editing = editRequest ?? searchParams.get("edit") === "1";
  const setEditing = setEditRequest;

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
    // These render (or don't) straight from note.downloadURL — DocxViewer/PdfViewer do
    // their own fetching, and pptx has no preview at all — so no need to fetch text here.
    if (!note || note.type === "pdf" || note.type === "docx" || note.type === "pptx") return;
    fetch(note.downloadURL)
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.text();
      })
      .then(setContent)
      .catch(() => setError(true));
  }, [note]);

  useEffect(() => {
    if (!note) return;
    document.title = note.title;
    return () => {
      document.title = "Fatty Apuntes";
    };
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
    if (!note || content === null) return;
    setDownloading(true);
    try {
      const filename = `${note.title.replace(/[/\\]/g, "-")}.pdf`;
      await downloadMarkdownAsPdf(content, filename);
    } catch {
      toast.error("No pudimos generar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  const backHref = note?.folderId
    ? `/dashboard/folder?year=${yearId}&subject=${subjectId}&id=${note.folderId}`
    : `/dashboard/subject?year=${yearId}&id=${subjectId}`;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6 print:hidden">
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
              {note.type === "markdown" && !editing && content !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="h-8 px-2.5"
                >
                  <PenLine className="size-4" />
                  <span className="hidden sm:inline">Editar texto</span>
                </Button>
              )}
              {/* Replacing the file or downloading it mid-edit would race the editor's own
                  save against Storage, so those actions step aside while editing. */}
              {!editing && (
                <EditNoteDialog
                  note={note}
                  onUpdated={refreshNote}
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 px-2.5">
                      <Pencil className="size-4" />
                      <span className="hidden sm:inline">Detalles</span>
                    </Button>
                  }
                />
              )}
              {editing ? null : note.type === "markdown" ? (
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

      <div className="min-h-0 flex-1 print:block print:h-auto print:overflow-visible">
        {note === undefined && (
          <div className="p-6">
            <Skeleton className="h-96 w-full" />
          </div>
        )}

        {note === null && (
          <p className="p-6 text-muted-foreground">Este apunte no existe o fue eliminado.</p>
        )}

        {note && note.type === "pdf" && <PdfViewer url={note.downloadURL} />}

        {note && note.type === "docx" && <DocxViewer url={note.downloadURL} />}

        {note && note.type === "pptx" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
            <Presentation className="size-10" />
            <p className="max-w-sm text-sm">
              Los PowerPoint todavía no tienen vista previa — descargalo con el botón de
              arriba para verlo.
            </p>
          </div>
        )}

        {note && (note.type === "markdown" || note.type === "html") && (
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

            {!error && content !== null && note.type === "markdown" && !editing && (
              <MarkdownWithToc content={content} />
            )}

            {!error && content !== null && note.type === "markdown" && editing && (
              <MarkdownEditor
                note={note}
                initialContent={content}
                onSaved={(saved, updated) => {
                  setContent(saved);
                  setNote(updated);
                }}
                onClose={() => setEditing(false)}
              />
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
