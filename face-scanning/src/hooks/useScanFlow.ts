import { useState } from "react";
import { ScanStep, ScanResult } from "../types";

export const useScanFlow = (steps: ScanStep[], scanDuration: number = 2000) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
    return currentStep >= steps.length;
  };

  const handleScan = async (): Promise<boolean> => {
    setIsScanning(true);

    // Simulate scanning process
    return new Promise((resolve) => {
      setTimeout(() => {
        const result: ScanResult = {
          stepId: currentStep,
          timestamp: new Date(),
          success: true,
        };

        setScanResults((prev) => [...prev, result]);
        setIsScanning(false);

        const isComplete = handleNextStep();
        resolve(isComplete);
      }, scanDuration);
    });
  };

  const resetScan = () => {
    setCurrentStep(1);
    setIsScanning(false);
    setScanResults([]);
  };

  return {
    currentStep,
    isScanning,
    scanResults,
    handleScan,
    resetScan,
    currentStepData: steps[currentStep - 1],
    isComplete: currentStep > steps.length,
  };
};
