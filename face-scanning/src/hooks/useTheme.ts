import { useTheme } from "@/contexts/ThemeContext";

/**
 * Hook to get theme-aware CSS variables
 * Useful for dynamic styling based on the current theme
 */
export const useThemeColors = () => {
  const { theme } = useTheme();

  const getThemeColors = () => {
    if (typeof window === "undefined") return {};

    const root = document.documentElement;
    const style = getComputedStyle(root);

    return {
      background: style.getPropertyValue("--background").trim(),
      foreground: style.getPropertyValue("--foreground").trim(),
      secondaryBg: style.getPropertyValue("--secondary-bg").trim(),
      borderColor: style.getPropertyValue("--border-color").trim(),
      cardBg: style.getPropertyValue("--card-bg").trim(),
      buttonBg: style.getPropertyValue("--button-bg").trim(),
      buttonText: style.getPropertyValue("--button-text").trim(),
      buttonHover: style.getPropertyValue("--button-hover").trim(),
      textPrimary: style.getPropertyValue("--text-primary").trim(),
      textSecondary: style.getPropertyValue("--text-secondary").trim(),
      accentColor: style.getPropertyValue("--accent-color").trim(),
      errorColor: style.getPropertyValue("--error-color").trim(),
      warningColor: style.getPropertyValue("--warning-color").trim(),
      infoColor: style.getPropertyValue("--info-color").trim(),
      successColor: style.getPropertyValue("--success-color").trim(),
      shadow: style.getPropertyValue("--shadow").trim(),
    };
  };

  return {
    theme,
    colors: getThemeColors(),
    isDark: theme === "dark",
    isLight: theme === "light",
  };
};
