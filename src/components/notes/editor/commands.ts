import { syntaxTree } from "@codemirror/language";
import { EditorSelection, type ChangeSpec, type EditorState, type Line } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { emptyTable, serializeTable } from "./tableModel";

/**
 * The toolbar's editing primitives. Every one of them is a plain text transformation on
 * the markdown source — the toolbar is a shortcut for typing the marks by hand, never a
 * separate document model.
 */

const INDENT = /^[ \t]*/;

/** Any list-ish line opener: bullet, ordered, or task. They're mutually exclusive. */
export const LIST_FAMILY = /^(?:[-*+] +(?:\[[ xX]\] +)?|\d+[.)] +)/;
export const HEADING_FAMILY = /^#{1,6} +/;
export const QUOTE_FAMILY = /^> ?/;

function selectedLines(state: EditorState): Line[] {
  const lines: Line[] = [];
  const seen = new Set<number>();
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let number = first; number <= last; number += 1) {
      if (seen.has(number)) continue;
      seen.add(number);
      lines.push(state.doc.line(number));
    }
  }
  return lines;
}

/**
 * Adds `prefixFor(i)` at the start of every selected line — or strips the family prefix
 * instead when every line already carries exactly that prefix, which is what makes the
 * toolbar buttons toggle rather than stack up.
 */
function applyLinePrefix(view: EditorView, family: RegExp, prefixFor: (index: number) => string) {
  const { state } = view;
  const targets = selectedLines(state).map((line) => {
    const indent = INDENT.exec(line.text)?.[0] ?? "";
    const current = family.exec(line.text.slice(indent.length))?.[0] ?? "";
    return { start: line.from + indent.length, current };
  });

  const alreadyApplied = targets.every((target, index) => target.current === prefixFor(index));

  const changes: ChangeSpec[] = [];
  targets.forEach((target, index) => {
    const insert = alreadyApplied ? "" : prefixFor(index);
    if (!target.current && !insert) return;
    changes.push({ from: target.start, to: target.start + target.current.length, insert });
  });

  if (changes.length > 0) {
    view.dispatch(state.update({ changes, userEvent: "input.format" }));
  }
  view.focus();
}

/** Wraps (or unwraps) each selection in `mark`, e.g. `**` for bold. */
export function toggleWrap(view: EditorView, mark: string) {
  const { state } = view;
  view.dispatch(
    state.changeByRange((range) => {
      const outerBefore = state.sliceDoc(Math.max(0, range.from - mark.length), range.from);
      const outerAfter = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + mark.length));

      // Marks sitting just outside the selection — the usual case after the caret was
      // placed inside already-bold text.
      if (outerBefore === mark && outerAfter === mark) {
        return {
          changes: [
            { from: range.from - mark.length, to: range.from },
            { from: range.to, to: range.to + mark.length },
          ],
          range: EditorSelection.range(range.from - mark.length, range.to - mark.length),
        };
      }

      // Marks inside the selection — the user dragged across `**bold**` including the stars.
      const selected = state.sliceDoc(range.from, range.to);
      if (
        selected.length >= mark.length * 2 &&
        selected.startsWith(mark) &&
        selected.endsWith(mark)
      ) {
        return {
          changes: [
            { from: range.from, to: range.from + mark.length },
            { from: range.to - mark.length, to: range.to },
          ],
          range: EditorSelection.range(range.from, range.to - mark.length * 2),
        };
      }

      return {
        changes: [
          { from: range.from, insert: mark },
          { from: range.to, insert: mark },
        ],
        range: EditorSelection.range(range.from + mark.length, range.to + mark.length),
      };
    }),
    { scrollIntoView: true, userEvent: "input.format" },
  );
  view.focus();
}

export function toggleHeading(view: EditorView, level: number) {
  applyLinePrefix(view, HEADING_FAMILY, () => `${"#".repeat(level)} `);
}

export function toggleQuote(view: EditorView) {
  applyLinePrefix(view, QUOTE_FAMILY, () => "> ");
}

export function toggleBulletList(view: EditorView) {
  applyLinePrefix(view, LIST_FAMILY, () => "- ");
}

export function toggleOrderedList(view: EditorView) {
  applyLinePrefix(view, LIST_FAMILY, (index) => `${index + 1}. `);
}

export function toggleTaskList(view: EditorView) {
  applyLinePrefix(view, LIST_FAMILY, () => "- [ ] ");
}

/**
 * Inserts `text` as its own block, guaranteeing a blank line above it when there is text
 * directly before. That blank line is not cosmetic: markdown folds a block construct into
 * the paragraph above it when they touch — `---` under a line of text is a setext heading
 * rather than a rule, and a table glued to a paragraph is not a table at all.
 */
function insertBlock(view: EditorView, text: string, cursorOffset = text.length) {
  const { state } = view;
  const range = state.selection.main;
  const line = state.doc.lineAt(range.from);
  const beforeCaret = line.text.slice(0, range.from - line.from);
  const afterCaret = line.text.slice(range.to - line.from);

  let lead: string;
  if (beforeCaret.trim() !== "") {
    // Break out of the text the caret is sitting in, then leave a blank line.
    lead = "\n\n";
  } else {
    const previous = line.number > 1 ? state.doc.line(line.number - 1) : null;
    lead = previous && previous.text.trim() !== "" ? "\n" : "";
  }
  const trail = afterCaret.trim() !== "" ? "\n\n" : "\n";

  const insert = `${lead}${text}${trail}`;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.cursor(range.from + lead.length + cursorOffset),
    scrollIntoView: true,
    userEvent: "input.format",
  });
  view.focus();
}

export function insertCodeBlock(view: EditorView) {
  const { state } = view;
  const range = state.selection.main;
  const selected = state.sliceDoc(range.from, range.to);
  if (selected) {
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: `\`\`\`\n${selected}\n\`\`\`` },
      selection: EditorSelection.cursor(range.from + 3),
      userEvent: "input.format",
    });
    view.focus();
    return;
  }
  insertBlock(view, "```\n\n```", 3);
}

export function insertHorizontalRule(view: EditorView) {
  insertBlock(view, "---", 3);
}

// Built from the same model the interactive table editor uses, so a table created from the
// toolbar is byte-identical to one the UI would produce.
export function insertTable(view: EditorView) {
  insertBlock(view, serializeTable({ from: 0, to: 0, ...emptyTable() }), 2);
}

/**
 * Turns the selection into a link. A selection that already looks like a URL becomes the
 * target (caret goes to the label); anything else becomes the label (caret goes to the
 * target), which is the order people actually paste things in.
 */
export function insertLink(view: EditorView) {
  const { state } = view;
  view.dispatch(
    state.changeByRange((range) => {
      const selected = state.sliceDoc(range.from, range.to).trim();
      const looksLikeUrl = /^(https?:\/\/|mailto:|www\.|\/)/i.test(selected);
      const label = looksLikeUrl ? "" : selected;
      const url = looksLikeUrl ? selected : "";
      const insert = `[${label}](${url})`;
      const caret = looksLikeUrl ? range.from + 1 : range.from + label.length + 3;
      return {
        changes: { from: range.from, to: range.to, insert },
        range: EditorSelection.cursor(caret),
      };
    }),
    { scrollIntoView: true, userEvent: "input.format" },
  );
  view.focus();
}

// Goes through insertBlock so the image ends up as its own paragraph — otherwise whatever
// gets added on the line right after it (a rule, a table) would be absorbed into the
// image's paragraph instead of parsing on its own.
export function insertImageMarkdown(view: EditorView, url: string, alt: string) {
  insertBlock(view, `![${alt}](${url})`);
}

/**
 * Names of the markdown constructs wrapping the caret, so the toolbar can show which
 * formats are active — read from the same syntax tree the live preview decorates with,
 * rather than re-parsing the text.
 */
export function activeFormats(state: EditorState): Set<string> {
  const active = new Set<string>();
  const pos = state.selection.main.head;
  let node = syntaxTree(state).resolveInner(pos, -1);
  while (node.parent) {
    active.add(node.name);
    node = node.parent;
  }

  // The tree nests a task inside a BulletList, so a checklist line would light up both
  // toolbar buttons. The line's own prefix is the single source of truth for the block
  // formats, matching how applyLinePrefix treats them as mutually exclusive.
  for (const name of ["BulletList", "OrderedList", "TaskList", "Task"]) active.delete(name);
  for (let level = 1; level <= 6; level += 1) active.delete(`ATXHeading${level}`);

  const line = state.doc.lineAt(pos);
  const text = line.text.slice(INDENT.exec(line.text)?.[0].length ?? 0);
  if (/^[-*+] +\[[ xX]\] +/.test(text)) active.add("TaskList");
  else if (/^[-*+] +/.test(text)) active.add("BulletList");
  else if (/^\d+[.)] +/.test(text)) active.add("OrderedList");

  const heading = HEADING_FAMILY.exec(text);
  if (heading) active.add(`ATXHeading${heading[0].trim().length}`);

  return active;
}
