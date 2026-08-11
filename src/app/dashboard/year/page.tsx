"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpenText } from "lucide-react";
import { toast } from "sonner";
import { getYear } from "@/lib/firebase/years";
import { subscribeSubjects, deleteSubject } from "@/lib/firebase/subjects";
import type { Subject, Year } from "@/types";
import { SubjectCard } from "@/components/subjects/SubjectCard";
import { CreateSubjectDialog } from "@/components/subjects/CreateSubjectDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";

function YearPageInner() {
  const searchParams = useSearchParams();
  const yearId = searchParams.get("id") ?? "";
  const [year, setYear] = useState<Year | null>(null);
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  useEffect(() => {
    if (!yearId) return;
    getYear(yearId).then(setYear);
    return subscribeSubjects(yearId, setSubjects);
  }, [yearId]);

  return (
    <div>
      <Breadcrumbs items={[{ label: year?.name ?? "…" }]} />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {year?.name ?? "Cargando…"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Elegí una materia para ver sus apuntes.
          </p>
        </div>
        <CreateSubjectDialog yearId={yearId} />
      </div>

      {subjects === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {subjects !== null && subjects.length === 0 && (
        <EmptyState
          icon={BookOpenText}
          title="Todavía no hay materias"
          description="Creá la primera materia de este año."
          action={<CreateSubjectDialog yearId={yearId} />}
        />
      )}

      {subjects !== null && subjects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              yearId={yearId}
              onDelete={() => setSubjectToDelete(subject)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!subjectToDelete}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
        title={`Eliminar "${subjectToDelete?.name}"`}
        description="Se eliminará la materia. Los apuntes que contenga no se borrarán automáticamente."
        onConfirm={async () => {
          if (subjectToDelete) {
            await deleteSubject(subjectToDelete.id);
            toast.success("Materia eliminada");
          }
        }}
      />
    </div>
  );
}

export default function YearPage() {
  return (
    <Suspense>
      <YearPageInner />
    </Suspense>
  );
}
