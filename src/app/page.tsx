"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileCode2, Users, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Logo } from "@/components/layout/Logo";
import { FullScreenLoader } from "@/components/layout/FullScreenLoader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Organizado por año y materia",
    description: "Cada apunte vive donde tiene que vivir: elegí el año, la materia, y listo.",
  },
  {
    icon: FileCode2,
    title: "Markdown y HTML",
    description: "Subí tus resúmenes en .md o .html y se renderizan lindo, sin descargar nada.",
  },
  {
    icon: Users,
    title: "Solo para el grupo",
    description: "Se entra con Google. Nada de cuentas raras, nada de spam.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  // Covers the initial auth check and, after returning from Google's redirect, the few
  // seconds it takes to resolve sign-in — otherwise the landing page would flash back up
  // as if nothing happened before redirecting to /dashboard.
  if (loading || user) {
    return <FullScreenLoader label="Ingresando…" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 h-128 bg-[radial-gradient(ellipse_at_top,var(--primary)_0%,transparent_60%)] opacity-20"
        aria-hidden
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
      </header>

      <main className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-24 pt-12 text-center sm:px-6">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" />
          Apuntes de la facu, todos en un solo lugar
        </span>
        <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground sm:text-6xl">
          Todos los apuntes del grupo,
          <br className="hidden sm:block" /> ordenados y a mano.
        </h1>
        <p className="mt-5 max-w-xl text-balance text-lg text-muted-foreground">
          Subí resúmenes en Markdown o HTML, organizalos por año y materia, y encontrá lo
          que necesitás antes del parcial sin perderte en un chat de WhatsApp.
        </p>
        <div className="mt-8">
          <GoogleSignInButton />
        </div>

        <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="text-left">
              <CardHeader>
                <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <feature.icon className="size-5" />
                </span>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
