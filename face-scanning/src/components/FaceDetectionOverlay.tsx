import React from "react";

interface FaceDetectionOverlayProps {
  faceDetected?: boolean;
  showSuccess?: boolean;
}

const FaceDetectionOverlay: React.FC<FaceDetectionOverlayProps> = ({
  faceDetected = false,
  showSuccess = false,
}) => {
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
        overflow: "hidden",
      }}
    >
      {faceDetected && !showSuccess && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "3px",
              background: "limegreen",
              animation: "scanLine 2s linear infinite",
              opacity: 0.8,
            }}
          />
        </div>
      )}

      {/* Tick icon */}
      {showSuccess && (
        <div
          style={{
            color: "limegreen",
            fontSize: "80px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            animation: "pop 0.4s ease-out",
          }}
        >
          ✔
        </div>
      )}
    </div>
  );
};

export default FaceDetectionOverlay;
