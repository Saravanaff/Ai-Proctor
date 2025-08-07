import React, { useEffect, useState, useRef } from "react";
import { VideoComponentProps } from "../types";
import { defaultScanSteps } from "../constants/scanConfig";
import { useScanFlow } from "../hooks/useScanFlow";
import { gname } from "./GetName";
import {
  VideoStream,
  FaceDetectionOverlay,
  HeaderOverlay,
  FooterOverlay,
  StepCounter,
  ScanButton,
  LoadingIndicator,
} from "./";
import { useRouter } from "next/router";
import socket from "./socket";

const VideoComponent: React.FC<VideoComponentProps> = ({
  onScanComplete,
  customSteps,
  scanDuration = 2000,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<any>(null);
  const [circle, setCircle] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let stream: MediaStream;
    const video = videoRef.current;
    if (!video) return;

    const setup = async () => {
      try {
        setIsLoading(true);
        if (video.srcObject) {
          (video.srcObject as MediaStream)
            .getTracks()
            .forEach((track) => track.stop());
          video.srcObject = null;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        video.srcObject = stream;
        setIsLoading(false);

        intervalRef.current = setInterval(() => {
          if (!video || video.readyState < 2) return;

          const width = video.videoWidth;
          const height = video.videoHeight;
          const radius = Math.min(width, height) / 3;

          const circle = {
            x: width / 2,
            y: height / 2,
            radius,
          };

          const boundingSize = radius * 2;
          const canvas = document.createElement("canvas");
          canvas.width = boundingSize;
          canvas.height = boundingSize;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.beginPath();
          ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
          ctx.clip();

          ctx.drawImage(
            video,
            circle.x - radius,
            circle.y - radius,
            boundingSize,
            boundingSize,
            0,
            0,
            boundingSize,
            boundingSize
          );

          canvas.toBlob(
            (blob) => {
              if (blob) {
                blob.arrayBuffer().then((buffer) => {
                  socket.emit("frame", {
                    buffer,
                    metadata: {
                      circle,
                      width: boundingSize,
                      height: boundingSize,
                    },
                  });
                });
              }
            },
            "image/jpeg",
            0.7
          );
        }, 1000 / 30);

        socket.on("fres", (data: any) => {
          console.log("Face Detection Result:", data);
          setCircle(data.face_found);
        });
      } catch (err) {
        console.error("Camera setup failed:", err);
        setError("Unable to access camera");
        setIsLoading(false);
      }
    }
    
    setup();

    return () => {
      // socket.off("fres", () => {
      //   console.log("Face Detection Result listener removed");
      // })
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capturePhoto = (stepId: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return resolve(null);

      const width = video.videoWidth;
      const height = video.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            blob.arrayBuffer().then((buffer) => {
              socket.emit("photo-save", {
                buffer,
                name: `${gname}`,
                angle: stepId,
              });
            });

            setShowSuccess(true);

            setTimeout(() => {
              setShowSuccess(false);
              // setShowOverlay(true);
            }, 1000);

            resolve(blob);
          } else {
            resolve(null);
          }
        },
        "image/jpeg",
        0.9
      );
    });
  };

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

    await capturePhoto(currentStep);

    const isDone = await handleScan();

    if (isDone) {

      const video = videoRef.current;
      if (video && video.srcObject) {
        const mediaStream = video.srcObject as MediaStream;
        mediaStream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      setShowOverlay(true);

      if (onScanComplete) {
        onScanComplete(scanResults);
      }
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

      <VideoStream videoRef={videoRef} />

      <FaceDetectionOverlay faceDetected={circle} showSuccess={showSuccess} />
      <FooterOverlay description={currentStepData.description} />
      <StepCounter currentStep={currentStep} totalSteps={steps.length} />
      <ScanButton
        call={onScanClick}
        isScanning={isScanning}
        currentStep={currentStep}
        totalSteps={steps.length}
      />

      {isLoading && <LoadingIndicator message="Accessing camera..." />}

      {showOverlay && isComplete && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            fontSize: "24px",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "20px", fontSize: "32px" }}>
            Face Scanning Complete!
          </div>
          <div style={{ marginBottom: "30px", fontSize: "16px", opacity: 0.8 }}>
            All verification steps completed successfully
          </div>
          <button
            className="click"
            onClick={() => router.push("/fullscreen")}
            style={{
              padding: "15px 30px",
              fontSize: "18px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "background-color 0.3s ease",
            }}
          >
            Enter Exam
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoComponent;
