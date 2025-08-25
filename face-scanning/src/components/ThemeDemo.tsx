import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemedComponent } from "@/components/ThemedComponent";
import styles from "@/styles/ThemeDemo.module.css";

/**
 * Demo component showing theme system usage
 * This can be imported and used on any page to showcase theming
 */
export const ThemeDemo: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <ThemedComponent className={styles.demoContainer}>
      <h2 className={styles.title}>Theme System Demo</h2>
      <p className={styles.subtitle}>
        Current theme: <strong>{theme}</strong>
      </p>

      <div className={styles.grid}>
        <div className="card-theme" style={{ padding: "1rem" }}>
          <h3 className="text-primary">Card Component</h3>
          <p className="text-secondary">
            This card automatically adapts to the current theme.
          </p>
        </div>

        <div className={styles.buttonGroup}>
          <button className="button-theme">Default Button</button>
          <button className="button-theme button-primary">
            Primary Button
          </button>
        </div>

        <div className={styles.inputGroup}>
          <label className="text-secondary">Themed Input:</label>
          <input
            type="text"
            className="input-theme"
            placeholder="Type something..."
          />
        </div>

        <div className={styles.statusExamples}>
          <div
            className="success-theme"
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid",
            }}
          >
            Success message
          </div>
          <div
            className="error-theme"
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid",
            }}
          >
            Error message
          </div>
          <div
            className="warning-theme"
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid",
            }}
          >
            Warning message
          </div>
          <div
            className="info-theme"
            style={{
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid",
            }}
          >
            Info message
          </div>
        </div>
      </div>

      <button onClick={toggleTheme} className={styles.toggleButton}>
        Switch to {theme === "light" ? "Dark" : "Light"} Theme
      </button>
    </ThemedComponent>
  );
};
