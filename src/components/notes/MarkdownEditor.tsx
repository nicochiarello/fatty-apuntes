"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateNoteContent, uploadNoteImage } from "@/lib/firebase/notes";
import type { Note } from "@/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/layout/ConfirmDialog";
import { CodeMirrorEditor } from "@/components/notes/editor/CodeMirrorEditor";
import { Toolbar } from "@/components/notes/editor/Toolbar";
import { insertImageMarkdown } from "@/components/notes/editor/commands";

const NO_FORMATS: Set<string> = new Set();

export function MarkdownEditor({
  note,
  initialContent,
  onSaved,
  onClose,
}: {
  note: Note;
  initialContent: string;
  /** Called after a successful save with the stored text and the note's refreshed fields. */
  onSaved: (content: string, note: Note) => void;
  onClose: () => void;
}) {
  const [view, setView] = useState<EditorView | null>(null);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(NO_FORMATS);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // The editor owns the document; React only mirrors it for the save call, so this stays a
  // ref instead of state — re-rendering on every keystroke would buy nothing.
  const contentRef = useRef(initialContent);
  // What Storage currently holds. Saving moves this baseline forward instead of remounting
  // the editor, so a mid-writing ⌘S keeps the caret and the undo history.
  const savedRef = useRef(initialContent);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const content = contentRef.current;
      const { downloadURL, size } = await updateNoteContent(note, content);
      savedRef.current = content;
      // The user may have kept typing while the upload was in flight.
      setDirty(contentRef.current !== content);
      toast.success("Apunte guardado");
      onSaved(content, { ...note, downloadURL, size });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos guardar el apunte");
    } finally {
      setSaving(false);
    }
  }, [note, onSaved, saving]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (!view) return;
      setUploading(true);
      try {
        // Sequential on purpose: each upload inserts at the caret, and parallel uploads
        // would race to write into the same spot in whatever order they finished.
        for (const file of files) {
          try {
            const url = await uploadNoteImage(note, file);
            const alt = file.name.replace(/\.[^/.]+$/, "") || "imagen";
            insertImageMarkdown(view, url, alt);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : `No pudimos subir ${file.name}`);
          }
        }
      } finally {
        setUploading(false);
      }
    },
    [note, view],
  );

  const handleClose = () => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  // Leaving the tab mid-edit would silently drop the work — Storage only has what was
  // last saved.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Toolbar
        view={view}
        activeFormats={activeFormats}
        onPickImages={handleFiles}
        uploadingImage={uploading}
      />

      <div className="min-h-0 flex-1">
        <CodeMirrorEditor
          initialValue={initialContent}
          onChange={(value) => {
            contentRef.current = value;
            setDirty(value !== savedRef.current);
          }}
          onReady={setView}
          onActiveFormats={setActiveFormats}
          onFiles={handleFiles}
          onSave={handleSave}
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background px-4 py-2.5 sm:px-6">
        <p className="truncate text-xs text-muted-foreground">
          {saving
            ? "Guardando…"
            : dirty
              ? "Cambios sin guardar"
              : "Todo guardado"}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            {dirty ? "Descartar" : "Cerrar"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Guardar
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Descartar cambios"
        description="Perdés todo lo que escribiste desde la última vez que guardaste."
        confirmLabel="Descartar"
        onConfirm={onClose}
      />
    </div>
  );
}
