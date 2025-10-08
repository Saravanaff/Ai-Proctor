import React from "react";

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = "Accessing camera...",
}) => {
  return (
    <div
      className="theme-transition"
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "var(--text-primary, white)",
        fontSize: "16px",
        zIndex: 15,
        textAlign: "center",
        background: "var(--overlay-bg, rgba(0, 0, 0, 0.7))",
        padding: "20px",
        borderRadius: "8px",
        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.2))",
      }}
    >
      <div style={{ marginBottom: "10px", fontSize: "24px" }}>📷</div>
      <div>{message}</div>
    </div>
  );
};

export default LoadingIndicator;
