"use client";

import Link from "next/link";
import { BookOpenText, Pencil, Trash2 } from "lucide-react";
import type { Subject } from "@/types";
import { SUBJECT_COLOR_MAP, SUBJECT_COLORS, SUBJECT_ICON_MAP } from "@/lib/subjectAppearance";
import { Card } from "@/components/ui/card";
import { SubjectDialog } from "@/components/subjects/SubjectDialog";

export function SubjectCard({
  subject,
  yearId,
  onDelete,
}: {
  subject: Subject;
  yearId: string;
  onDelete: () => void;
}) {
  const Icon = SUBJECT_ICON_MAP[subject.icon] ?? BookOpenText;
  const color = SUBJECT_COLOR_MAP[subject.color] ?? SUBJECT_COLORS[0];

  return (
    <div className="group relative">
      <Link href={`/dashboard/subject?year=${yearId}&id=${subject.id}`}>
        <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
          <span className={`flex size-11 items-center justify-center rounded-xl ${color.bg} ${color.text}`}>
            <Icon className="size-5" />
          </span>
          <h3 className="font-display text-lg font-semibold">{subject.name}</h3>
        </Card>
      </Link>
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <SubjectDialog
          yearId={yearId}
          subject={subject}
          trigger={
            <button
              type="button"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
              aria-label={`Editar ${subject.name}`}
            >
              <Pencil className="size-4" />
            </button>
          }
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
          aria-label={`Eliminar ${subject.name}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
