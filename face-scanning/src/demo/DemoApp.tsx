import React from "react";
import VideoComponent from "../components/VideoComponent";
import { ScanResult, ScanStep } from "../types";

// Example of custom scan steps
const customScanSteps: ScanStep[] = [
  {
    id: 1,
    title: "Identity Verification",
    instruction: "Look directly at the camera",
    description: "Please position your face in the center",
    icon: "🆔",
  },
  {
    id: 2,
    title: "Profile Check",
    instruction: "Turn your head to the right",
    description: "Show your right side profile",
    icon: "📱",
  },
  {
    id: 3,
    title: "Final Verification",
    instruction: "Turn your head to the left",
    description: "Show your left side profile",
    icon: "✅",
  },
];

const DemoApp: React.FC = () => {
  const handleScanComplete = (results: ScanResult[]) => {
    console.log("Scan completed with results:", results);
    // Process the scan results here
    alert(`Scan completed! ${results.length} steps processed.`);
  };

  return (
    <div>
      <VideoComponent onScanComplete={handleScanComplete} />
      {/* 
      <VideoComponent 
        onScanComplete={handleScanComplete}
        customSteps={customScanSteps}
        scanDuration={3000}
      />
      */}
    </div>
  );
};

export default DemoApp;
