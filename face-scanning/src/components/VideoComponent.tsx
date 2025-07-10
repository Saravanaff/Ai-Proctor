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
import { useRouter } from "next/router";
import io from "socket.io-client";

const VideoComponent: React.FC<VideoComponentProps> = ({
  onScanComplete,
  customSteps,
  scanDuration = 2000,
}) => {
  const { videoRef, videoStream, isLoading, error }: any = useVideoStream();
  const [socket, setSocket] = useState<any>(null);
  const intervalRef = useRef<any>(null);
  const [circle, setCircle] = useState(false);
  const [name, setName] = useState("sriram");
  const router=useRouter();

  const [showSuccess, setShowSuccess] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    let stream: MediaStream;
    const video = videoRef.current;
    if (!video) return;

    const setup = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        video.srcObject = stream;

        const socket = io("http://localhost:3001");
        setSocket(socket);

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

          canvas.toBlob((blob) => {
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
          }, "image/jpeg", 0.7);
        }, 1000 / 30);

        socket.on("fres", (data: any) => {
          setCircle(data.face_found);
        });
      } catch (err) {
        console.error("Camera setup failed:", err);
      }
    };

    setup();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capturePhoto = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      clearInterval(intervalRef.current);
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

      canvas.toBlob((blob) => {
        if (blob) {
          blob.arrayBuffer().then((buffer) => {
            socket.emit("photo-save", {
              buffer,
              name: name,
            });
          });

          setShowSuccess(true);

          setTimeout(() => {
            setShowSuccess(false);
            setShowOverlay(true);
          }, 1000);
          resolve(blob);
        }
        else{
          resolve(null);
        }
      }, "image/jpeg", 0.9);
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

        <FaceDetectionOverlay faceDetected={circle} showSuccess={showSuccess} />

        <FooterOverlay description={currentStepData.description} />
        <StepCounter currentStep={currentStep} totalSteps={steps.length} />

        <ScanButton call={capturePhoto} isScanning={false} />

        {(isLoading || !videoStream) && (
          <LoadingIndicator
            message={isLoading ? "Accessing camera..." : "Camera not available"}
          />
        )}

        {showOverlay && (
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
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
              fontSize: "40px",
              fontWeight: "bold",
            }}
          >
            <button className="click" onClick={()=>router.push('/fullscreen')}>Enter Exam</button>
          </div>
        )}
      </div>
    </>
  );
};

export default VideoComponent;
