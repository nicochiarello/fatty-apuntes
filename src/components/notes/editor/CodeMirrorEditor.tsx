"use client";

import { useEffect, useRef } from "react";
import { markdown, markdownKeymap, markdownLanguage, pasteURLAsLink } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, dropCursor, keymap, placeholder } from "@codemirror/view";
import { livePreview } from "./livePreview";
import { tableView } from "./tableView";
import { editorTheme } from "./theme";
import {
  activeFormats,
  insertLink,
  toggleBulletList,
  toggleHeading,
  toggleQuote,
  toggleTaskList,
  toggleWrap,
} from "./commands";

/**
 * Thin React wrapper around a CodeMirror 6 instance. The document is the markdown source
 * verbatim; `livePreview` only decorates it, so what gets saved is exactly what was typed.
 */
export function CodeMirrorEditor({
  initialValue,
  onChange,
  onReady,
  onFiles,
  onSave,
  onActiveFormats,
}: {
  initialValue: string;
  onChange: (value: string) => void;
  /** Receives the view so the toolbar can dispatch commands against it. */
  onReady?: (view: EditorView | null) => void;
  /** Images pasted or dropped into the editor, for the host to upload. */
  onFiles?: (files: File[]) => void;
  onSave?: () => void;
  /** Markdown constructs wrapping the caret, so the toolbar can light up. */
  onActiveFormats?: (formats: Set<string>) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Held in refs so changing a callback never tears down and rebuilds the editor, which
  // would drop the undo history and the caret.
  const onChangeRef = useRef(onChange);
  const onFilesRef = useRef(onFiles);
  const onSaveRef = useRef(onSave);
  const onActiveFormatsRef = useRef(onActiveFormats);

  useEffect(() => {
    onChangeRef.current = onChange;
    onFilesRef.current = onFiles;
    onSaveRef.current = onSave;
    onActiveFormatsRef.current = onActiveFormats;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const imageFilesFrom = (list: FileList | null | undefined) =>
      Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialValue,
        extensions: [
          history(),
          drawSelection(),
          dropCursor(),
          EditorView.lineWrapping,
          EditorState.allowMultipleSelections.of(true),
          markdown({ base: markdownLanguage, addKeymap: false }),
          livePreview,
          tableView,
          editorTheme,
          placeholder("Escribí tu apunte…"),
          keymap.of([
            { key: "Mod-b", run: (v) => (toggleWrap(v, "**"), true) },
            { key: "Mod-i", run: (v) => (toggleWrap(v, "*"), true) },
            { key: "Mod-Shift-x", run: (v) => (toggleWrap(v, "~~"), true) },
            { key: "Mod-e", run: (v) => (toggleWrap(v, "`"), true) },
            { key: "Mod-k", run: (v) => (insertLink(v), true) },
            { key: "Mod-Shift-1", run: (v) => (toggleHeading(v, 1), true) },
            { key: "Mod-Shift-2", run: (v) => (toggleHeading(v, 2), true) },
            { key: "Mod-Shift-3", run: (v) => (toggleHeading(v, 3), true) },
            { key: "Mod-Shift-8", run: (v) => (toggleBulletList(v), true) },
            { key: "Mod-Shift-9", run: (v) => (toggleQuote(v), true) },
            { key: "Mod-Shift-l", run: (v) => (toggleTaskList(v), true) },
            { key: "Mod-s", run: () => (onSaveRef.current?.(), true) },
            // markdownKeymap continues lists and quotes on Enter; it comes before the
            // default keymap so its Enter handler wins.
            ...markdownKeymap,
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          pasteURLAsLink,
          EditorView.domEventHandlers({
            paste(event) {
              const files = imageFilesFrom(event.clipboardData?.files);
              if (files.length === 0) return false;
              event.preventDefault();
              onFilesRef.current?.(files);
              return true;
            },
            drop(event) {
              const files = imageFilesFrom(event.dataTransfer?.files);
              if (files.length === 0) return false;
              event.preventDefault();
              onFilesRef.current?.(files);
              return true;
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) {
              onActiveFormatsRef.current?.(activeFormats(update.state));
            }
          }),
        ],
      }),
    });

    viewRef.current = view;
    onReady?.(view);

    return () => {
      onReady?.(null);
      viewRef.current = null;
      view.destroy();
    };
    // Mounted once: `initialValue` seeds the document and is then owned by CodeMirror.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="h-full min-h-0 overflow-hidden" />;
}
