"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
