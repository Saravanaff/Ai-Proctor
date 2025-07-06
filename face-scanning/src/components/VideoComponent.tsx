import React from "react";
import { VideoComponentProps } from "../types";
import { defaultScanSteps } from "../constants/scanConfig";
import { useVideoStream } from "../hooks/useVideoStream";
import { useScanFlow } from "../hooks/useScanFlow";
import {
  VideoStream,
  FaceDetectionOverlay,
  HeaderOverlay,
  FooterOverlay,
  StepCounter,
  ScanButton,
  LoadingIndicator,
} from "./";

const VideoComponent: React.FC<VideoComponentProps> = ({
  onScanComplete,
  customSteps,
  scanDuration = 2000,
}) => {
  const { videoRef, videoStream, isLoading, error } = useVideoStream();
  const steps = customSteps || defaultScanSteps;
  const {
    currentStep,
    isScanning,
    scanResults,
    handleScan,
    currentStepData,
    isComplete,
  } = useScanFlow(steps, scanDuration);

  const onScanClick = async () => {
    const isComplete = await handleScan();
    if (isComplete && onScanComplete) {
      onScanComplete(scanResults);
    } else if (isComplete) {
      alert("Face scanning completed!");
    }
  };

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "red",
          fontSize: "18px",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          height: "100vh",
          width: "100vw",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        <HeaderOverlay
          icon={currentStepData.icon}
          title={currentStepData.title}
          instruction={currentStepData.instruction}
        />

        <VideoStream videoRef={videoRef} videoStream={videoStream} />

        <FaceDetectionOverlay />

        <FooterOverlay description={currentStepData.description} />

        <StepCounter currentStep={currentStep} totalSteps={steps.length} />

        <ScanButton
          onScan={onScanClick}
          isScanning={isScanning}
          isLastStep={currentStep === steps.length}
        />

        {(isLoading || !videoStream) && (
          <LoadingIndicator
            message={isLoading ? "Accessing camera..." : "Camera not available"}
          />
        )}
      </div>
    </>
  );
};

export default VideoComponent;
