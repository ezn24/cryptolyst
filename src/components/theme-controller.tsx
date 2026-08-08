"use client";

import { useEffect } from "react";

export type ThemePreference = "dark" | "light" | "system";

export function ThemeController({ theme }: { theme: ThemePreference }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return null;
}
