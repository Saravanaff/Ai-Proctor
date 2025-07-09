import React from "react";

interface FaceDetectionOverlayProps {
  faceDetected?: boolean; // Optional prop to toggle color
}

const FaceDetectionOverlay: React.FC<FaceDetectionOverlayProps> = ({ faceDetected = false }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "430px",
        height: "500px",
        border: `3px solid ${faceDetected ? "limegreen" : "rgba(255, 255, 255, 0.8)"}`,
        borderRadius: "50%",
        zIndex: 5,
        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
        transition: "border 0.3s ease",
      }}
    />
  );
};

export default FaceDetectionOverlay;
