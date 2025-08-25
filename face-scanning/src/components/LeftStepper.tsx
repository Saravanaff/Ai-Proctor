import React from "react";

type LeftStepperProps = {
  faceDirectionSequence: React.RefObject<string[]>;
  stage: React.RefObject<number>;
};

const LeftStepper: React.FC<LeftStepperProps> = ({
  faceDirectionSequence,
  stage,
}) => {
  return (
    <div
      className="theme-transition"
      style={{
        position: "absolute",
        top: 60,
        left: 16,
        zIndex: 60,
        background: "var(--card-bg, rgba(17,24,39,0.7))",
        border: "1px solid var(--border-color, rgba(255,255,255,0.06))",
        borderRadius: 12,
        padding: 12,
        width: 260,
        color: "var(--text-primary, #e5e7eb)",
        boxShadow: "0 10px 30px var(--shadow, rgba(0,0,0,0.35))",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 8,
          opacity: 0.9,
          color: "var(--text-primary)",
        }}
      >
        Verification Steps
      </div>
      {["Face Forward", "Turn Right", "Turn Left"].map((label, idx) => {
        const stepNo = idx + 1;
        const state =
          faceDirectionSequence.current.length < stage.current
            ? "done"
            : stepNo === stage.current
            ? "current"
            : "pending";
        const color =
          state === "done"
            ? "var(--success-color, #22c55e)"
            : state === "current"
            ? "var(--info-color, #0ea5e9)"
            : "var(--text-secondary, #4b5563)";
        const bgColor =
          state === "current"
            ? "var(--info-bg, rgba(14,165,233,0.12))"
            : "transparent";

        return (
          <div
            key={idx}
            className="theme-transition"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 8px",
              borderRadius: 10,
              background: bgColor,
              border:
                state === "current"
                  ? "1px solid var(--info-color, #0ea5e9)"
                  : "1px solid transparent",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 800,
                color: "white",
              }}
            >
              {state === "done" ? "✓" : stepNo}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  color: "var(--text-secondary)",
                }}
              >
                {stepNo === 1
                  ? "Look directly at the camera"
                  : stepNo === 2
                  ? "Turn your head to the right"
                  : "Turn your head to the left"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeftStepper;
