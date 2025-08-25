import React from "react";
import { overlayStyles } from "../constants/scanConfig";

interface StepCounterProps {
  currentStep: number;
  totalSteps: number;
}

const StepCounter: React.FC<StepCounterProps> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <div
      className="theme-transition"
      style={{
        position: "absolute",
        top: "20px",
        right: "80px", // Adjusted to avoid overlapping with theme toggle
        zIndex: 15,
        backgroundColor: overlayStyles.colors.background,
        color: overlayStyles.colors.primary,
        padding: "8px 12px",
        borderRadius: "20px",
        fontSize: "14px",
        fontWeight: "500",
        border: "1px solid var(--border-color, rgba(255, 255, 255, 0.2))",
        backdropFilter: "blur(10px)",
      }}
    >
      Step {currentStep} of {totalSteps}
    </div>
  );
};

export default StepCounter;
