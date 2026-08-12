"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Not in lib.dom.d.ts yet — this is the standard shape Chromium browsers dispatch.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Safari/iOS never fires beforeinstallprompt — there's no programmatic install there, so
  // the button starts visible for iOS and gives manual instructions when tapped instead.
  const [visible, setVisible] = useState(() => !isStandalone() && isIOS());

  useEffect(() => {
    if (isStandalone()) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const handleInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!visible) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") setVisible(false);
      return;
    }

    if (isIOS()) {
      toast.info('Tocá el ícono de compartir (⬆️) y elegí "Agregar a pantalla de inicio"', {
        duration: 8000,
      });
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} className="h-9">
      <Download className="size-4" />
      <span className="hidden sm:inline">Descargar app</span>
    </Button>
  );
}
