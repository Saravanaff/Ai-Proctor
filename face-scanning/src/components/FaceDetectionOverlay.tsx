import React from "react";
import CircleWithQuadrants from "./CircleWithQuadrant";

export interface FaceDetectionOverlayProps {
  storedFaceDirection: string[];
}

const Arrow: React.FC<{ dir?: "forward" | "right" | "left" }> = ({ dir }) => {
  if (!dir) return null;
  const base: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderBottom: "16px solid #22c55e",
  };
  let arrowStyle: React.CSSProperties = {
    ...base,
    filter: "drop-shadow(0 0 6px #22c55e) drop-shadow(0 0 12px #22c55e)",
  };
  if (dir === "right") arrowStyle = { ...arrowStyle, transform: "rotate(90deg)" };
  if (dir === "left") arrowStyle = { ...arrowStyle, transform: "rotate(-90deg)" };

  const animName =
    dir === "forward"
      ? "arrowUpDown"
      : dir === "left"
      ? "arrowLeft"
      : "arrowRight";
  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    animation: `${animName} 1.1s ease-in-out infinite`,
    pointerEvents: "none",
  };

  // Glowing halo behind the arrow
  const glowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 44,
    height: 44,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(34,197,94,0.85) 0%, rgba(34,197,94,0.35) 45%, rgba(34,197,94,0) 70%)",
    filter: "blur(6px)",
    animation: "glow 1.1s ease-in-out infinite",
  };

  return (
    <div style={wrapperStyle}>
      <div style={glowStyle} />
      <div style={{ ...arrowStyle, animation: "glowPulse 1.1s ease-in-out infinite" }} />
      <style>{`
        @keyframes arrowUpDown {
          0%,
          100% {
            transform: translate(-50%, -15%);
          }
          50% {
            transform: translate(-50%, -95%);
          }
        }
        @keyframes arrowLeft {
          0%,
          100% {
            transform: translate(-15%, -50%);
          }
          50% {
            transform: translate(-95%, -50%);
          }
        }
        @keyframes arrowRight {
          0%,
          100% {
            transform: translate(-95%, -50%);
          }
          50% {
            transform: translate(-15%, -50%);
          }
        }
        @keyframes glow {
          0%,
          100% {
            opacity: 0.65;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes glowPulse {
          0%,
          100% {
            filter: drop-shadow(0 0 4px #22c55e) drop-shadow(0 0 10px #22c55e);
          }
          50% {
            filter: drop-shadow(0 0 7px #22c55e) drop-shadow(0 0 18px #22c55e);
          }
        alignItems: "center",
        justifyContent: "center",
        }
      `}</style>
    </div>
  );
};

const FaceDetectionOverlay: React.FC<FaceDetectionOverlayProps> = ({
  storedFaceDirection,
}) => {
  const borderColor = "rgba(255,255,255,0.5)";
  const expectedDirection = "left";
  const eligible = true; 
  const radiusOfCircle = 360;
  
  console.log(storedFaceDirection)

  const color = {
    up: "rgba(255,255,255,0.1)",
    right: "rgba(255,255,255,0.1)",
    down: "rgba(255,255,255,0.1)",
    left: "rgba(255,255,255,0.1)",
    forward: "rgba(255,255,255,0.1)",
  };
  for (const direction of storedFaceDirection) {
    if (direction in color) {
      color[direction as keyof typeof color] = "#22c55e"; 
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
          boxShadow: "0 0 0 2000px rgba(0,0,0,0.5)",
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

      <CircleWithQuadrants size={radiusOfCircle} strokeWidth={10} color={color}/>

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