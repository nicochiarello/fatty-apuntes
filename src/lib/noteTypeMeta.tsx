import { File, FileCode2, FileText, type LucideIcon } from "lucide-react";
import type { NoteType } from "@/types";
import type { BadgeProps } from "@/components/ui/badge";

export const NOTE_TYPE_META: Record<
  NoteType,
  { label: string; icon: LucideIcon; badgeVariant: BadgeProps["variant"] }
> = {
  markdown: { label: "Markdown", icon: FileText, badgeVariant: "default" },
  html: { label: "HTML", icon: FileCode2, badgeVariant: "accent" },
  pdf: { label: "PDF", icon: File, badgeVariant: "muted" },
};
