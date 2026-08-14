import { syntaxTree } from "@codemirror/language";
import { type EditorState, type Range, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import {
  type Align,
  type TableModel,
  deleteColumn,
  deleteRow,
  insertColumn,
  insertRow,
  serializeTable,
  setAlign,
  setCell,
  tableAt,
} from "./tableModel";

/**
 * Notion-style tables: a GFM table always renders as a real, editable table — cells are
 * typed into directly and rows/columns are added from the UI, so the pipe syntax never has
 * to be written by hand. The markdown in the document stays the source of truth; every UI
 * action rewrites that text through tableModel.ts.
 *
 * This lives in a StateField rather than livePreview's ViewPlugin because a table spans
 * several lines, and a plugin-provided decoration may not replace across a line break.
 */

const INLINE = /(`[^`]+`)|(\*\*[^*]+?\*\*)|(__[^_]+?__)|(\*[^*]+?\*)|(~~[^~]+?~~)|(\[[^\]]*\]\([^)\s]*\))/g;

/**
 * Renders a cell's inline markdown for display. Built with createElement rather than
 * innerHTML so note content can never inject markup into the editor.
 */
function renderInline(target: HTMLElement, text: string) {
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) target.append(text.slice(last, index));
    const token = match[0];

    if (token.startsWith("`")) {
      const code = document.createElement("code");
      code.textContent = token.slice(1, -1);
      target.append(code);
    } else if (token.startsWith("**") || token.startsWith("__")) {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      target.append(strong);
    } else if (token.startsWith("~~")) {
      const del = document.createElement("del");
      del.textContent = token.slice(2, -2);
      target.append(del);
    } else if (token.startsWith("*")) {
      const em = document.createElement("em");
      em.textContent = token.slice(1, -1);
      target.append(em);
    } else {
      const link = /^\[([^\]]*)\]\([^)\s]*\)$/.exec(token);
      const span = document.createElement("span");
      span.className = "cm-md-link";
      span.textContent = link ? link[1] : token;
      target.append(span);
    }
    last = index + token.length;
  }
  if (last < text.length) target.append(text.slice(last));
}

function iconButton(label: string, glyph: string, className: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.textContent = glyph;
  // Sits next to editable text, so it must not be typed into or deleted by the caret.
  button.contentEditable = "false";
  return button;
}

interface MenuItem {
  label: string;
  run: () => void;
  danger?: boolean;
}

function openMenu(anchor: HTMLElement, host: HTMLElement, items: MenuItem[]) {
  host.querySelector(".cm-md-table-menu")?.remove();

  const menu = document.createElement("div");
  menu.className = "cm-md-table-menu";

  for (const item of items) {
    const entry = document.createElement("button");
    entry.type = "button";
    entry.className = item.danger ? "cm-md-table-menu-item is-danger" : "cm-md-table-menu-item";
    entry.textContent = item.label;
    entry.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      menu.remove();
      item.run();
    });
    menu.append(entry);
  }

  const anchorBox = anchor.getBoundingClientRect();
  const hostBox = host.getBoundingClientRect();
  menu.style.top = `${anchorBox.bottom - hostBox.top + 4}px`;
  menu.style.left = `${anchorBox.left - hostBox.left}px`;
  host.append(menu);

  // Any click that is not on the menu itself dismisses it.
  const dismiss = (event: MouseEvent) => {
    if (!menu.contains(event.target as Node)) {
      menu.remove();
      document.removeEventListener("mousedown", dismiss, true);
    }
  };
  document.addEventListener("mousedown", dismiss, true);
}

class TableWidget extends WidgetType {
  constructor(readonly table: TableModel) {
    super();
  }

  eq(other: TableWidget) {
    return (
      JSON.stringify({ ...other.table, from: 0, to: 0 }) ===
      JSON.stringify({ ...this.table, from: 0, to: 0 })
    );
  }

  /**
   * Resolves the table's *current* document range before writing. Stored positions go
   * stale as soon as anything above the table changes, so the range is re-derived from
   * where this widget's DOM actually sits.
   */
  private commit(view: EditorView, dom: HTMLElement, change: (table: TableModel) => TableModel) {
    const pos = view.posAtDOM(dom);
    const current = tableAt(view.state, pos) ?? tableAt(view.state, pos + 1);
    if (!current) return;

    const next = change(current);
    const text = serializeTable(next);
    if (text === view.state.doc.sliceString(current.from, current.to)) return;

    view.dispatch({
      changes: { from: current.from, to: current.to, insert: text },
      userEvent: "input.table",
    });
  }

  toDOM(view: EditorView) {
    const { header, rows, aligns } = this.table;

    const wrapper = document.createElement("div");
    wrapper.className = "cm-md-table-wrap";
    const commit = (change: (table: TableModel) => TableModel) =>
      this.commit(view, wrapper, change);

    const table = document.createElement("table");
    table.className = "cm-md-table";

    // Cells hold plain markdown text while being edited (so what you type is exactly what
    // gets stored) and show it rendered once focus leaves.
    // The editable text lives in its own element inside the cell so that swapping between
    // raw markdown and rendered content never disturbs the control button beside it.
    const makeCell = (tag: "th" | "td", row: number, column: number, text: string) => {
      const container = document.createElement(tag);
      container.className = "cm-md-table-slot";
      container.style.textAlign = aligns[column] ?? "left";

      const cell = document.createElement("div");
      cell.contentEditable = "true";
      cell.spellcheck = false;
      cell.className = "cm-md-table-cell";
      renderInline(cell, text);
      container.append(cell);

      cell.addEventListener("focus", () => {
        cell.textContent = text;
      });

      cell.addEventListener("blur", () => {
        const value = (cell.textContent ?? "").trim();
        if (value === text) {
          cell.textContent = "";
          renderInline(cell, text);
          return;
        }
        commit((current) => setCell(current, row, column, value));
      });

      cell.addEventListener("keydown", (event) => {
        // Enter would otherwise insert a line break into a cell, which cannot survive a
        // round trip through a single-line markdown row.
        if (event.key === "Enter") {
          event.preventDefault();
          cell.blur();
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cell.textContent = "";
          renderInline(cell, text);
          cell.blur();
          return;
        }
        if (event.key === "Tab") {
          event.preventDefault();
          const cells = Array.from(wrapper.querySelectorAll<HTMLElement>(".cm-md-table-cell"));
          const next = cells[cells.indexOf(cell) + (event.shiftKey ? -1 : 1)];
          next?.focus();
        }
      });

      return container;
    };

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    header.forEach((text, column) => {
      const th = makeCell("th", -1, column, text);

      const menuButton = iconButton(`Opciones de la columna ${column + 1}`, "▾", "cm-md-table-handle");
      menuButton.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const align = (value: Align) => () => commit((t) => setAlign(t, column, value));
        openMenu(menuButton, wrapper, [
          { label: "Insertar columna a la izquierda", run: () => commit((t) => insertColumn(t, column)) },
          { label: "Insertar columna a la derecha", run: () => commit((t) => insertColumn(t, column + 1)) },
          { label: "Alinear a la izquierda", run: align("left") },
          { label: "Centrar", run: align("center") },
          { label: "Alinear a la derecha", run: align("right") },
          { label: "Eliminar columna", run: () => commit((t) => deleteColumn(t, column)), danger: true },
        ]);
      });
      th.append(menuButton);

      headRow.append(th);
    });
    thead.append(headRow);
    table.append(thead);

    const tbody = document.createElement("tbody");
    rows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      for (let column = 0; column < header.length; column += 1) {
        const td = makeCell("td", rowIndex, column, row[column] ?? "");

        if (column === 0) {
          const menuButton = iconButton(`Opciones de la fila ${rowIndex + 1}`, "▾", "cm-md-table-handle is-row");
          menuButton.addEventListener("mousedown", (event) => {
            event.preventDefault();
            event.stopPropagation();
            openMenu(menuButton, wrapper, [
              { label: "Insertar fila arriba", run: () => commit((t) => insertRow(t, rowIndex)) },
              { label: "Insertar fila abajo", run: () => commit((t) => insertRow(t, rowIndex + 1)) },
              { label: "Eliminar fila", run: () => commit((t) => deleteRow(t, rowIndex)), danger: true },
            ]);
          });
          td.append(menuButton);
        }

        tr.append(td);
      }
      tbody.append(tr);
    });
    table.append(tbody);

    // The scroller keeps a wide table inside its own box, while the wrapper stays
    // overflow-visible so the popup menus are not clipped by it.
    const scroller = document.createElement("div");
    scroller.className = "cm-md-table-scroll";
    scroller.append(table);
    wrapper.append(scroller);

    const addColumn = iconButton("Agregar columna", "+", "cm-md-table-add is-column");
    addColumn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      commit((current) => insertColumn(current, current.header.length));
    });

    const addRow = iconButton("Agregar fila", "+", "cm-md-table-add is-row");
    addRow.addEventListener("mousedown", (event) => {
      event.preventDefault();
      commit((current) => insertRow(current, current.rows.length));
    });

    wrapper.append(addColumn, addRow);
    return wrapper;
  }

  // The widget owns its DOM entirely: CodeMirror must not try to interpret the typing
  // inside a contenteditable cell as edits to its own document, nor route the clicks on
  // the controls through its selection handling.
  ignoreMutation() {
    return true;
  }

  ignoreEvent() {
    return true;
  }

  get estimatedHeight() {
    return 40 * (this.table.rows.length + 1);
  }
}

function buildTableDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "Table") return undefined;
      const { from, to } = node;

      // A block replacement has to cover whole lines exactly.
      if (state.doc.lineAt(from).from !== from || state.doc.lineAt(to).to !== to) return false;

      const table = tableAt(state, from);
      if (!table) return false;

      decorations.push(
        Decoration.replace({ widget: new TableWidget(table), block: true }).range(from, to),
      );
      return false;
    },
  });

  return Decoration.set(decorations, true);
}

export const tableView = StateField.define<DecorationSet>({
  create: buildTableDecorations,
  update(value, tr) {
    // The parser catching up on a table further down the document counts as a change too,
    // even when neither the text nor the selection moved.
    if (tr.docChanged || syntaxTree(tr.startState) !== syntaxTree(tr.state)) {
      return buildTableDecorations(tr.state);
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});
