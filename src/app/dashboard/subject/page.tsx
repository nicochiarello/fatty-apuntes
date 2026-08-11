"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { getYear } from "@/lib/firebase/years";
import { getSubject } from "@/lib/firebase/subjects";
import { subscribeNotes, deleteNote } from "@/lib/firebase/notes";
import type { Note, Subject, Year } from "@/types";
import { NoteCard } from "@/components/notes/NoteCard";
import { UploadNoteDialog } from "@/components/notes/UploadNoteDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";

function SubjectPageInner() {
  const searchParams = useSearchParams();
  const yearId = searchParams.get("year") ?? "";
  const subjectId = searchParams.get("id") ?? "";
  const [year, setYear] = useState<Year | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  useEffect(() => {
    if (!yearId || !subjectId) return;
    getYear(yearId).then(setYear);
    getSubject(subjectId).then(setSubject);
    return subscribeNotes(subjectId, setNotes);
  }, [yearId, subjectId]);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: year?.name ?? "…", href: `/dashboard/year?id=${yearId}` },
          { label: subject?.name ?? "…" },
        ]}
      />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {subject?.name ?? "Cargando…"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Apuntes subidos por el grupo.</p>
        </div>
        <UploadNoteDialog yearId={yearId} subjectId={subjectId} />
      </div>

      {notes === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      )}

      {notes !== null && notes.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Todavía no hay apuntes"
          description="Subí el primer .md o .html de esta materia."
          action={<UploadNoteDialog yearId={yearId} subjectId={subjectId} />}
        />
      )}

      {notes !== null && notes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
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

export default function SubjectPage() {
  return (
    <Suspense>
      <SubjectPageInner />
    </Suspense>
  );
}
