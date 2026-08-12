"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";
import { Logo } from "@/components/layout/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PendingPage() {
  const { user, loading, approvalStatus, logOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (approvalStatus === "approved") {
      router.replace("/dashboard");
    }
  }, [loading, user, approvalStatus, router]);

  if (loading || !user || approvalStatus === "approved") {
    return <FullScreenLoader label="Un momento…" />;
  }

  const handleLogOut = async () => {
    await logOut();
    toast.success("Sesión cerrada");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <Logo href="/" />
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Clock className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold">Cuenta pendiente</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu cuenta ({user.email}) todavía no fue aprobada. Avisale a alguien del grupo
              para que te habilite el acceso — apenas te aprueben, esta pantalla te deja
              entrar sola.
            </p>
          </div>
          <Button variant="outline" onClick={handleLogOut}>
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
