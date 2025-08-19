import { useState } from "react";
import { ScanStep, ScanResult } from "../types";
import socket from "@/components/socket";

export const useScanFlow = (steps: ScanStep[], scanDuration: number = 1000) => {
  // const [currentStep, setCurrentStep] = useState(1);
  // const [isScanning, setIsScanning] = useState(false);
  // const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // const handleNextStep = () => {
  //   if (currentStep < steps.length) {
  //     setCurrentStep((prev) => prev + 1);
  //   }
  //   return currentStep >= steps.length;
  // };

  const handleScan = async () => {
    console.log("scanning..");

    const handleFaceSaveStatus = (data: any) => {
        console.log(data);
        if (data.status) {
          // const result: ScanResult = {
          //   stepId: currentStep,
          //   timestamp: new Date(),
          //   success: true,
          // };
          // setScanResults((prev) => [...prev, result]);
          // setIsScanning(false);

          // const complete = handleNextStep();
          // setIsComplete(complete);

          // Remove the listener to avoid memory leaks
          // socket.off("face_save_status", handleFaceSaveStatus);
          // resolve(complete);
        }
        else{

          // setIsComplete(true);
          // setIsScanning(false);
          // socket.off("face_save_status",handleFaceSaveStatus);
          // resolve(false);
        }
      };
      socket.on("result", handleFaceSaveStatus);
  };
  // handleScan();

  // const resetScan = () => {
  //   setCurrentStep(1);
  //   setIsScanning(false);
  //   setScanResults([]);
  // };

  // console.log("curStep:",currentStep)

  return {
    isComplete,
  };
};
