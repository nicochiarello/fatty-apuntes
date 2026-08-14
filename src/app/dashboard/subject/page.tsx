"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, FolderPlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { getYear } from "@/lib/firebase/years";
import { getSubject } from "@/lib/firebase/subjects";
import { subscribeFolders, deleteFolder } from "@/lib/firebase/folders";
import { subscribeNotes, deleteNote } from "@/lib/firebase/notes";
import type { Folder, Note, Subject, Year } from "@/types";
import { NoteCard } from "@/components/notes/NoteCard";
import { UploadNoteDialog } from "@/components/notes/UploadNoteDialog";
import { NewNoteDialog } from "@/components/notes/NewNoteDialog";
import { FolderCard } from "@/components/folders/FolderCard";
import { FolderDialog } from "@/components/folders/FolderDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function SubjectPageInner() {
  const searchParams = useSearchParams();
  const yearId = searchParams.get("year") ?? "";
  const subjectId = searchParams.get("id") ?? "";
  const [year, setYear] = useState<Year | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  useEffect(() => {
    if (!yearId || !subjectId) return;
    getYear(yearId).then(setYear);
    getSubject(subjectId).then(setSubject);
    const unsubFolders = subscribeFolders(subjectId, setFolders);
    const unsubNotes = subscribeNotes(subjectId, setNotes);
    return () => {
      unsubFolders();
      unsubNotes();
    };
  }, [yearId, subjectId]);

  const rootNotes = notes?.filter((note) => !note.folderId) ?? null;
  const isEmpty = folders !== null && rootNotes !== null && folders.length === 0 && rootNotes.length === 0;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: year?.name ?? "…", href: `/dashboard/year?id=${yearId}` },
          { label: subject?.name ?? "…" },
        ]}
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold break-words sm:text-3xl">
            {subject?.name ?? "Cargando…"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Apuntes subidos por el grupo.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <FolderDialog
            yearId={yearId}
            subjectId={subjectId}
            trigger={
              <Button variant="outline">
                <FolderPlus className="size-4" />
                Nueva carpeta
              </Button>
            }
          />
          <NewNoteDialog yearId={yearId} subjectId={subjectId} />
          <UploadNoteDialog yearId={yearId} subjectId={subjectId} />
        </div>
      </div>

      {(folders === null || rootNotes === null) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}

      {isEmpty && (
        <EmptyState
          icon={FileText}
          title="Todavía no hay nada acá"
          description="Creá una carpeta para organizar (TPs, exámenes…) o subí directamente un apunte."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <FolderDialog
                yearId={yearId}
                subjectId={subjectId}
                trigger={
                  <Button variant="outline">
                    <FolderPlus className="size-4" />
                    Nueva carpeta
                  </Button>
                }
              />
              <NewNoteDialog yearId={yearId} subjectId={subjectId} />
              <UploadNoteDialog yearId={yearId} subjectId={subjectId} />
            </div>
          }
        />
      )}

      {folders !== null && folders.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              yearId={yearId}
              subjectId={subjectId}
              onDelete={() => setFolderToDelete(folder)}
            />
          ))}
        </div>
      )}

      {rootNotes !== null && rootNotes.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rootNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              yearId={yearId}
              onDelete={() => setNoteToDelete(note)}
            />
          ))}
        </div>
      )}

      {folders !== null && rootNotes !== null && folders.length > 0 && rootNotes.length === 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Upload className="size-3.5" />
          No hay apuntes sueltos — todo está organizado en carpetas.
        </p>
      )}

      <ConfirmDialog
        open={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
        title={`Eliminar "${folderToDelete?.name}"`}
        description="Se elimina la carpeta; los apuntes que tenía adentro se mueven a la materia (no se borran)."
        onConfirm={async () => {
          if (folderToDelete) {
            await deleteFolder(folderToDelete.id);
            toast.success("Carpeta eliminada");
          }
        }}
      />

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

export default function SubjectPage() {
  return (
    <Suspense>
      <SubjectPageInner />
    </Suspense>
  );
}
