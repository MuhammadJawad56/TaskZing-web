"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

function applyThemeToDom(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read theme from DOM dataset (set by script in layout.tsx) to match what's already rendered
  // This prevents hydration mismatches by ensuring React state matches the DOM
  const getInitialTheme = (): Theme => {
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      // Check what the script already set on the DOM (script runs beforeInteractive)
      const themeFromDom = document.documentElement.dataset.theme as Theme | undefined;
      if (themeFromDom === "dark" || themeFromDom === "light") {
        return themeFromDom;
      }
      // Fallback to localStorage if DOM doesn't have it yet
      try {
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        return savedTheme === "dark" ? "dark" : "light";
      } catch {
        return "light";
      }
    }
    return "light";
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Sync with localStorage after mount to ensure consistency
    // This only runs once on mount
    try {
      const savedTheme = localStorage.getItem("theme") as Theme | null;
      const initialTheme: Theme = savedTheme === "dark" ? "dark" : "light";
      
      // Check current theme state and update if needed
      setThemeState((currentTheme) => {
        if (initialTheme !== currentTheme) {
          applyThemeToDom(initialTheme);
          return initialTheme;
        }
        return currentTheme;
      });
    } catch (error) {
      // localStorage might not be available
      console.warn("Failed to read theme from localStorage:", error);
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyThemeToDom(theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      applyThemeToDom(next);
      localStorage.setItem("theme", next);
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
