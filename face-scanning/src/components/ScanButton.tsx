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
        style={{
          backgroundColor: isScanning
            ? "rgba(255, 255, 255, 0.3)"
            : "rgba(255, 255, 255, 0.9)",
          color: isScanning ? "white" : "#000",
          border: "none",
          borderRadius: "25px",
          padding: "15px 30px",
          fontSize: "16px",
          fontWeight: "600",
          cursor: isScanning ? "not-allowed" : "pointer",
          minWidth: "120px",
          transition: "all 0.3s ease",
        }}
      >
        {getButtonText()}
      </button>
    </div>
  );
};

export default ScanButton;
