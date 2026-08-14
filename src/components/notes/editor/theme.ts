import { EditorView } from "@codemirror/view";

/**
 * Every colour here goes through the CSS variables defined in globals.css, so the editor
 * follows the app's `prefers-color-scheme` palette without needing its own dark theme.
 */
export const editorTheme = EditorView.theme({
  "&": {
    color: "var(--foreground)",
    backgroundColor: "transparent",
    fontSize: "1rem",
    height: "100%",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    lineHeight: "1.75",
    overflowY: "auto",
  },
  ".cm-content": {
    padding: "2.5rem 0 40vh",
    maxWidth: "48rem",
    margin: "0 auto",
    caretColor: "var(--primary)",
  },
  ".cm-line": {
    padding: "0 1.5rem",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "var(--primary)",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--primary) 22%, transparent)",
  },
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },

  // Syntax markers: dimmed while the caret is on their line, hidden otherwise (see
  // livePreview.ts). They keep their slot in the layout so revealing shifts text as
  // little as possible.
  ".cm-md-marker": {
    color: "var(--muted-foreground)",
    opacity: "0.5",
  },

  // Spacing above a heading has to be padding, never margin: CodeMirror builds its height
  // map from each line element's own box, and a margin sits outside that box — so margins
  // desynchronise the height map from the real layout and clicks start landing on the
  // wrong line, drifting further with every heading in the note.
  ".cm-md-heading": {
    fontFamily: "var(--font-baloo), var(--font-inter), sans-serif",
    fontWeight: "700",
    lineHeight: "1.3",
  },
  ".cm-line.cm-md-h1": { fontSize: "1.75em", paddingTop: "0.6em" },
  ".cm-line.cm-md-h2": { fontSize: "1.45em", paddingTop: "0.5em" },
  ".cm-line.cm-md-h3": { fontSize: "1.22em", paddingTop: "0.4em" },
  ".cm-line.cm-md-h4": { fontSize: "1.08em" },
  ".cm-line.cm-md-h5": { fontSize: "1em" },
  ".cm-line.cm-md-h6": { fontSize: "1em", color: "var(--muted-foreground)" },

  ".cm-md-strong": { fontWeight: "700" },
  ".cm-md-emphasis": { fontStyle: "italic" },
  ".cm-md-strike": { textDecoration: "line-through", color: "var(--muted-foreground)" },

  ".cm-md-inline-code": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.9em",
    backgroundColor: "var(--muted)",
    borderRadius: "0.3rem",
    padding: "0.1em 0.3em",
  },
  ".cm-md-code-line": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.9em",
    backgroundColor: "var(--muted)",
  },
  ".cm-md-code-info": { color: "var(--muted-foreground)" },

  ".cm-md-quote": {
    borderLeft: "3px solid var(--primary)",
    color: "var(--muted-foreground)",
    fontStyle: "italic",
  },

  ".cm-md-list-mark": { color: "var(--primary)", fontWeight: "700" },

  ".cm-md-link": {
    color: "var(--primary)",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    cursor: "text",
  },
  ".cm-md-url": { color: "var(--muted-foreground)" },

  // Raw pipes, shown only while the caret is inside the table and it reads as source.
  ".cm-md-table-delimiter": { color: "var(--muted-foreground)", opacity: "0.6" },
  ".cm-md-table-header": { fontWeight: "600" },

  // The interactive table (see tableView.ts). The wrapper stays overflow-visible so the
  // popup menus escape it; the inner scroller is what keeps a wide table from forcing the
  // whole editor to scroll sideways.
  ".cm-md-table-wrap": {
    position: "relative",
    margin: "0.25rem 0",
    paddingRight: "1.5rem",
    paddingBottom: "1.5rem",
  },
  ".cm-md-table-scroll": {
    overflowX: "auto",
  },

  ".cm-md-table-slot": {
    position: "relative",
  },
  ".cm-md-table-cell": {
    outline: "none",
    minWidth: "3rem",
    minHeight: "1.4em",
  },
  ".cm-md-table-cell:focus": {
    boxShadow: "inset 0 0 0 2px var(--ring)",
    borderRadius: "0.2rem",
  },

  // Row/column menu triggers. Revealed on hover so the table reads cleanly at rest, but
  // drawn as an actual bordered button — as a borderless glyph they were easy to miss.
  ".cm-md-table-handle": {
    position: "absolute",
    top: "0.2rem",
    right: "0.2rem",
    width: "1.3rem",
    height: "1.3rem",
    lineHeight: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--border)",
    borderRadius: "0.3rem",
    background: "var(--card)",
    color: "var(--muted-foreground)",
    cursor: "pointer",
    opacity: "0",
    transition: "opacity 120ms",
    fontSize: "0.65rem",
    padding: "0",
  },
  ".cm-md-table-handle.is-row": {
    right: "auto",
    left: "0.2rem",
  },
  ".cm-md-table-slot:hover .cm-md-table-handle": { opacity: "1" },
  ".cm-md-table-handle:focus": { opacity: "1" },
  ".cm-md-table-handle:hover": {
    background: "var(--muted)",
    color: "var(--foreground)",
  },

  // The add-row / add-column strips stay faintly visible at rest instead of appearing only
  // on hover: hidden entirely, there was nothing to tell you the table could grow at all.
  ".cm-md-table-add": {
    position: "absolute",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed var(--border)",
    borderRadius: "0.4rem",
    background: "transparent",
    color: "var(--muted-foreground)",
    cursor: "pointer",
    opacity: "0.45",
    transition: "opacity 120ms, background 120ms",
    padding: "0",
    lineHeight: "1",
    fontSize: "0.9rem",
  },
  ".cm-md-table-add.is-column": {
    top: "0",
    right: "0",
    width: "1.35rem",
    bottom: "1.65rem",
  },
  ".cm-md-table-add.is-row": {
    left: "0",
    right: "1.65rem",
    bottom: "0",
    height: "1.35rem",
  },
  ".cm-md-table-wrap:hover .cm-md-table-add": { opacity: "0.8" },
  ".cm-md-table-add:hover": {
    opacity: "1",
    background: "var(--muted)",
    color: "var(--foreground)",
    borderStyle: "solid",
    borderColor: "var(--primary)",
  },

  ".cm-md-table-menu": {
    position: "absolute",
    zIndex: "20",
    minWidth: "13rem",
    padding: "0.25rem",
    borderRadius: "0.6rem",
    border: "1px solid var(--border)",
    background: "var(--card)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    display: "flex",
    flexDirection: "column",
  },
  ".cm-md-table-menu-item": {
    textAlign: "left",
    border: "none",
    background: "transparent",
    color: "var(--foreground)",
    padding: "0.35rem 0.5rem",
    borderRadius: "0.4rem",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  ".cm-md-table-menu-item:hover": {
    background: "var(--muted)",
  },
  ".cm-md-table-menu-item.is-danger": {
    color: "#e5484d",
  },
  ".cm-md-table": {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: "0.94em",
    lineHeight: "1.5",
  },
  ".cm-md-table th, .cm-md-table td": {
    border: "1px solid var(--border)",
    padding: "0.4rem 0.6rem",
    verticalAlign: "top",
    // EditorView.lineWrapping puts `overflow-wrap: anywhere` on the content, which would
    // otherwise inherit down here and split words mid-character — and, because it drops
    // each column's min-content width to one letter, squeeze the narrow columns too.
    overflowWrap: "normal",
    wordBreak: "normal",
    whiteSpace: "normal",
  },
  ".cm-md-table th": {
    backgroundColor: "var(--muted)",
    fontWeight: "700",
  },
  ".cm-md-table code": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.9em",
    backgroundColor: "var(--muted)",
    borderRadius: "0.3rem",
    padding: "0.1em 0.3em",
  },

  ".cm-md-task": {
    accentColor: "var(--primary)",
    width: "1em",
    height: "1em",
    verticalAlign: "-0.15em",
    cursor: "pointer",
  },

  ".cm-md-rule": {
    display: "inline-block",
    width: "100%",
    verticalAlign: "middle",
    borderTop: "2px solid var(--border)",
  },

  ".cm-md-image": {
    display: "block",
    maxWidth: "100%",
    borderRadius: "0.75rem",
    // Padding rather than margin, for the same height-map reason as the headings above —
    // a child's block margin can collapse out of the line box CodeMirror measures.
    padding: "0.5rem 0",
  },
  ".cm-md-image-broken": {
    minWidth: "8rem",
    minHeight: "3rem",
    border: "1px dashed var(--border)",
  },
});
