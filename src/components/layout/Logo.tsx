import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 font-display text-xl font-bold text-foreground", className)}
    >
      <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <NotebookPen className="size-5" />
      </span>
      <span>
        Fatty <span className="text-primary">Apuntes</span>
      </span>
    </Link>
  );
}
