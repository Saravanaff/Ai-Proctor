import React from "react";

const Arrow: React.FC<{ dir?: string | null }> = ({ dir }) => {
  if (!dir) return null;
  const base: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: "10px solid transparent",
    borderRight: "10px solid transparent",
    borderBottom: "16px solid var(--success-color, #22c55e)",
  };
  let arrowStyle: React.CSSProperties = {
    ...base,
    filter:
      "drop-shadow(0 0 6px var(--success-color, #22c55e)) drop-shadow(0 0 12px var(--success-color, #22c55e))",
  };
  if (dir === "right")
    arrowStyle = { ...arrowStyle, transform: "rotate(90deg)" };
  if (dir === "left")
    arrowStyle = { ...arrowStyle, transform: "rotate(-90deg)" };

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

  // Glowing halo behind the arrow - theme aware
  const successColorRGB =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--success-color")
      .trim() || "#22c55e";

  const glowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${successColorRGB}85 0%, ${successColorRGB}35 45%, transparent 70%)`,
    filter: "blur(6px)",
    animation: "glow 1.1s ease-in-out infinite",
  };

  return (
    <div style={wrapperStyle}>
      <div style={glowStyle} />
      <div
        style={{
          ...arrowStyle,
          animation: "glowPulse 1.1s ease-in-out infinite",
        }}
      />
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
            filter: drop-shadow(0 0 4px var(--success-color, #22c55e)) drop-shadow(0 0 10px var(--success-color, #22c55e));
          }
          50% {
            filter: drop-shadow(0 0 7px var(--success-color, #22c55e)) drop-shadow(0 0 18px var(--success-color, #22c55e));
          }
        }
      `}</style>
    </div>
  );
};

const CircleWithQuadrants = ({
  size = 200,
  strokeWidth = 20,
  color = {},
  expectedDirection,
}: {
  size?: number;
  strokeWidth?: number;
  color?: { [key: string]: string };
  expectedDirection?: string | null;
}) => {
  const radius = size / 2 - strokeWidth / 2;
  const center = size / 2;

  return (
    <div className="flex justify-center items-center h-screen">
      {true && <Arrow dir={expectedDirection} />}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Segments rotated */}
        <g transform={`rotate(-45, ${center}, ${center})`}>
          {/* Top */}
          <path
            d={`M${center},${center - radius} 
                A${radius},${radius} 0 0,1 ${center + radius},${center}`}
            stroke={
              color["forward"] || "var(--border-color, rgba(255,255,255,0.5))"
            }
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Right */}
          <path
            d={`M${center + radius},${center} 
                A${radius},${radius} 0 0,1 ${center},${center + radius}`}
            stroke={
              color["right"] || "var(--border-color, rgba(255,255,255,0.5))"
            }
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Bottom */}
          <path
            d={`M${center},${center + radius} 
                A${radius},${radius} 0 0,1 ${center - radius},${center}`}
            stroke={
              color["forward"] || "var(--border-color, rgba(255,255,255,0.5))"
            }
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Left */}
          <path
            d={`M${center - radius},${center} 
                A${radius},${radius} 0 0,1 ${center},${center - radius}`}
            stroke={
              color["left"] || "var(--border-color, rgba(255,255,255,0.5))"
            }
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};

export default CircleWithQuadrants;
