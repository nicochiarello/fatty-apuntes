"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { getYear } from "@/lib/firebase/years";
import { getSubject } from "@/lib/firebase/subjects";
import { getFolder } from "@/lib/firebase/folders";
import { subscribeNotes, deleteNote } from "@/lib/firebase/notes";
import type { Folder, Note, Subject, Year } from "@/types";
import { NoteCard } from "@/components/notes/NoteCard";
import { UploadNoteDialog } from "@/components/notes/UploadNoteDialog";
import { NewNoteDialog } from "@/components/notes/NewNoteDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";

function FolderPageInner() {
  const searchParams = useSearchParams();
  const yearId = searchParams.get("year") ?? "";
  const subjectId = searchParams.get("subject") ?? "";
  const folderId = searchParams.get("id") ?? "";

  const [year, setYear] = useState<Year | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [folder, setFolder] = useState<Folder | null | undefined>(undefined);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  useEffect(() => {
    if (!yearId || !subjectId || !folderId) return;
    getYear(yearId).then(setYear);
    getSubject(subjectId).then(setSubject);
    getFolder(folderId).then(setFolder);
    return subscribeNotes(subjectId, setNotes);
  }, [yearId, subjectId, folderId]);

  const folderNotes = notes?.filter((note) => note.folderId === folderId) ?? null;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: year?.name ?? "…", href: `/dashboard/year?id=${yearId}` },
          { label: subject?.name ?? "…", href: `/dashboard/subject?year=${yearId}&id=${subjectId}` },
          { label: folder?.name ?? "…" },
        ]}
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold break-words sm:text-3xl">
            {folder?.name ?? "Cargando…"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subject ? `Carpeta dentro de ${subject.name}` : "Apuntes de la carpeta."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NewNoteDialog yearId={yearId} subjectId={subjectId} folderId={folderId} />
          <UploadNoteDialog yearId={yearId} subjectId={subjectId} folderId={folderId} />
        </div>
      </div>

      {folder === null && (
        <p className="text-muted-foreground">Esta carpeta no existe o fue eliminada.</p>
      )}

      {folderNotes === null && folder !== null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}

      {folderNotes !== null && folderNotes.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Todavía no hay apuntes en esta carpeta"
          description="Subí el primer apunte para esta carpeta."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <NewNoteDialog yearId={yearId} subjectId={subjectId} folderId={folderId} />
              <UploadNoteDialog yearId={yearId} subjectId={subjectId} folderId={folderId} />
            </div>
          }
        />
      )}

      {folderNotes !== null && folderNotes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folderNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              yearId={yearId}
              onDelete={() => setNoteToDelete(note)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!noteToDelete}
        onOpenChange={(open) => !open && setNoteToDelete(null)}
        title={`Eliminar "${noteToDelete?.title}"`}
        description="Esta acción no se puede deshacer."
        onConfirm={async () => {
          if (noteToDelete) {
            await deleteNote(noteToDelete);
            toast.success("Apunte eliminado");
          }
        }}
      />
    </div>
  );
}

export default function FolderPage() {
  return (
    <Suspense>
      <FolderPageInner />
    </Suspense>
  );
}
