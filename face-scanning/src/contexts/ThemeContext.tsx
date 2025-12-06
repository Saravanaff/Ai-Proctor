import React, { createContext, useContext, useState, useEffect } from "react";
import type { Theme, ThemeContextType } from "@/types";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage on client side only
    if (typeof window !== "undefined") {
      try {
        const storage = window.localStorage;
        if (storage && typeof storage.getItem === "function") {
          const savedTheme = storage.getItem("ai-proctor-theme") as Theme;
          if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
            setTheme(savedTheme);
          }
        }
      } catch (error) {
        console.error("Error loading theme from localStorage:", error);
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document on client side only
    if (mounted && typeof window !== "undefined" && typeof document !== "undefined") {
      try {
        document.documentElement.setAttribute("data-theme", theme);
        const storage = window.localStorage;
        if (storage && typeof storage.setItem === "function") {
          storage.setItem("ai-proctor-theme", theme);
        }
      } catch (error) {
        console.error("Error saving theme to localStorage:", error);
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
