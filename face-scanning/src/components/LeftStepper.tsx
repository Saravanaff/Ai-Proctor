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
        top: 80,
        left: 24,
        zIndex: 60,
        background: "var(--card-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: 20,
        padding: 24,
        width: 300,
        color: "var(--text-primary)",
        boxShadow: "0 20px 40px var(--shadow)",
        backdropFilter: "blur(24px)",
        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: 20,
          color: "var(--text-primary)",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "2px solid var(--border-color)",
          paddingBottom: 16,
          letterSpacing: "0.3px",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--accent-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          �
        </div>
        Verification Steps
      </div>
      {["Face Forward", "Turn Right", "Turn Left"].map((label, idx) => {
        const stepNo = idx + 1;
        const state =
          faceDirectionSequence.current.length < stage.current
            ? "done"
            : stepNo === stage.current + 1
            ? "current"
            : "pending";

        const getStepColors = () => {
          if (state === "done")
            return {
              bg: "var(--success-color)",
              cardBg: "var(--success-bg)",
              border: "var(--success-color)",
              textColor: "var(--success-color)",
            };
          if (state === "current")
            return {
              bg: "var(--accent-color)",
              cardBg: "rgba(var(--accent-rgb), 0.1)",
              border: "var(--accent-color)",
              textColor: "var(--accent-color)",
            };
          return {
            bg: "var(--border-color)",
            cardBg: "transparent",
            border: "transparent",
            textColor: "var(--text-secondary)",
          };
        };

        const colors = getStepColors();

        return (
          <div
            key={idx}
            className="theme-transition"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px",
              borderRadius: 16,
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              marginBottom: idx < 2 ? 12 : 0,
              transition: "all 0.4s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: colors.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "white",
                boxShadow:
                  state === "current"
                    ? "0 8px 20px var(--shadow)"
                    : state === "done"
                    ? "0 8px 20px var(--success-bg)"
                    : "none",
                transition: "all 0.4s ease",
                flexShrink: 0,
              }}
            >
              {state === "done" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: colors.textColor,
                    transition: "color 0.4s ease",
                  }}
                >
                  {label}
                </span>
                {state === "current" && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--accent-color)",
                      animation: "pulse 2s infinite",
                      boxShadow: "0 0 8px var(--accent-color)",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color:
                    state === "current"
                      ? "var(--text-secondary)"
                      : "var(--text-secondary)",
                  fontWeight: 500,
                  transition: "color 0.4s ease",
                  lineHeight: 1.4,
                  opacity: state === "current" ? 1 : 0.7,
                }}
              >
                {stepNo === 1
                  ? "Keep your face visible and look directly at the camera"
                  : stepNo === 2
                  ? "Turn 45° right - keep your face visible in the circle"
                  : "Turn 45° left - keep your face visible in the circle"}
              </span>
              {state === "current" && (
                <div
                  style={{
                    width: "100%",
                    height: 3,
                    background: "var(--border-color)",
                    borderRadius: 2,
                    marginTop: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "var(--accent-color)",
                      borderRadius: 2,
                      animation: "progress 2.5s ease-in-out infinite",
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
                  opacity: 0.7;
                  transform: scale(1.1);
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
