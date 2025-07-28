import { useState } from "react";
import { ScanStep, ScanResult } from "../types";

export const useScanFlow = (steps: ScanStep[], scanDuration: number = 1000) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isComplete,setIsComplete] = useState<boolean>(false);

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
    return currentStep >= steps.length;
  };

  const handleScan = async (): Promise<boolean> => {
    setIsScanning(true);

    return new Promise((resolve) => {
      setTimeout(() => {
        const result: ScanResult = {
          stepId: currentStep,
          timestamp: new Date(),
          success: true,
        };

        setScanResults((prev) => [...prev, result]);
        setIsScanning(false);

        const complete = handleNextStep();
        setIsComplete(complete)
        resolve(complete);
      }, scanDuration);
    });
  };

  const resetScan = () => {
    setCurrentStep(1);
    setIsScanning(false);
    setScanResults([]);
  };

  // console.log("curStep:",currentStep)

  return {
    currentStep,
    isScanning,
    scanResults,
    handleScan,
    resetScan,
    currentStepData: steps[currentStep - 1],
    isComplete,
  };
};
