import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root, RootContent } from "mdast";
import type { ReactNode } from "react";

interface InlineFormat {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
}

function fontFamilyFor(fmt: InlineFormat) {
  if (fmt.bold && fmt.italic) return "Helvetica-BoldOblique";
  if (fmt.bold) return "Helvetica-Bold";
  if (fmt.italic) return "Helvetica-Oblique";
  return "Helvetica";
}

// @react-pdf/renderer builds real vector PDFs (selectable text, small files) instead of
// rasterizing a DOM snapshot like html2canvas did — which is what produced invisible text
// against our CSS custom properties. It's dynamically imported so its layout engine never
// runs during Next's build-time prerendering of this "use client" page, only in the browser
// when a download is actually requested. renderInline/renderBlock are declared inside this
// function (closures) because JSX here must reference the dynamically-imported components.
export async function downloadMarkdownAsPdf(markdown: string, filename: string) {
  const { Document, Page, Text, View, Link, Image, StyleSheet, pdf } = await import(
    "@react-pdf/renderer"
  );

  const styles = StyleSheet.create({
    page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1a1a1a", lineHeight: 1.5 },
    h1: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 4, marginBottom: 12 },
    h2: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 8 },
    h3: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
    h4: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 6 },
    h5: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
    h6: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
    paragraph: { marginBottom: 8 },
    inlineCode: { fontFamily: "Courier", backgroundColor: "#f0f0f0", fontSize: 10 },
    codeBlock: {
      fontFamily: "Courier",
      fontSize: 9,
      lineHeight: 1.4,
      backgroundColor: "#f4f4f4",
      padding: 10,
      marginBottom: 10,
      borderRadius: 4,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: "#e8792c",
      paddingLeft: 12,
      marginBottom: 10,
      color: "#4a4a4a",
    },
    list: { marginBottom: 8 },
    listItem: { flexDirection: "row", marginBottom: 4 },
    bullet: { width: 16 },
    link: { color: "#2f8f6f", textDecoration: "underline" },
    hr: { borderBottomWidth: 1, borderBottomColor: "#dddddd", marginVertical: 14 },
    // A percentage maxWidth stretches even a tiny source image to fill the page's full
    // content width; a fixed point cap keeps images at a sane size regardless of their
    // native resolution, while react-pdf keeps the aspect ratio automatically.
    image: { maxWidth: 320, marginBottom: 10 },
    table: { marginBottom: 10, borderWidth: 1, borderColor: "#dddddd" },
    tableRow: { flexDirection: "row" },
    tableCell: {
      flex: 1,
      padding: 5,
      borderRightWidth: 1,
      borderTopWidth: 1,
      borderColor: "#dddddd",
      fontSize: 10,
    },
    tableHeaderCell: {
      flex: 1,
      padding: 5,
      borderRightWidth: 1,
      borderTopWidth: 1,
      borderColor: "#dddddd",
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      backgroundColor: "#f4f4f4",
    },
  });

  function renderInline(nodes: RootContent[], keyPrefix: string, fmt: InlineFormat = {}): ReactNode[] {
    return nodes.map((node, i) => {
      const key = `${keyPrefix}-${i}`;
      switch (node.type) {
        case "text":
          return (
            <Text
              key={key}
              style={{
                fontFamily: fontFamilyFor(fmt),
                textDecoration: fmt.strike ? "line-through" : undefined,
              }}
            >
              {node.value}
            </Text>
          );
        case "strong":
          return <Text key={key}>{renderInline(node.children, key, { ...fmt, bold: true })}</Text>;
        case "emphasis":
          return <Text key={key}>{renderInline(node.children, key, { ...fmt, italic: true })}</Text>;
        case "delete":
          return <Text key={key}>{renderInline(node.children, key, { ...fmt, strike: true })}</Text>;
        case "inlineCode":
          return (
            <Text key={key} style={styles.inlineCode}>
              {node.value}
            </Text>
          );
        case "break":
          return <Text key={key}>{"\n"}</Text>;
        case "link":
          return (
            <Link key={key} src={node.url} style={styles.link}>
              {renderInline(node.children, key, fmt)}
            </Link>
          );
        case "image":
          // react-pdf's Image is a block-level component and can't nest inside Text, so a
          // true mid-sentence image just falls back to its alt text here — the common case
          // of an image alone on its own line is handled at the block level instead, where
          // it renders as a real <Image>.
          return (
            <Text key={key} style={{ color: "#a33" }}>
              [{node.alt || "imagen"}]
            </Text>
          );
        default:
          return "children" in node ? (
            <Text key={key}>{renderInline(node.children as RootContent[], key, fmt)}</Text>
          ) : null;
      }
    });
  }

  function renderList(node: Extract<RootContent, { type: "list" }>, key: string): ReactNode {
    return (
      <View key={key} style={styles.list}>
        {node.children.map((item, i) => {
          const marker = item.checked != null ? (item.checked ? "☑" : "☐") : node.ordered ? `${(node.start ?? 1) + i}.` : "•";
          return (
            <View key={`${key}-${i}`} style={styles.listItem}>
              <Text style={styles.bullet}>{marker}</Text>
              <View style={{ flex: 1 }}>
                {item.children.map((child, ci) => renderBlock(child, `${key}-${i}-${ci}`))}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  function renderTable(node: Extract<RootContent, { type: "table" }>, key: string): ReactNode {
    return (
      <View key={key} style={styles.table}>
        {node.children.map((row, ri) => (
          <View key={`${key}-r${ri}`} style={styles.tableRow}>
            {row.children.map((cell, ci) => (
              <View key={`${key}-r${ri}c${ci}`} style={ri === 0 ? styles.tableHeaderCell : styles.tableCell}>
                <Text>{renderInline(cell.children, `${key}-r${ri}c${ci}`)}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  function renderBlock(node: RootContent, key: string): ReactNode {
    switch (node.type) {
      case "heading": {
        const level = Math.min(Math.max(node.depth, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6;
        return (
          <Text key={key} style={styles[`h${level}` as const]}>
            {renderInline(node.children, key)}
          </Text>
        );
      }
      case "paragraph":
        // `![alt](src)` alone on its own line parses as a paragraph containing a single
        // image inline node, not a block-level "image" node — render it as a real block
        // image instead of falling through to the Text-based paragraph path.
        if (node.children.length === 1 && node.children[0].type === "image") {
          return renderBlock(node.children[0], key);
        }
        return (
          <Text key={key} style={styles.paragraph}>
            {renderInline(node.children, key)}
          </Text>
        );
      case "blockquote":
        return (
          <View key={key} style={styles.blockquote}>
            {node.children.map((child, i) => renderBlock(child, `${key}-${i}`))}
          </View>
        );
      case "code":
        return (
          <Text key={key} style={styles.codeBlock}>
            {node.value}
          </Text>
        );
      case "thematicBreak":
        return <View key={key} style={styles.hr} />;
      case "list":
        return renderList(node, key);
      case "table":
        return renderTable(node, key);
      case "image":
        return node.url.startsWith("http") ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an <img>
          <Image key={key} src={node.url} style={styles.image} />
        ) : (
          <Text key={key} style={{ color: "#a33", marginBottom: 8 }}>
            [imagen no disponible: {node.alt ?? node.url}]
          </Text>
        );
      case "html":
        return (
          <Text key={key} style={styles.paragraph}>
            {node.value}
          </Text>
        );
      default:
        return "children" in node ? (
          <View key={key}>
            {(node.children as RootContent[]).map((child, i) => renderBlock(child, `${key}-${i}`))}
          </View>
        ) : null;
    }
  }

  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;
  const blocks = tree.children.map((node, i) => renderBlock(node, `b${i}`));

  const blob = await pdf(
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {blocks}
      </Page>
    </Document>,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
