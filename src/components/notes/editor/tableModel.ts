import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";

/**
 * The markdown side of the table editor: reading a GFM table out of the document, writing
 * one back, and the structural edits the UI offers. Everything here is a pure value
 * transformation so the behaviour can be tested without a DOM — the widget in tableView.ts
 * only translates clicks into these calls.
 */

export type Align = "left" | "center" | "right";

export interface TableModel {
  /** Document range the table occupies, so an edit can replace exactly that span. */
  from: number;
  to: number;
  header: string[];
  rows: string[][];
  aligns: Align[];
}

// A literal pipe inside a cell has to be escaped, or it would read as a column break.
const escapeCell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();

/**
 * Splits one table line into its cells, unescaping `\|` on the way.
 *
 * Deliberately reads the line's text instead of the parser's TableCell nodes: lezer emits
 * no node at all for an empty cell, so counting nodes both loses trailing columns and
 * shifts every value after a blank one into the wrong column.
 */
function splitRow(line: string): string[] {
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === "\\" && body[index + 1] === "|") {
      current += "|";
      index += 1;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());

  return cells;
}

function alignOf(spec: string): Align {
  const trimmed = spec.trim();
  const left = trimmed.startsWith(":");
  const right = trimmed.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  return "left";
}

const ALIGN_MARK: Record<Align, string> = {
  left: "---",
  center: ":-:",
  right: "--:",
};

/** Reads the table containing `pos`, or null when `pos` is not inside a well-formed one. */
export function tableAt(state: EditorState, pos: number): TableModel | null {
  let table = syntaxTree(state).resolveInner(pos, 1);
  while (table.parent && table.name !== "Table") table = table.parent;
  if (table.name !== "Table") return null;

  // The parser marks the table's extent; the rows themselves are read off the text.
  const firstLine = state.doc.lineAt(table.from).number;
  const lastLine = state.doc.lineAt(table.to).number;
  if (lastLine < firstLine + 1) return null;

  const header = splitRow(state.doc.line(firstLine).text);
  const aligns = splitRow(state.doc.line(firstLine + 1).text).map(alignOf);
  const rows: string[][] = [];
  for (let line = firstLine + 2; line <= lastLine; line += 1) {
    rows.push(splitRow(state.doc.line(line).text));
  }

  if (header.length === 0) return null;

  return {
    from: table.from,
    to: table.to,
    header,
    rows: rows.map((row) => normalizeWidth(row, header.length, "")),
    aligns: normalizeWidth(aligns, header.length, "left"),
  };
}

/** Pads (or trims) a row so every row has exactly as many entries as the header. */
function normalizeWidth<T>(values: T[], width: number, fill?: T): T[] {
  const out = values.slice(0, width);
  while (out.length < width) out.push((fill ?? ("" as unknown as T)) as T);
  return out;
}

export function serializeTable(table: TableModel): string {
  const line = (cells: string[]) => `| ${cells.map(escapeCell).join(" | ")} |`;
  const alignLine = `| ${table.aligns.map((a) => ALIGN_MARK[a]).join(" | ")} |`;
  return [line(table.header), alignLine, ...table.rows.map(line)].join("\n");
}

const clampIndex = (index: number, length: number) => Math.max(0, Math.min(index, length));

export function insertRow(table: TableModel, at: number): TableModel {
  const rows = table.rows.slice();
  rows.splice(clampIndex(at, rows.length), 0, table.header.map(() => ""));
  return { ...table, rows };
}

export function deleteRow(table: TableModel, at: number): TableModel {
  if (at < 0 || at >= table.rows.length) return table;
  const rows = table.rows.slice();
  rows.splice(at, 1);
  return { ...table, rows };
}

export function insertColumn(table: TableModel, at: number): TableModel {
  const index = clampIndex(at, table.header.length);
  const header = table.header.slice();
  header.splice(index, 0, "");
  const aligns = table.aligns.slice();
  aligns.splice(index, 0, "left");
  const rows = table.rows.map((row) => {
    const next = row.slice();
    next.splice(index, 0, "");
    return next;
  });
  return { ...table, header, rows, aligns };
}

export function deleteColumn(table: TableModel, at: number): TableModel {
  // A table needs at least one column to stay a table.
  if (table.header.length <= 1 || at < 0 || at >= table.header.length) return table;
  const drop = <T,>(values: T[]) => values.filter((_, index) => index !== at);
  return {
    ...table,
    header: drop(table.header),
    aligns: drop(table.aligns),
    rows: table.rows.map(drop),
  };
}

export function setAlign(table: TableModel, at: number, align: Align): TableModel {
  if (at < 0 || at >= table.aligns.length) return table;
  const aligns = table.aligns.slice();
  aligns[at] = align;
  return { ...table, aligns };
}

/** `row` of -1 addresses the header. */
export function setCell(table: TableModel, row: number, column: number, value: string): TableModel {
  if (column < 0 || column >= table.header.length) return table;
  if (row === -1) {
    const header = table.header.slice();
    header[column] = value;
    return { ...table, header };
  }
  if (row < 0 || row >= table.rows.length) return table;
  const rows = table.rows.slice();
  rows[row] = rows[row].slice();
  rows[row][column] = value;
  return { ...table, rows };
}

export function emptyTable(columns = 3, rows = 2): Omit<TableModel, "from" | "to"> {
  return {
    header: Array.from({ length: columns }, (_, index) => `Columna ${index + 1}`),
    aligns: Array.from({ length: columns }, () => "left" as Align),
    rows: Array.from({ length: rows }, () => Array.from({ length: columns }, () => "")),
  };
}
