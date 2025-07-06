import React from "react";
import { overlayStyles } from "../constants/scanConfig";

interface HeaderOverlayProps {
  icon: string;
  title: string;
  instruction: string;
}

const HeaderOverlay: React.FC<HeaderOverlayProps> = ({
  icon,
  title,
  instruction,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
        background: overlayStyles.gradient.top,
        color: overlayStyles.colors.primary,
        fontSize: "18px",
        fontWeight: "500",
        textAlign: "center",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <div style={{ fontSize: "24px" }}>{icon}</div>
      <div>{title}</div>
      <div style={{ fontSize: "16px", fontWeight: "400" }}>{instruction}</div>
    </div>
  );
};

export default HeaderOverlay;
