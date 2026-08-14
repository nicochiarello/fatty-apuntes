"use client";

import { CalendarDays, LogOut } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/AuthContext";
import { APP_VERSION } from "@/lib/version";
import { Logo } from "@/components/layout/Logo";
import { NotificationsToggle } from "@/components/layout/NotificationsToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { InstallAppButton } from "@/components/layout/InstallAppButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, logOut } = useAuth();

  const initials = user?.displayName
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogOut = async () => {
    await logOut();
    toast.success("Sesión cerrada");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/calendario"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <CalendarDays className="size-4 shrink-0" />
            <span className="hidden sm:inline">Calendario</span>
          </Link>
          <InstallAppButton />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar>
                  <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? "Usuario"} />
                  <AvatarFallback>{initials ?? "FA"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="truncate">
                  {user.displayName ?? user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Not DropdownMenuItems: selecting one closes the menu, and both of
                    these need to stay put to show the state they just changed. */}
                <div onClick={(e) => e.stopPropagation()}>
                  <ThemeToggle />
                  <DropdownMenuSeparator />
                  <NotificationsToggle />
                </div>
                <DropdownMenuItem onSelect={handleLogOut} className="text-red-600">
                  <LogOut className="size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Not a menu item: it is here to be read out when something looks wrong,
                    not to be clicked. */}
                <p className="px-2 py-1 text-xs text-muted-foreground">v{APP_VERSION}</p>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
