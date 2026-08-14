"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/**
 * Lives inside the account menu. Offers "Sistema" alongside the two explicit choices
 * because following the OS is what the app did before there was any switch — dropping it
 * would have been a regression for anyone whose phone flips to dark at night.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-1 py-1">
      <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">Tema</p>
      <div className="flex gap-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={active}
              className={`flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] outline-none transition-colors ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="relative">
                <Icon className="size-4" />
                {active && (
                  <Check className="absolute -right-2 -top-1.5 size-2.5 stroke-[3]" />
                )}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
