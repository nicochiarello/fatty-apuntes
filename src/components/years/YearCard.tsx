"use client";

import Link from "next/link";
import { GraduationCap, Trash2 } from "lucide-react";
import type { Year } from "@/types";
import { Card } from "@/components/ui/card";

export function YearCard({ year, onDelete }: { year: Year; onDelete: () => void }) {
  return (
    <div className="group relative min-w-0">
      <Link href={`/dashboard/year?id=${year.id}`} className="block">
        <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <GraduationCap className="size-5" />
          </span>
          <h3 className="font-display text-lg font-semibold">{year.name}</h3>
        </Card>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={`Eliminar ${year.name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
