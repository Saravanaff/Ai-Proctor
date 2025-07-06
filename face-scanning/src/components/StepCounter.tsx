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
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        zIndex: 15,
        backgroundColor: overlayStyles.colors.background,
        color: overlayStyles.colors.primary,
        padding: "8px 12px",
        borderRadius: "20px",
        fontSize: "14px",
        fontWeight: "500",
      }}
    >
      Step {currentStep} of {totalSteps}
    </div>
  );
};

export default StepCounter;
