"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  disableNotifications,
  enableNotifications,
  getNotificationState,
  type NotificationState,
} from "@/lib/firebase/messaging";

/**
 * Lives inside the account menu. Renders nothing at all when web push cannot work here
 * (unsupported browser, no VAPID key configured, or development, where no service worker
 * is registered) rather than offering a switch that would silently do nothing.
 */
export function NotificationsToggle() {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getNotificationState().then(setState).catch(() => setState("unsupported"));
  }, []);

  if (state === null || state === "unsupported" || state === "unconfigured") return null;

  if (state === "denied") {
    return (
      <p className="px-2 py-1.5 text-xs text-muted-foreground">
        Notificaciones bloqueadas en este navegador.
      </p>
    );
  }

  const handleToggle = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const next = state === "on" ? await disableNotifications() : await enableNotifications(user.uid);
      setState(next);
      if (next === "on") toast.success("Te avisamos cuando suban un apunte");
      else if (next === "off") toast.success("Notificaciones desactivadas");
      else if (next === "denied") toast.error("Bloqueaste las notificaciones en el navegador");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos cambiar las notificaciones");
    } finally {
      setBusy(false);
    }
  };

  const Icon = state === "on" ? Bell : BellOff;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <Icon className="size-4 shrink-0" />}
      <span className="truncate">
        {state === "on" ? "Desactivar notificaciones" : "Activar notificaciones"}
      </span>
    </button>
  );
}
