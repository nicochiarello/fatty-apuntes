"use client";

import { useEffect, useRef, useState } from "react";

export function DocxViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [{ renderAsync }, res] = await Promise.all([import("docx-preview"), fetch(url)]);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        await renderAsync(blob, containerRef.current, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
        });
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (error) {
    return (
      <p className="p-6 text-sm text-red-600">No pudimos mostrar la vista previa de este documento.</p>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-muted">
      <div ref={containerRef} className="docx-preview-container mx-auto max-w-3xl py-8" />
    </div>
  );
}
