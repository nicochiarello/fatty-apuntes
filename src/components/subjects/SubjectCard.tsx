"use client";

import Link from "next/link";
import { BookOpenText, Trash2 } from "lucide-react";
import type { Subject } from "@/types";
import { Card } from "@/components/ui/card";

export function SubjectCard({
  subject,
  yearId,
  onDelete,
}: {
  subject: Subject;
  yearId: string;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <Link href={`/dashboard/subject?year=${yearId}&id=${subject.id}`}>
        <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <BookOpenText className="size-5" />
          </span>
          <h3 className="font-display text-lg font-semibold">{subject.name}</h3>
        </Card>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={`Eliminar ${subject.name}`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
