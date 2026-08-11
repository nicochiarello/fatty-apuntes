"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { NotebookPen } from "lucide-react";

export default function NoteLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <NotebookPen className="size-8 animate-pulse text-primary" />
        <p className="text-sm">Cargando…</p>
      </div>
    );
  }

  return <div className="flex h-dvh flex-col">{children}</div>;
}
