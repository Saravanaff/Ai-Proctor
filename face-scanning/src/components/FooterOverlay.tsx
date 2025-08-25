import React from "react";
import { overlayStyles } from "../constants/scanConfig";

interface FooterOverlayProps {
  description: string;
}

const FooterOverlay: React.FC<FooterOverlayProps> = ({ description }) => {
  return (
    <div
      className="theme-transition"
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "30px 20px",
        background: overlayStyles.gradient.bottom,
        color: overlayStyles.colors.primary,
        fontSize: "16px",
        textAlign: "center",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div>{"Keep your face centered in the oval"}</div>
      <div
        style={{
          fontSize: "14px",
          opacity: 0.8,
          color: overlayStyles.colors.secondary,
        }}
      >
        {description}
      </div>
    </div>
  );
};

export default FooterOverlay;
