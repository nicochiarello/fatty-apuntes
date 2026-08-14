"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { APP_VERSION } from "@/lib/version";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Logo } from "@/components/layout/Logo";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const { user, loading, approvalStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user || approvalStatus === null) return;
    router.replace(approvalStatus === "approved" ? "/dashboard" : "/pending");
  }, [loading, user, approvalStatus, router]);

  // loading covers both the initial auth check and, after coming back from Google's
  // redirect, the few seconds it takes to resolve the sign-in — without this the login
  // card would flash back up as if nothing happened before the redirect to /dashboard.
  if (loading || user) {
    return <FullScreenLoader label="Ingresando…" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
          <Logo href="/" />
          <div>
            <h1 className="font-display text-xl font-bold">Bienvenido de vuelta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entrá con tu cuenta de Google para ver los apuntes del grupo.
            </p>
          </div>
          <GoogleSignInButton className="w-full" />
          {/* Also shown here, not just behind the account menu, so someone who cannot get
              in at all can still report which build they are on. */}
          <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
        </CardContent>
      </Card>
    </div>
  );
}
