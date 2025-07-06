import React from "react";

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = "Accessing camera...",
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        color: "white",
        fontSize: "16px",
        zIndex: 15,
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: "10px" }}>📷</div>
      <div>{message}</div>
    </div>
  );
};

export default LoadingIndicator;
