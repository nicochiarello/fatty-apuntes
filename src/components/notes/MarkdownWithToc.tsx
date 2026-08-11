"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { List } from "lucide-react";
import { MarkdownViewer } from "@/components/notes/MarkdownViewer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Heading {
  id: string;
  text: string;
  level: number;
}

// rehype-slug (wired up in MarkdownViewer) gives every heading a stable id — reading them
// back from the rendered DOM guarantees the ids here always match, instead of
// re-implementing the same slug algorithm and risking it drifting out of sync.
function useHeadings(ref: RefObject<HTMLElement | null>, content: string) {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    setHeadings(
      nodes
        .filter((node): node is HTMLHeadingElement => !!node.id)
        .map((node) => ({
          id: node.id,
          text: node.textContent ?? "",
          level: Number(node.tagName[1]),
        })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  return headings;
}

function scrollToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function MarkdownWithToc({ content }: { content: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const headings = useHeadings(contentRef, content);
  const minLevel = headings.length ? Math.min(...headings.map((h) => h.level)) : 1;

  return (
    <div className="flex h-full">
      {headings.length > 0 && (
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-border p-4 lg:block">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Índice
          </p>
          <ul className="flex flex-col gap-0.5 text-sm">
            {headings.map((heading) => (
              <li key={heading.id}>
                <button
                  type="button"
                  onClick={() => scrollToHeading(heading.id)}
                  style={{ paddingLeft: 8 + (heading.level - minLevel) * 12 }}
                  className="w-full truncate rounded-md px-2 py-1 text-left text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {heading.text}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <div className="min-w-0 flex-1 overflow-y-auto">
        {headings.length > 0 && (
          <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-2 sm:px-6 lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <List className="size-4" />
                  Índice
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                {headings.map((heading) => (
                  <DropdownMenuItem
                    key={heading.id}
                    onSelect={() => scrollToHeading(heading.id)}
                    style={{ paddingLeft: 10 + (heading.level - minLevel) * 12 }}
                  >
                    {heading.text}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div ref={contentRef} className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
          <MarkdownViewer content={content} />
        </div>
      </div>
    </div>
  );
}
