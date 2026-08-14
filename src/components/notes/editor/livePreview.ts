import { syntaxTree } from "@codemirror/language";
import { type EditorState, type Range, RangeSet } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

/**
 * "Live preview" à la Bear/Obsidian: the document stays plain markdown text, but the
 * syntax markers (`#`, `**`, `[]()`) are hidden and the content they wrap is styled in
 * place — so there is no separate preview pane and no serialization step that could
 * rewrite someone's uploaded .md.
 *
 * Markers are revealed for every line the selection touches. Reveal is deliberately
 * line-granular rather than node-granular: it guarantees the cursor can never sit inside
 * a hidden range, which is the usual source of "the caret disappeared" bugs in editors
 * that collapse text.
 */

const HEADING_LINE = [1, 2, 3, 4, 5, 6].map((level) =>
  Decoration.line({ class: `cm-md-heading cm-md-h${level}` }),
);
const QUOTE_LINE = Decoration.line({ class: "cm-md-quote" });
const CODE_LINE = Decoration.line({ class: "cm-md-code-line" });
const LIST_LINE = Decoration.line({ class: "cm-md-list" });

const MARK_CLASS: Record<string, string> = {
  StrongEmphasis: "cm-md-strong",
  Emphasis: "cm-md-emphasis",
  Strikethrough: "cm-md-strike",
  InlineCode: "cm-md-inline-code",
  URL: "cm-md-url",
  Link: "cm-md-link",
  ListMark: "cm-md-list-mark",
  CodeInfo: "cm-md-code-info",
  TableDelimiter: "cm-md-table-delimiter",
  TableHeader: "cm-md-table-header",
};

const CONTENT_MARKS = Object.fromEntries(
  Object.entries(MARK_CLASS).map(([name, cls]) => [name, Decoration.mark({ class: cls })]),
);

// Nodes that are pure syntax: hidden unless the selection is on their line.
const MARKER_NODES = new Set([
  "HeaderMark",
  "EmphasisMark",
  "StrikethroughMark",
  "LinkMark",
  "CodeMark",
  "QuoteMark",
]);

const HIDDEN = Decoration.replace({});
const DIMMED = Decoration.mark({ class: "cm-md-marker" });

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly from: number,
  ) {
    super();
  }

  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.from === this.from;
  }

  toDOM(view: EditorView) {
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = this.checked;
    box.className = "cm-md-task";
    box.addEventListener("mousedown", (event) => {
      // preventDefault keeps CodeMirror from moving the selection into the widget, which
      // would re-render it mid-dispatch.
      event.preventDefault();
      view.dispatch({
        changes: { from: this.from, to: this.from + 3, insert: this.checked ? "[ ]" : "[x]" },
      });
    });
    return box;
  }

  ignoreEvent() {
    return false;
  }
}

class RuleWidget extends WidgetType {
  eq() {
    return true;
  }

  toDOM() {
    const rule = document.createElement("span");
    rule.className = "cm-md-rule";
    return rule;
  }
}

class ImageWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly alt: string,
  ) {
    super();
  }

  eq(other: ImageWidget) {
    return other.url === this.url && other.alt === this.alt;
  }

  toDOM() {
    const image = document.createElement("img");
    image.src = this.url;
    image.alt = this.alt;
    image.className = "cm-md-image";
    // A broken/undownloadable src would otherwise collapse to a bare alt-text glyph with
    // no hint that the markdown itself is still intact underneath.
    image.addEventListener("error", () => image.classList.add("cm-md-image-broken"));
    return image;
  }
}

const IMAGE_PATTERN = /^!\[([^\]]*)\]\(\s*<?([^)\s>]*)>?/;

/** Offsets of every line the selection touches — markers there are shown as raw text. */
function revealedRanges(state: EditorState): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];
  for (const range of state.selection.ranges) {
    const from = state.doc.lineAt(range.from).from;
    const to = state.doc.lineAt(range.to).to;
    const last = ranges[ranges.length - 1];
    if (last && from <= last.to) {
      last.to = Math.max(last.to, to);
    } else {
      ranges.push({ from, to });
    }
  }
  return ranges;
}

function buildDecorations(view: EditorView) {
  const { state } = view;
  const revealed = revealedRanges(state);
  const isRevealed = (from: number, to: number) =>
    revealed.some((range) => from <= range.to && to >= range.from);

  // A plugin-provided replacing decoration may not span a line break, so anything that
  // hides or swaps out text has to stay within one line.
  const sameLine = (from: number, to: number) =>
    state.doc.lineAt(from).number === state.doc.lineAt(to).number;

  const decorations: Range<Decoration>[] = [];
  const atomics: Range<Decoration>[] = [];

  const decorateLines = (from: number, to: number, decoration: Decoration) => {
    const first = state.doc.lineAt(from).number;
    const last = state.doc.lineAt(to).number;
    for (let number = first; number <= last; number += 1) {
      decorations.push(decoration.range(state.doc.line(number).from));
    }
  };

  for (const { from: visibleFrom, to: visibleTo } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from: visibleFrom,
      to: visibleTo,
      enter(node) {
        const { name, from, to } = node;

        if (name.startsWith("ATXHeading") || name.startsWith("SetextHeading")) {
          const level = Number(name[name.length - 1]);
          if (level >= 1 && level <= 6) decorateLines(from, to, HEADING_LINE[level - 1]);
          return;
        }

        if (name === "Blockquote") {
          decorateLines(from, to, QUOTE_LINE);
          return;
        }

        if (name === "FencedCode" || name === "CodeBlock") {
          decorateLines(from, to, CODE_LINE);
          return;
        }

        if (name === "ListItem") {
          decorateLines(from, Math.min(to, state.doc.lineAt(from).to), LIST_LINE);
          return;
        }

        if (name === "TaskMarker") {
          if (!sameLine(from, to)) return;
          const checked = state.doc.sliceString(from, to).toLowerCase() === "[x]";
          const widget = Decoration.replace({ widget: new CheckboxWidget(checked, from) });
          decorations.push(widget.range(from, to));
          atomics.push(widget.range(from, to));
          return;
        }

        if (name === "HorizontalRule") {
          if (isRevealed(from, to) || !sameLine(from, to)) return;
          decorations.push(Decoration.replace({ widget: new RuleWidget() }).range(from, to));
          return;
        }

        if (name === "Image") {
          if (isRevealed(from, to) || !sameLine(from, to)) return;
          const match = IMAGE_PATTERN.exec(state.doc.sliceString(from, to));
          if (!match || !match[2]) return;
          decorations.push(
            Decoration.replace({ widget: new ImageWidget(match[2], match[1]) }).range(from, to),
          );
          return;
        }

        if (MARKER_NODES.has(name)) {
          if (isRevealed(from, to)) {
            decorations.push(DIMMED.range(from, to));
            return;
          }

          // Both fence lines of a code block stay dimmed rather than hidden: hiding the
          // opening one would strip its backticks while leaving the language behind, and
          // hiding the closing one would leave a stray blank line.
          const parent = node.node.parent?.name;
          if (parent === "FencedCode" || !sameLine(from, to)) {
            decorations.push(DIMMED.range(from, to));
            return;
          }

          // A line-leading marker (`# `, `> `) owns the blank that separates it from the
          // text; leaving that blank behind would indent every heading by a space.
          const line = state.doc.lineAt(from);
          let end = to;
          if (name === "HeaderMark" || name === "QuoteMark") {
            while (end < line.to && /[ \t]/.test(state.doc.sliceString(end, end + 1))) end += 1;
          }

          // Setext underlines — and an empty `## ` still being typed — own their whole
          // line; hiding one would collapse the line to nothing, so dim it instead.
          if (from === line.from && end >= line.to) {
            decorations.push(DIMMED.range(from, to));
            return;
          }

          decorations.push(HIDDEN.range(from, end));
          return;
        }

        // The URL half of a link is syntax too, but only once the label is readable on
        // its own — while the line is being edited the whole target should stay visible.
        if (name === "URL" && node.node.parent?.name === "Link") {
          if (!isRevealed(from, to) && sameLine(from, to)) {
            decorations.push(HIDDEN.range(from, to));
            return;
          }
        }

        const mark = CONTENT_MARKS[name];
        if (mark) decorations.push(mark.range(from, to));
      },
    });
  }

  return {
    decorations: Decoration.set(decorations, true),
    atomics: RangeSet.of(atomics, true),
  };
}

class LivePreviewPlugin {
  decorations: DecorationSet;
  atomics: DecorationSet;

  constructor(view: EditorView) {
    const built = buildDecorations(view);
    this.decorations = built.decorations;
    this.atomics = built.atomics;
  }

  update(update: ViewUpdate) {
    // Selection changes matter as much as edits here: moving the caret onto a line is
    // what reveals that line's markers.
    if (
      update.docChanged ||
      update.selectionSet ||
      update.viewportChanged ||
      syntaxTree(update.startState) !== syntaxTree(update.state)
    ) {
      const built = buildDecorations(update.view);
      this.decorations = built.decorations;
      this.atomics = built.atomics;
    }
  }
}

export const livePreview = ViewPlugin.fromClass(LivePreviewPlugin, {
  decorations: (plugin) => plugin.decorations,
  provide: (plugin) =>
    EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomics ?? Decoration.none),
});
