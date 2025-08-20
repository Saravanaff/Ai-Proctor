import React from "react";

const CircleWithQuadrants = ({
  size = 200,
  strokeWidth = 20,
  color = {},
}: {
  size?: number;
  strokeWidth?: number;
  color?: { [key: string]: string };
}) => {
  const radius = size / 2 - strokeWidth / 2;
  const center = size / 2;

  return (
    <div className="flex justify-center items-center h-screen">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer big circle */}
        <circle
          cx={center}
          cy={center}
          r={radius + (strokeWidth/2)}
          stroke={color["forward"] || "rgba(255,255,255,0.5)"}
          strokeWidth={strokeWidth/2}
          fill="none"
        />

        {/* Segments rotated */}
        <g transform={`rotate(-45, ${center}, ${center})`}>
          {/* Top */}
          <path
            d={`M${center},${center - radius} 
                A${radius},${radius} 0 0,1 ${center + radius},${center}`}
            stroke={color["forward"] || "rgba(255,255,255,0.5)"}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Right */}
          <path
            d={`M${center + radius},${center} 
                A${radius},${radius} 0 0,1 ${center},${center + radius}`}
            stroke={color["right"] || "rgba(255,255,255,0.5)"}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Bottom */}
          <path
            d={`M${center},${center + radius} 
                A${radius},${radius} 0 0,1 ${center - radius},${center}`}
            stroke={color["forward"] || "rgba(255,255,255,0.5)"}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Left */}
          <path
            d={`M${center - radius},${center} 
                A${radius},${radius} 0 0,1 ${center},${center - radius}`}
            stroke={color["left"] || "rgba(255,255,255,0.5)"}
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
