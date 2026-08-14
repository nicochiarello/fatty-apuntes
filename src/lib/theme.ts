"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Theme preference, stored per browser. "system" is the default and means "no data-theme
 * attribute", so the CSS falls through to prefers-color-scheme.
 *
 * The value lives in localStorage rather than React state because it also has to be read
 * by the inline script in the root layout, which runs before React exists — see
 * THEME_INIT_SCRIPT.
 */
export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "fatty-theme";

/**
 * Applies the stored choice before first paint. Anything React does would land after the
 * page has already been painted with the wrong palette, which is the classic dark-mode
 * flash. Kept tiny and dependency-free because it is inlined into the HTML of every page.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Private mode and blocked storage both throw; following the system is a fine answer.
  }
  return "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Keeps other tabs of the app in sync when the choice changes in one of them.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Read through useSyncExternalStore rather than seeded into useState from an effect: the
 * prerendered HTML is identical for every visitor, so the server snapshot has to be the
 * neutral "system" and React reconciles to the real value on hydration without a
 * setState-in-effect.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readStoredTheme, () => "system" as Theme);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Still apply it for this session even if it cannot be remembered.
    }
    applyTheme(next);
    listeners.forEach((notify) => notify());
  }, []);

  return { theme, setTheme };
}
