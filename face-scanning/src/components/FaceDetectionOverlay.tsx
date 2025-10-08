import React from "react";
import CircleWithQuadrants from "./CircleWithQuadrant";

export interface FaceDetectionOverlayProps {
  storedFaceDirection: string[];
  expectedDirection: string;
}

const FaceDetectionOverlay: React.FC<FaceDetectionOverlayProps> = ({
  storedFaceDirection,
  expectedDirection,
}) => {
  const radiusOfCircle = 360;

  console.log(storedFaceDirection);

  const color = {
    up: "var(--border-color, rgba(255,255,255,0.1))",
    right: "var(--border-color, rgba(255,255,255,0.1))",
    down: "var(--border-color, rgba(255,255,255,0.1))",
    left: "var(--border-color, rgba(255,255,255,0.1))",
    forward: "var(--border-color, rgba(255,255,255,0.1))",
  };
  for (const direction of storedFaceDirection) {
    if (direction in color) {
      color[direction as keyof typeof color] = "var(--success-color, #22c55e)";
    }
  }

  // Get instruction text based on expected direction
  const getInstructionText = () => {
    switch (expectedDirection) {
      case "forward":
        return "Look straight at the camera";
      case "right":
        return "Turn right 45° - Keep face visible";
      case "left":
        return "Turn left 45° - Keep face visible";
      default:
        return "Position your face in the circle";
    }
  };

  const getDetailedInstruction = () => {
    switch (expectedDirection) {
      case "forward":
        return "Keep your head centered and look directly into the camera";
      case "right":
        return "Turn slowly to the right, ensuring your face stays within the circle";
      case "left":
        return "Turn slowly to the left, ensuring your face stays within the circle";
      default:
        return "Follow the on-screen guidance";
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Spotlight: darken entire backdrop except the circle area */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: radiusOfCircle,
          height: radiusOfCircle,
          borderRadius: "50%",
          boxShadow: "0 0 0 2000px var(--overlay-bg, rgba(0,0,0,0.5))",
          pointerEvents: "none",
        }}
      />

      {/* <div
        style={{
          width: 360,
          height: 360,
          borderRadius: "50%",
          border: `4px solid ${borderColor}`,
          position: "relative",
          transition: "border-color .2s",
          boxShadow:
            eligible
              ? "0 0 24px rgba(34,197,94,0.35)"
              : "0 0 12px rgba(255,255,255,0.12)",
          background: "rgba(0,0,0,0)",
        }}
      >
        <Arrow dir={expectedDirection} />
      </div> */}

      <CircleWithQuadrants
        size={radiusOfCircle}
        strokeWidth={10}
        color={color}
        expectedDirection={expectedDirection}
      />

      {/* Modern main instruction text */}
      <div
        style={{
          position: "absolute",
          top: "calc(50% + 220px)",
          left: "50%",
          transform: "translateX(-50%)",
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 700,
          textAlign: "center",
          textShadow: "0 4px 12px rgba(0,0,0,0.5)",
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.8), rgba(0,0,0,0.6))",
          padding: "16px 24px",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
          animation: "fadeInScale 0.6s ease-out",
          letterSpacing: "0.3px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        {getInstructionText()}
      </div>

      {/* Modern detailed instruction text */}
      <div
        style={{
          position: "absolute",
          top: "calc(50% + 290px)",
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.9)",
          fontSize: 14,
          fontWeight: 500,
          textAlign: "center",
          textShadow: "0 2px 8px rgba(0,0,0,0.4)",
          background: "rgba(0,0,0,0.4)",
          padding: "10px 16px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(12px)",
          maxWidth: "420px",
          animation: "fadeIn 0.6s ease-out 0.2s both",
          lineHeight: 1.5,
        }}
      >
        {getDetailedInstruction()}
      </div>

      {/* Modern angle indicator for turning directions */}
      {(expectedDirection === "right" || expectedDirection === "left") && (
        <div
          style={{
            position: "absolute",
            top: "calc(50% - 280px)",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background:
              "linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(217, 119, 6, 0.8))",
            padding: "12px 20px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            animation: "pulse 2.5s infinite",
            boxShadow: "0 8px 24px rgba(245, 158, 11, 0.3)",
            letterSpacing: "0.3px",
          }}
        >
          <div
            style={{
              fontSize: 16,
              background: "rgba(255,255,255,0.2)",
              borderRadius: "50%",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ⚡
          </div>
          Turn 45° {expectedDirection} - Keep face visible
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateX(-50%) scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
};

export default FaceDetectionOverlay;
