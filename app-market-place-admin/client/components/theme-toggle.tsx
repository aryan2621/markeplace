"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const THEME_KEY = "app-marketplace-admin-theme";
type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    const dark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", dark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem(THEME_KEY) as Theme) || "system";
    setTheme(stored);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handle = () => {
      if (theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, [mounted, theme]);

  function handleTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  if (!mounted) {
    return (
      <div className="flex gap-1 rounded-md p-1" aria-hidden>
        <div className="size-8 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div
      className="flex gap-0.5 rounded-md p-0.5 ring-1 ring-border bg-muted/50"
      role="group"
      aria-label="Theme"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("size-8 rounded", theme === "light" && "bg-background shadow-sm")}
        onClick={() => handleTheme("light")}
        aria-pressed={theme === "light"}
        aria-label="Light"
      >
        <Sun className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("size-8 rounded", theme === "dark" && "bg-background shadow-sm")}
        onClick={() => handleTheme("dark")}
        aria-pressed={theme === "dark"}
        aria-label="Dark"
      >
        <Moon className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("size-8 rounded", theme === "system" && "bg-background shadow-sm")}
        onClick={() => handleTheme("system")}
        aria-pressed={theme === "system"}
        aria-label="System"
      >
        <Monitor className="size-4" />
      </Button>
    </div>
  );
}
