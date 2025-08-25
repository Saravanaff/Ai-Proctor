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

      {/* Instruction below circle */}
      {/* {instructionText && (
        <div
          style={{
            position: "absolute",
            top: "calc(50% + 220px)",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#e5e7eb",
            fontSize: 16,
            fontWeight: 500,
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          {instructionText}
        </div>
      )} */}
    </div>
  );
};

export default FaceDetectionOverlay;
