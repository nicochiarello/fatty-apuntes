"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Logo } from "@/components/layout/Logo";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

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
        </CardContent>
      </Card>
    </div>
  );
}
