import React from "react";

const FaceDetectionOverlay: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "280px",
        height: "350px",
        border: "3px solid rgba(255, 255, 255, 0.8)",
        borderRadius: "50%",
        zIndex: 5,
        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.3)",
      }}
    />
  );
};

export default FaceDetectionOverlay;
