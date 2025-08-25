import React from "react";

const ScanButton: any = ({
  call,
  isScanning,
  currentStep,
  totalSteps,
}: any) => {
  const getButtonText = () => {
    if (isScanning) return "Capturing...";
    if (currentStep === totalSteps) return "Complete Scan";
    return `Capture Step ${currentStep}`;
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: "120px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 15,
      }}
    >
      <button
        onClick={call}
        disabled={isScanning}
        className="theme-transition"
        style={{
          backgroundColor: isScanning
            ? "var(--button-bg, rgba(255, 255, 255, 0.3))"
            : "var(--accent-color, rgba(255, 255, 255, 0.9))",
          color: isScanning ? "var(--text-secondary, white)" : "white",
          border: "1px solid var(--border-color, transparent)",
          borderRadius: "25px",
          padding: "15px 30px",
          fontSize: "16px",
          fontWeight: "600",
          cursor: isScanning ? "not-allowed" : "pointer",
          minWidth: "120px",
          transition: "all 0.3s ease",
          boxShadow: "0 4px 12px var(--shadow, rgba(0, 0, 0, 0.2))",
        }}
      >
        {getButtonText()}
      </button>
    </div>
  );
};

export default ScanButton;
