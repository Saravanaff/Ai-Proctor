import React from "react";
import { Camera, CheckCircle } from "lucide-react";

const ScanButton: any = ({
  call,
  isScanning,
  currentStep,
  totalSteps,
}: any) => {

  const currentTheme = {
    buttonActiveBg: "#3b82f6",
    buttonActiveShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    buttonDisabledBg: "rgba(203, 213, 225, 0.7)",
    buttonDisabledShadow: "none",
    progressBg: "rgba(226, 232, 240, 0.9)",
    progressFill: "#3b82f6",
    textPrimary: "#0f172a",
    textMuted: "#64748b",
  };

  const getButtonText = () => {
    if (isScanning) return "Capturing...";
    if (currentStep === totalSteps) return "Complete Scan";
    return `Capture Step ${currentStep}`;
  };

  const progress = ((currentStep - 1) / totalSteps) * 100;

  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: "120px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 15,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* Progress Bar */}
        {currentStep > 1 && (
          <div style={{
            width: "200px",
            height: "6px",
            borderRadius: "100px",
            background: currentTheme.progressBg,
            backdropFilter: "blur(10px)",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            transition: "all 0.3s ease",
          }}>
            <div style={{
              width: `${progress}%`,
              height: "100%",
              background: currentTheme.progressFill,
              borderRadius: "100px",
              transition: "width 0.4s ease",
              boxShadow: "0 0 8px rgba(59, 130, 246, 0.6)",
            }} />
          </div>
        )}

        {/* Scan Button */}
        <button
          onClick={call}
          disabled={isScanning}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: isScanning ? currentTheme.buttonDisabledBg : currentTheme.buttonActiveBg,
            color: "white",
            border: "none",
            borderRadius: "100px",
            padding: "16px 32px",
            fontSize: "16px",
            fontWeight: "700",
            cursor: isScanning ? "not-allowed" : "pointer",
            minWidth: "180px",
            justifyContent: "center",
            transition: "all 0.3s ease",
            boxShadow: isScanning ? currentTheme.buttonDisabledShadow : currentTheme.buttonActiveShadow,
            opacity: isScanning ? 0.6 : 1,
            backdropFilter: "blur(20px)",
          }}
          onMouseEnter={(e) => {
            if (!isScanning) {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(59, 130, 246, 0.5)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = currentTheme.buttonActiveShadow;
          }}
        >
          {isScanning ? (
            <div style={{
              width: "20px",
              height: "20px",
              border: "3px solid rgba(255, 255, 255, 0.3)",
              borderTop: "3px solid white",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
          ) : currentStep === totalSteps ? (
            <CheckCircle size={20} strokeWidth={2.5} />
          ) : (
            <Camera size={20} strokeWidth={2.5} />
          )}
          {getButtonText()}
        </button>

        {/* Step Counter */}
        <div style={{
          fontSize: "13px",
          fontWeight: "600",
          color: currentTheme.textMuted,
          background: currentTheme.progressBg,
          backdropFilter: "blur(10px)",
          padding: "6px 16px",
          borderRadius: "100px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
          transition: "all 0.3s ease",
        }}>
          Step {currentStep} of {totalSteps}
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default ScanButton;
