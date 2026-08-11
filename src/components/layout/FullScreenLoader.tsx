import { NotebookPen } from "lucide-react";

export function FullScreenLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
      <NotebookPen className="size-8 animate-pulse text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
