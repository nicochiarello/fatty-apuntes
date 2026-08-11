"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { Button } from "@/components/ui/button";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.88c2.27-2.09 3.54-5.17 3.54-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.93H1.3v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.32A7.19 7.19 0 0 1 4.9 12c0-.8.14-1.58.4-2.32V6.59H1.3A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.3 5.41l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.23 0 12 0 7.31 0 3.26 2.7 1.3 6.59l4.01 3.09C6.25 6.85 8.89 4.76 12 4.76z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ className }: { className?: string }) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Google sign-in failed:", err);
      const code = err instanceof Error && "code" in err ? String((err as { code: unknown }).code) : null;
      toast.error(code ? `No pudimos iniciar sesión (${code})` : "No pudimos iniciar sesión. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      size="lg"
      className={className}
      variant="default"
    >
      <GoogleIcon />
      {loading ? "Ingresando…" : "Ingresar con Google"}
    </Button>
  );
}
