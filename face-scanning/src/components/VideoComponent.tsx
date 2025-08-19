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
import { Device } from "mediasoup-client";

import { useRouter } from "next/router";
import socket from "./socket";
import * as mediasoupClient from "mediasoup-client";
import { getUserId } from "@/constants/AuthStore";



interface CircleMetadata {
    x: number;
    y: number;
    radius: number;
}

interface FrameMetadata {
    circle: CircleMetadata;
    width: number;
    height: number;
}

interface SocketFrameData {
    buffer: ArrayBuffer;
    metadata: FrameMetadata;
    user_id: string;
}




const VideoComponent: React.FC<VideoComponentProps> = ({
  onScanComplete,
  customSteps,
  scanDuration = 2000,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sendTransportRef = useRef<any>(null);
  const deviceRef = useRef<mediasoupClient.Device | null>(null);
  const isCleaningUpRef = useRef(false);
  const [circle, setCircle] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedDirection, setDetectedDirection] = useState<"forward" | "right" | "left" | null>(null);
  const router = useRouter();

  // const storedFaceDirection = useRef<string[]>([]);
  const [storedFaceDirection, setStoredFaceDirection] = useState<string[]>([]);
  const faceDirectionSequence = useRef<any>(["forward","up","right","down","left"]);
  const currentDirectionIndex = useRef(0);

  // Centralized cleanup function
  const cleanupCamera = () => {
    if (isCleaningUpRef.current) {
      console.log("Cleanup already in progress, skipping...");
      return;
    }
    isCleaningUpRef.current = true;

    console.log("Starting camera cleanup...");

    // Stop interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop video element
    const video = videoRef.current;
    if (video) {
      video.pause();
      if (video.srcObject) {
        const mediaStream = video.srcObject as MediaStream;
        mediaStream.getTracks().forEach((track) => {
          console.log(
            `Stopping video track: ${track.kind}, state: ${track.readyState}`
          );
          track.stop();
        });
      }
      video.srcObject = null;
    }

    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log(
          `Stopping stream track: ${track.kind}, state: ${track.readyState}`
        );
        track.stop();
      });
      streamRef.current = null;
    }

    // Close transport
    if (sendTransportRef.current) {
      console.log("Closing send transport");
      try {
        sendTransportRef.current.close();
      } catch (e) {
        console.warn("Error closing transport:", e);
      }
      sendTransportRef.current = null;
    }

    // Clean up device
    if (deviceRef.current) {
      deviceRef.current = null;
    }

    // Remove socket listeners
    // try {
    //   socket.off("fres");
    // } catch (e) {
    //   console.warn("Error removing socket listener:", e);
    // }

    console.log("Camera cleanup completed");

    // Reset cleanup flag after a longer delay to ensure cleanup is complete
    setTimeout(() => {
      console.log("Resetting cleanup flag");
      isCleaningUpRef.current = false;
    }, 2000);
  };

  useEffect(() => {
    console.log("Video component mounting...");
    let stream: MediaStream;
    const video = videoRef.current;
    let device: mediasoupClient.Device;
    let isMounted = true;

    if (!video) return;

    const initiateMediaSoup = async () => {
      try {
        setIsLoading(true);

        // Reset cleanup flag when starting fresh
        isCleaningUpRef.current = false;

        console.log("Requesting camera access...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });

        // Check if component was unmounted while waiting for camera
        if (!isMounted || isCleaningUpRef.current) {
          console.log(
            "Component unmounted or cleanup in progress, stopping stream"
          );
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        console.log("Camera access granted, setting up video stream");
        video.srcObject = stream;
        streamRef.current = stream;
        setIsLoading(false);

        const { rtpCapabilities } = await socket.emitWithAck(
          "getRtpCapabilities"
        );

        console.log("RTP Capabilities:", rtpCapabilities);

        try {
          device = new Device();
          deviceRef.current = device;
        } catch (error) {
          console.error("Failed to create mediasoup client device:", error);
          setError("Unable to initialize video stream");
          setIsLoading(false);
          return;
        }

        await device.load({ routerRtpCapabilities: rtpCapabilities });

        let transportOptions = await socket.emitWithAck(
          "createWebRtcTransport",
          {
            direction: "send",
          }
        );

        let sendTransport = device.createSendTransport(transportOptions);

        sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
          socket.emit(
            "connectTransport",
            {
              transportId: sendTransport.id,
              dtlsParameters,
            },
            callback
          );
        });

        sendTransport.on(
          "produce",
          async ({ kind, rtpParameters }, callback, errback) => {
            try {
              const { id } = await socket.emitWithAck("produce", {
                transportId: sendTransport.id,
                kind,
                rtpParameters,
              });
              callback({ id });
            } catch (error) {
              console.error("Produce error:", error);
              errback(
                error instanceof Error ? error : new Error(String(error))
              );
            }
          }
        );

        const videoTrack = stream.getVideoTracks()[0];
        await sendTransport.produce({ track: videoTrack });

        sendTransportRef.current = sendTransport;


        const userId : string | null = getUserId();
        const onInterval = (video: HTMLVideoElement, userId: string | null, socketName: string): void => {

          if (!video || video.readyState < 2) return;

          const width: number = video.videoWidth;
          const height: number = video.videoHeight;
          const radius: number = Math.min(width, height) / 3;

          const circle: CircleMetadata = {
            x: width / 2,
            y: height / 2,
            radius,
          };

          const boundingSize: number = radius * 2;
          const canvas: HTMLCanvasElement = document.createElement("canvas");
          canvas.width = boundingSize;
          canvas.height = boundingSize;

          const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
          if (!ctx) return;

          // ctx.beginPath();
          // ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
          // ctx.clip();

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
            (blob: Blob | null) => {
              if (blob) {
                blob.arrayBuffer().then((buffer: ArrayBuffer) => {
                    const frameData: SocketFrameData = {
                    buffer,
                    metadata: {
                        circle,
                        width: boundingSize,
                        height: boundingSize,
                    },
                    user_id: userId || "unknown",
                    };
                    socket.emit(socketName, frameData);
                });
              }
            },
            "image/jpeg",
            0.7
          );
        }

        intervalRef.current = setInterval(() => onInterval(video,userId,"frame"), 1000 / 30);


        const onFres = (data: any) => {
          // console.log(data," found :",data.face_found," success :",data.success," con: ",(data.head_position.toLowerCase() === faceDirectionSequence.current[currentDirectionIndex.current]));
          if(data.face_found && data.success && (data.head_position.toLowerCase() === faceDirectionSequence.current[currentDirectionIndex.current])){
            setStoredFaceDirection((prev) => [...prev, data.head_position.toLowerCase()]);
            console.log("Face Saved for ",data.head_position.toLowerCase())
            currentDirectionIndex.current++;
          }
          // console.log(data);
          setCircle(data.face_found);
          // Normalize direction if provided
          const raw = (typeof data?.direction === "string" ? data.direction : (data?.head_position || ""))?.toString().toLowerCase();
          if (raw) {
            if (raw.includes("left")) setDetectedDirection("left");
            else if (raw.includes("right")) setDetectedDirection("right");
            else setDetectedDirection("forward");
          }
          // ...existing toast logic optionally...
        };
        socket.on("fres", onFres);
      } catch (err) {
        console.error("Camera setup failed:", err);
        const error = err as Error;
        if (error.name === "NotAllowedError") {
          setError(
            "Camera access denied. Please allow camera permissions and refresh the page."
          );
        } else if (error.name === "NotFoundError") {
          setError(
            "No camera found. Please connect a camera and refresh the page."
          );
        } else if (error.name === "NotReadableError") {
          setError(
            "Camera is busy. Please close other applications using the camera and refresh the page."
          );
        } else {
          setError(
            "Unable to access camera. Please check your camera permissions and try again."
          );
        }
        setIsLoading(false);

        // Clean up on error
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    };

    initiateMediaSoup();

    // Cleanup function
    return () => {
      console.log("VideoComponent cleanup triggered");
      isMounted = false;
      cleanupCamera();
    };
  }, []);

  // Also cleanup on route change
  useEffect(() => {
    const handleRouteChange = () => {
      console.log("Route changing, cleaning up camera");
      cleanupCamera();
    };

    router.events.on("routeChangeStart", handleRouteChange);

    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router]);

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
                user_id: getUserId() || "unknown",
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

  const steps = defaultScanSteps;
  const {
    
    isComplete,
  } = useScanFlow(steps, scanDuration);

  // const total = steps.length;
  // const progressPct = Math.min(100, Math.max(0, Math.round(((currentStep - 1) / total) * 100)));
  // const expectedDirection = currentStep === 1 ? "forward" : currentStep === 2 ? "right" : "left";
  // const eligible = circle && detectedDirection === expectedDirection;


  // const onScanClick = async () => {
  //   await capturePhoto(currentStep);

  //   const isDone = await handleScan();

  //   if (isDone) {
  //     console.log("Scan completed, cleaning up camera");

  //     // Use centralized cleanup
  //     cleanupCamera();

  //     setShowOverlay(true);

  //     if (onScanComplete) {
  //       onScanComplete(scanResults);
  //     }
  //   }
  // };

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "red",
          fontSize: "18px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: "20px" }}>{error}</div>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(true);
            // Reset cleanup flag to allow camera access
            isCleaningUpRef.current = false;
            // Force component remount by changing key or refresh page
            window.location.reload();
          }}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Retry Camera Access
        </button>
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
        backgroundColor: "#0b0f14",
      }}
    >
      {/* Top progress bar */}
      {/* <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 8,
          backgroundColor: "#111827",
          zIndex: 60,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            backgroundColor: "#22c55e",
            transition: "width .3s ease",
          }}
        />
      </div> */}
      
      {/* Left stepper */}
      {/* <div
        style={{
          position: "absolute",
          top: 60,
          left: 16,
          zIndex: 60,
          background: "rgba(17,24,39,0.7)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
          padding: 12,
          width: 260,
          color: "#e5e7eb",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Verification Steps</div>
        {["Face Forward", "Turn Right", "Turn Left"].map((label, idx) => {
          const stepNo = idx + 1;
          const state = stepNo < currentStep ? "done" : stepNo === currentStep ? "current" : "pending";
          const color = state === "done" ? "#22c55e" : state === "current" ? "#0ea5e9" : "#4b5563";
          return (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, background: state === "current" ? "rgba(14,165,233,0.12)" : "transparent" }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{state === "done" ? "✓" : stepNo}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{stepNo === 1 ? "Look directly at the camera" : stepNo === 2 ? "Turn your head to the right" : "Turn your head to the left"}</span>
              </div>
            </div>
          );
        })}
      </div> */}

      {/* <HeaderOverlay
        icon={currentStepData.icon}
        title={currentStepData.title}
        instruction={currentStepData.instruction}
      /> */}

      <VideoStream videoRef={videoRef} />

      <FaceDetectionOverlay
        storedFaceDirection={storedFaceDirection}
      />
      {/* <FooterOverlay description={currentStepData.description} /> */}
      {/* <StepCounter currentStep={currentStep} totalSteps={steps.length} /> */}
      {/* <ScanButton
        call={onScanClick}
        isScanning={isScanning}
        currentStep={currentStep}
        totalSteps={steps.length}
      /> */}

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
          <div style={{ marginBottom: 20, fontSize: 32 }}>
            Face Scanning Complete!
          </div>
          <div style={{ marginBottom: 30, fontSize: 16, opacity: 0.8 }}>
            All verification steps completed successfully.
          </div>
          <button
            className="click"
            onClick={() => {
              console.log(
                "Entering exam, cleaning up camera before navigation"
              );
              cleanupCamera();
              router.push("/fullscreen");
            }}
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