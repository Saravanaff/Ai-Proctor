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
        background:
          "linear-gradient(145deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.9) 100%)",
        border: "1px solid rgba(148,163,184,0.15)",
        borderRadius: 16,
        padding: 20,
        width: 280,
        color: "var(--text-primary, #e5e7eb)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.2)",
        backdropFilter: "blur(20px)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 16,
          opacity: 0.95,
          color: "var(--text-primary)",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid rgba(148,163,184,0.1)",
          paddingBottom: 12,
        }}
      >
        <span style={{ fontSize: 18 }}>🔐</span>
        Verification Steps
      </div>
      {["Face Forward", "Turn Right", "Turn Left"].map((label, idx) => {
        const stepNo = idx + 1;
        const state =
          faceDirectionSequence.current.length < stage.current
            ? "done"
            : stepNo === stage.current+1
            ? "current"
            : "pending";
        const color =
          state === "done"
            ? "linear-gradient(135deg, #10b981, #059669)"
            : state === "current"
            ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
            : "rgba(71,85,105,0.6)";
        const bgColor =
          state === "current"
            ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(29,78,216,0.1))"
            : state === "done"
            ? "rgba(16,185,129,0.05)"
            : "transparent";

        return (
          <div
            key={idx}
            className="theme-transition"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 12px",
              borderRadius: 12,
              background: bgColor,
              border:
                state === "current"
                  ? "1px solid rgba(59,130,246,0.3)"
                  : state === "done"
                  ? "1px solid rgba(16,185,129,0.2)"
                  : "1px solid transparent",
              marginBottom: idx < 2 ? 8 : 0,
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "white",
                boxShadow:
                  state === "current"
                    ? "0 0 20px rgba(59,130,246,0.4), 0 4px 12px rgba(59,130,246,0.3)"
                    : state === "done"
                    ? "0 4px 12px rgba(16,185,129,0.3)"
                    : "none",
                border:
                  state === "current"
                    ? "2px solid rgba(59,130,246,0.5)"
                    : "none",
                transition: "all 0.3s ease",
              }}
            >
              {state === "done" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                stepNo
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color:
                      state === "current"
                        ? "#60a5fa"
                        : state === "done"
                        ? "#34d399"
                        : "var(--text-primary)",
                    transition: "color 0.3s ease",
                  }}
                >
                  {label}
                </span>
                {state === "current" && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#3b82f6",
                      animation: "pulse 2s infinite",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  color:
                    state === "current" ? "#cbd5e1" : "var(--text-secondary)",
                  marginTop: 2,
                  transition: "color 0.3s ease",
                }}
              >
                {stepNo === 1
                  ? "Look directly at the camera"
                  : stepNo === 2
                  ? "Turn your head to the right"
                  : "Turn your head to the left"}
              </span>
              {state === "current" && (
                <div
                  style={{
                    width: "100%",
                    height: 2,
                    background: "rgba(59,130,246,0.2)",
                    borderRadius: 1,
                    marginTop: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                      borderRadius: 1,
                      animation: "progress 2s ease-in-out infinite",
                    }}
                  />
                </div>
              )}
            </div>
            <style jsx>{`
              @keyframes pulse {
                0%,
                100% {
                  opacity: 1;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.5;
                  transform: scale(1.2);
                }
              }
              @keyframes progress {
                0% {
                  transform: translateX(-100%);
                }
                100% {
                  transform: translateX(100%);
                }
              }
            `}</style>
          </div>
        );
      })}
    </div>
  );
};

export default LeftStepper;
