import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemedComponentProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  [key: string]: any;
}

/**
 * A utility component that automatically applies theme classes
 * and provides theme context to its children
 */
export const ThemedComponent: React.FC<ThemedComponentProps> = ({
  children,
  className = "",
  as: Component = "div",
  ...props
}) => {
  const { theme } = useTheme();

  const themeClass = `theme-${theme}`;
  const combinedClassName =
    `${themeClass} theme-transition ${className}`.trim();

  return (
    <Component className={combinedClassName} {...props}>
      {children}
    </Component>
  );
};

/**
 * Higher-order component to wrap components with theme context
 */
export const withTheme = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  const WithThemeComponent = (props: P) => {
    const { theme } = useTheme();

    return (
      <div className={`theme-${theme} theme-transition`}>
        <WrappedComponent {...props} />
      </div>
    );
  };

  WithThemeComponent.displayName = `withTheme(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithThemeComponent;
};
