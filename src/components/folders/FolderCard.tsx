"use client";

import Link from "next/link";
import { Folder as FolderIcon, Pencil, Trash2 } from "lucide-react";
import type { Folder } from "@/types";
import { Card } from "@/components/ui/card";
import { FolderDialog } from "@/components/folders/FolderDialog";

export function FolderCard({
  folder,
  yearId,
  subjectId,
  onDelete,
}: {
  folder: Folder;
  yearId: string;
  subjectId: string;
  onDelete: () => void;
}) {
  return (
    <div className="group relative min-w-0">
      <Link href={`/dashboard/folder?year=${yearId}&subject=${subjectId}&id=${folder.id}`} className="block">
        <Card className="flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <FolderIcon className="size-5" />
          </span>
          <h3 className="font-display text-lg font-semibold">{folder.name}</h3>
        </Card>
      </Link>
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <FolderDialog
          yearId={yearId}
          subjectId={subjectId}
          folder={folder}
          trigger={
            <button
              type="button"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
              aria-label={`Editar ${folder.name}`}
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
          aria-label={`Eliminar ${folder.name}`}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
