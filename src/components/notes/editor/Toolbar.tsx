"use client";

import { useRef, type ComponentType } from "react";
import { redo, undo } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Redo2,
  SquareCode,
  Strikethrough,
  Table,
  TextQuote,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  insertCodeBlock,
  insertHorizontalRule,
  insertLink,
  insertTable,
  toggleBulletList,
  toggleHeading,
  toggleOrderedList,
  toggleQuote,
  toggleTaskList,
  toggleWrap,
} from "./commands";

interface ToolbarAction {
  label: string;
  shortcut?: string;
  icon: ComponentType<{ className?: string }>;
  run: (view: EditorView) => void;
  /** Syntax-tree node names that mean this action is currently applied. */
  activeWhen?: string[];
}

const GROUPS: ToolbarAction[][] = [
  [
    {
      label: "Negrita",
      shortcut: "⌘B",
      icon: Bold,
      run: (view) => toggleWrap(view, "**"),
      activeWhen: ["StrongEmphasis"],
    },
    {
      label: "Itálica",
      shortcut: "⌘I",
      icon: Italic,
      run: (view) => toggleWrap(view, "*"),
      activeWhen: ["Emphasis"],
    },
    {
      label: "Tachado",
      shortcut: "⌘⇧X",
      icon: Strikethrough,
      run: (view) => toggleWrap(view, "~~"),
      activeWhen: ["Strikethrough"],
    },
    {
      label: "Código",
      shortcut: "⌘E",
      icon: Code,
      run: (view) => toggleWrap(view, "`"),
      activeWhen: ["InlineCode"],
    },
  ],
  [
    {
      label: "Título 1",
      shortcut: "⌘⇧1",
      icon: Heading1,
      run: (view) => toggleHeading(view, 1),
      activeWhen: ["ATXHeading1"],
    },
    {
      label: "Título 2",
      shortcut: "⌘⇧2",
      icon: Heading2,
      run: (view) => toggleHeading(view, 2),
      activeWhen: ["ATXHeading2"],
    },
    {
      label: "Título 3",
      shortcut: "⌘⇧3",
      icon: Heading3,
      run: (view) => toggleHeading(view, 3),
      activeWhen: ["ATXHeading3"],
    },
  ],
  [
    {
      label: "Lista",
      shortcut: "⌘⇧8",
      icon: List,
      run: toggleBulletList,
      activeWhen: ["BulletList"],
    },
    { label: "Lista numerada", icon: ListOrdered, run: toggleOrderedList, activeWhen: ["OrderedList"] },
    {
      label: "Checklist",
      shortcut: "⌘⇧L",
      icon: ListTodo,
      run: toggleTaskList,
      activeWhen: ["TaskList"],
    },
    {
      label: "Cita",
      shortcut: "⌘⇧9",
      icon: TextQuote,
      run: toggleQuote,
      activeWhen: ["Blockquote"],
    },
  ],
  [
    { label: "Enlace", shortcut: "⌘K", icon: Link, run: insertLink, activeWhen: ["Link"] },
    { label: "Bloque de código", icon: SquareCode, run: insertCodeBlock, activeWhen: ["FencedCode"] },
    { label: "Tabla", icon: Table, run: insertTable, activeWhen: ["Table"] },
    { label: "Separador", icon: Minus, run: insertHorizontalRule },
  ],
];

function ToolbarButton({
  action,
  view,
  active,
}: {
  action: ToolbarAction;
  view: EditorView | null;
  active: boolean;
}) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      // mousedown would move focus out of the editor before the command runs, losing the
      // selection the command is meant to act on.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => view && action.run(view)}
      disabled={!view}
      title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
      aria-label={action.label}
      aria-pressed={active}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40",
        active && "bg-primary/12 text-primary",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

export function Toolbar({
  view,
  activeFormats,
  onPickImages,
  uploadingImage,
}: {
  view: EditorView | null;
  activeFormats: Set<string>;
  onPickImages: (files: File[]) => void;
  uploadingImage: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border bg-background px-2 py-1.5 sm:px-4">
      {GROUPS.map((group, index) => (
        <div key={index} className="flex items-center gap-0.5">
          {index > 0 && <span className="mx-1 h-5 w-px shrink-0 bg-border" />}
          {group.map((action) => (
            <ToolbarButton
              key={action.label}
              action={action}
              view={view}
              active={!!action.activeWhen?.some((name) => activeFormats.has(name))}
            />
          ))}
        </div>
      ))}

      <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        disabled={!view || uploadingImage}
        title="Insertar imagen"
        aria-label="Insertar imagen"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <ImageIcon className={cn("size-4", uploadingImage && "animate-pulse")} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onPickImages(files);
          // Reset so picking the same file twice in a row still fires a change event.
          event.target.value = "";
        }}
      />

      <span className="mx-1 h-5 w-px shrink-0 bg-border" />
      <ToolbarButton
        action={{ label: "Deshacer", shortcut: "⌘Z", icon: Undo2, run: (v) => void undo(v) }}
        view={view}
        active={false}
      />
      <ToolbarButton
        action={{ label: "Rehacer", shortcut: "⌘⇧Z", icon: Redo2, run: (v) => void redo(v) }}
        view={view}
        active={false}
      />
    </div>
  );
}
