"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { subscribeYears, deleteYear } from "@/lib/firebase/years";
import type { Year } from "@/types";
import { YearCard } from "@/components/years/YearCard";
import { CreateYearDialog } from "@/components/years/CreateYearDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [years, setYears] = useState<Year[] | null>(null);
  const [yearToDelete, setYearToDelete] = useState<Year | null>(null);

  useEffect(() => {
    return subscribeYears(setYears);
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Tus años</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Elegí un año para ver sus materias y apuntes.
          </p>
        </div>
        <CreateYearDialog />
      </div>

      {years === null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {years !== null && years.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="Todavía no hay años cargados"
          description="Creá el primero para empezar a organizar los apuntes del grupo."
          action={<CreateYearDialog />}
        />
      )}

      {years !== null && years.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((year) => (
            <YearCard key={year.id} year={year} onDelete={() => setYearToDelete(year)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!yearToDelete}
        onOpenChange={(open) => !open && setYearToDelete(null)}
        title={`Eliminar "${yearToDelete?.name}"`}
        description="Se eliminará el año. Las materias y apuntes que contenga no se borrarán automáticamente."
        onConfirm={async () => {
          if (yearToDelete) {
            await deleteYear(yearToDelete.id);
            toast.success("Año eliminado");
          }
        }}
      />
    </div>
  );
}
