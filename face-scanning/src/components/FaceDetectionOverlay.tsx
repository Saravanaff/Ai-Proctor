import React from "react";

export interface FaceDetectionOverlayProps {
  faceDetected: boolean;
  showSuccess: boolean;
  expectedDirection?: "forward" | "right" | "left";
  eligible?: boolean;
  stepLabel?: string;
  instructionText?: string;
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
        }
      `}</style>
    </div>
  );
};

const FaceDetectionOverlay: React.FC<FaceDetectionOverlayProps> = ({
  faceDetected,
  showSuccess,
  expectedDirection,
  eligible,
  stepLabel,
  instructionText,
}) => {
  const borderColor = eligible ? "#22c55e" : "rgba(255,255,255,0.5)";
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
          width: 360,
          height: 360,
          borderRadius: "50%",
          // Huge spread to dim outside the circle while keeping the hole bright
          boxShadow: "0 0 0 2000px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
      />

      {/* Step label above circle */}
      {stepLabel && (
        <div
          style={{
            position: "absolute",
            top: "14%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.5)",
            color: "#e5e7eb",
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {stepLabel}
        </div>
      )}

      <div
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
        {showSuccess && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(34,197,94,0.9)",
              color: "#fff",
              padding: "6px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Captured
          </div>
        )}
      </div>

      {/* Instruction below circle */}
      {instructionText && (
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
      )}
    </div>
  );
};

export default FaceDetectionOverlay;