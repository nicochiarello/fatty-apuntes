import {
  Atom,
  BookOpenText,
  Briefcase,
  Building2,
  Calculator,
  Code2,
  Cpu,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Music4,
  Palette,
  PenTool,
  Scale,
  type LucideIcon,
} from "lucide-react";

export const SUBJECT_ICONS: { key: string; icon: LucideIcon }[] = [
  { key: "book", icon: BookOpenText },
  { key: "calculator", icon: Calculator },
  { key: "flask", icon: FlaskConical },
  { key: "code", icon: Code2 },
  { key: "globe", icon: Globe2 },
  { key: "landmark", icon: Landmark },
  { key: "palette", icon: Palette },
  { key: "music", icon: Music4 },
  { key: "dna", icon: Dna },
  { key: "atom", icon: Atom },
  { key: "pen", icon: PenTool },
  { key: "scale", icon: Scale },
  { key: "cpu", icon: Cpu },
  { key: "building", icon: Building2 },
  { key: "languages", icon: Languages },
  { key: "briefcase", icon: Briefcase },
];

export const DEFAULT_SUBJECT_ICON = "book";

export const SUBJECT_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  SUBJECT_ICONS.map(({ key, icon }) => [key, icon]),
);

export const SUBJECT_COLORS: { key: string; bg: string; text: string; swatch: string }[] = [
  { key: "amber", bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", swatch: "bg-amber-500" },
  { key: "teal", bg: "bg-teal-500/15", text: "text-teal-600 dark:text-teal-400", swatch: "bg-teal-500" },
  { key: "blue", bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", swatch: "bg-blue-500" },
  { key: "violet", bg: "bg-violet-500/15", text: "text-violet-600 dark:text-violet-400", swatch: "bg-violet-500" },
  { key: "pink", bg: "bg-pink-500/15", text: "text-pink-600 dark:text-pink-400", swatch: "bg-pink-500" },
  { key: "rose", bg: "bg-rose-500/15", text: "text-rose-600 dark:text-rose-400", swatch: "bg-rose-500" },
  { key: "emerald", bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400", swatch: "bg-emerald-500" },
  { key: "slate", bg: "bg-slate-500/15", text: "text-slate-600 dark:text-slate-400", swatch: "bg-slate-500" },
];

export const DEFAULT_SUBJECT_COLOR = "amber";

export const SUBJECT_COLOR_MAP: Record<string, (typeof SUBJECT_COLORS)[number]> =
  Object.fromEntries(SUBJECT_COLORS.map((c) => [c.key, c]));
