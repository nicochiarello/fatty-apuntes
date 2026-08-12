"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";

export default function NoteLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, approvalStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (approvalStatus !== null && approvalStatus !== "approved") {
      router.replace("/pending");
    }
  }, [loading, user, approvalStatus, router]);

  if (loading || !user || approvalStatus !== "approved") {
    return <FullScreenLoader />;
  }

  return <div className="flex h-dvh flex-col print:block print:h-auto">{children}</div>;
}
