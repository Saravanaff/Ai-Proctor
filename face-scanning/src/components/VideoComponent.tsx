import React, { useEffect, useState, useRef } from "react";
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
import io from "socket.io-client";

const VideoComponent: React.FC<VideoComponentProps> = ({
  onScanComplete,
  customSteps,
  scanDuration = 2000,
}) => {
  const { videoRef, videoStream, isLoading, error }: any = useVideoStream();
  const [socket, setSocket] = useState<any>(null);
  const intervalRef = useRef<any>(null);
  const [circle,setCircle]=useState(false);

  useEffect(() => {
    if (videoStream) {
      const newSocket = io("http://localhost:3001");
      setSocket(newSocket);

      const videoTrack = videoStream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(videoTrack);

      intervalRef.current = setInterval(async () => {
        try {
          const bitmap = await imageCapture.grabFrame();

          const width = bitmap.width;
          const height = bitmap.height;

          const circle = {
            x: width / 2,
            y: height / 2,
            radius: Math.min(width, height) / 3, 
          };

          const boundingSize = circle.radius * 2;
          const canvas = document.createElement("canvas");
          canvas.width = boundingSize;
          canvas.height = boundingSize;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.beginPath();
          ctx.arc(circle.radius, circle.radius, circle.radius, 0, 2 * Math.PI);
          ctx.clip();

          ctx.drawImage(
            bitmap,
            circle.x - circle.radius,
            circle.y - circle.radius,
            boundingSize,
            boundingSize,
            0,
            0,
            boundingSize,
            boundingSize
          );

          canvas.toBlob((blob) => {
            if (blob) {
              blob.arrayBuffer().then((buffer) => {
                newSocket.emit("frame", {
                  buffer,
                  metadata: {
                    circle,
                    width: boundingSize,
                    height: boundingSize,
                  },
                });
              });
            }
          }, "image/jpeg", 0.7);
        } catch (err) {
          console.error("Frame capture error:", err);
        }
      }, 1000 / 30); 

      newSocket.on("fres", (data: any) => {
        console.log("receive",data);
        setCircle(data.face_found);
    });

      return () => {
        clearInterval(intervalRef.current);
        newSocket.disconnect();
      };
    }
  }, [videoStream]);

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
    const isDone = await handleScan();
    if (isDone && onScanComplete) {
      onScanComplete(scanResults);
    } else if (isDone) {
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
        <FaceDetectionOverlay faceDetected={circle} />
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
