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
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Load theme from localStorage on client side only
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined" && window.localStorage.getItem) {
      try {
        const savedTheme = window.localStorage.getItem("ai-proctor-theme") as Theme;
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.error("Error loading theme from localStorage:", error);
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document on client side only
    if (typeof window !== "undefined" && typeof document !== "undefined" && typeof window.localStorage !== "undefined" && window.localStorage.setItem) {
      try {
        document.documentElement.setAttribute("data-theme", theme);
        window.localStorage.setItem("ai-proctor-theme", theme);
      } catch (error) {
        console.error("Error saving theme to localStorage:", error);
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
