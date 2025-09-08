import React from "react";

const Arrow: React.FC<{ dir?: string | null }> = ({ dir }) => {
  if (!dir) return null;
  const base: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: "12px solid transparent",
    borderRight: "12px solid transparent",
    borderBottom: "20px solid #ffffff",
  };
  let arrowStyle: React.CSSProperties = {
    ...base,
    filter:
      "drop-shadow(0 0 8px rgba(255,255,255,0.8)) drop-shadow(0 0 16px rgba(255,255,255,0.6))",
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
    animation: `${animName} 1.5s ease-in-out infinite`,
    pointerEvents: "none",
  };

  const glowStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 60,
    height: 60,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 45%, transparent 70%)",
    filter: "blur(8px)",
    animation: "glow 1.5s ease-in-out infinite",
  };

  return (
    <div style={wrapperStyle}>
      <div style={glowStyle} />
      <div
        style={{
          ...arrowStyle,
          animation: "glowPulse 1.5s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes arrowUpDown {
          0%, 100% {
            transform: translate(-50%, -20%);
          }
          50% {
            transform: translate(-50%, -80%);
          }
        }
        @keyframes arrowLeft {
          0%, 100% {
            transform: translate(-20%, -50%);
          }
          50% {
            transform: translate(-80%, -50%);
          }
        }
        @keyframes arrowRight {
          0%, 100% {
            transform: translate(-80%, -50%);
          }
          50% {
            transform: translate(-20%, -50%);
          }
        }
        @keyframes glow {
          0%, 100% {
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
        @keyframes glowPulse {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(255,255,255,0.8)) drop-shadow(0 0 12px rgba(255,255,255,0.6));
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(255,255,255,1)) drop-shadow(0 0 24px rgba(255,255,255,0.8));
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

  // Calculate target angle indicators
  const getTargetAngleIndicators = () => {
    if (expectedDirection === "right") {
      return (
        <g>
          {/* 45-degree indicator line for right turn */}
          <line
            x1={center + radius * 0.7}
            y1={center - radius * 0.7}
            x2={center + radius * 0.9}
            y2={center - radius * 0.9}
            stroke="#fbbf24"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
          <text
            x={center + radius * 0.85}
            y={center - radius * 0.6}
            fill="#fbbf24"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            45°
          </text>
        </g>
      );
    } else if (expectedDirection === "left") {
      return (
        <g>
          {/* 45-degree indicator line for left turn */}
          <line
            x1={center - radius * 0.7}
            y1={center - radius * 0.7}
            x2={center - radius * 0.9}
            y2={center - radius * 0.9}
            stroke="#fbbf24"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
          <text
            x={center - radius * 0.85}
            y={center - radius * 0.6}
            fill="#fbbf24"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            45°
          </text>
        </g>
      );
    }
    return null;
  };

  return (
    <div className="flex justify-center items-center h-screen">
      {true && <Arrow dir={expectedDirection} />}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Modern angle indicators */}
        {getTargetAngleIndicators()}

        {/* Enhanced segments with modern styling */}
        <g transform={`rotate(-45, ${center}, ${center})`}>
          {/* Top segment */}
          <path
            d={`M${center},${center - radius} 
                A${radius},${radius} 0 0,1 ${center + radius},${center}`}
            stroke={color["forward"] || "rgba(255,255,255,0.3)"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              filter:
                expectedDirection === "forward"
                  ? "drop-shadow(0 0 12px currentColor)"
                  : "none",
              transition: "all 0.3s ease",
            }}
          />
          {/* Right segment */}
          <path
            d={`M${center + radius},${center} 
                A${radius},${radius} 0 0,1 ${center},${center + radius}`}
            stroke={color["right"] || "rgba(255,255,255,0.3)"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              filter:
                expectedDirection === "right"
                  ? "drop-shadow(0 0 12px currentColor)"
                  : "none",
              transition: "all 0.3s ease",
            }}
          />
          {/* Bottom segment */}
          <path
            d={`M${center},${center + radius} 
                A${radius},${radius} 0 0,1 ${center - radius},${center}`}
            stroke={color["forward"] || "rgba(255,255,255,0.3)"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              filter:
                expectedDirection === "forward"
                  ? "drop-shadow(0 0 12px currentColor)"
                  : "none",
              transition: "all 0.3s ease",
            }}
          />
          {/* Left segment */}
          <path
            d={`M${center - radius},${center} 
                A${radius},${radius} 0 0,1 ${center},${center - radius}`}
            stroke={color["left"] || "rgba(255,255,255,0.3)"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              filter:
                expectedDirection === "left"
                  ? "drop-shadow(0 0 12px currentColor)"
                  : "none",
              transition: "all 0.3s ease",
            }}
          />
        </g>

        {/* Center dot indicator */}
        <circle
          cx={center}
          cy={center}
          r="3"
          fill="rgba(255,255,255,0.6)"
          style={{
            filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))",
          }}
        />
      </svg>
    </div>
  );
};

export default CircleWithQuadrants;
