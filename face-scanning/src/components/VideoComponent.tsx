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
} from "@/components";
import { Device } from "mediasoup-client";

import { useRouter } from "next/router";
import socket from "./socket";
import * as mediasoupClient from "mediasoup-client";
import { getUserId } from "@/constants/AuthStore";
import LeftStepper from "./LeftStepper";
import axios from "axios";
import { useTheme } from "@/contexts/ThemeContext";

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
  stage: number;
  counter: number;
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
  const [showOverlay, setShowOverlay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedDirection, setDetectedDirection] = useState<
    "forward" | "right" | "left" | null
  >(null);
  const [isComplete, setIsComplete] = useState(false);
  const [examSettings, setExamSettings] = useState<any>({});
  const [showTips, setShowTips] = useState(true);
  const [faceVisible, setFaceVisible] = useState<boolean>(false);

  const router = useRouter();
  const { theme } = useTheme();

  // const storedFaceDirection = useRef<string[]>([]);
  const [storedFaceDirection, setStoredFaceDirection] = useState<string[]>([]);
  const faceDirectionSequence = useRef<any>(["forward", "right", "left"]);
  const stage = useRef(0);
  const counter = useRef(1);
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const userId = getUserId() || "unknown";
  const examId = localStorage.getItem("examId");

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

        const userId: string | null = getUserId();
        const onInterval = (
          video: HTMLVideoElement,
          userId: string | null,
          socketName: string
        ): void => {
          if (!video || video.readyState < 2 || isComplete) return;

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
                    counter: counter.current,
                    stage: stage.current,
                  };

                  socket.emit(socketName, frameData);
                });
              }
            },
            "image/jpeg",
            0.7
          );
        };

        intervalRef.current = setInterval(
          () => onInterval(video, userId, "frame"),
          1000 / 15
        );

        const onFres = (data: any) => {
          console.log(
            data,
            " found :",
            data.face_found,
            " success :",
            data.success,
            " con: ",
            data.head_position.toLowerCase() ===
              faceDirectionSequence.current[stage.current]
          );

          // Update face visibility
          setFaceVisible(data.face_found || false);

          if (!data.success) {
            counter.current = data.counter;
          }
          if (
            data.face_found &&
            data.success &&
            data.head_position.toLowerCase() ===
              faceDirectionSequence.current[stage.current]
          ) {
            setStoredFaceDirection((prev) => [
              ...prev,
              data.head_position.toLowerCase(),
            ]);
            stage.current++;
            counter.current = 0;

            if (stage.current >= faceDirectionSequence.current.length) {
              console.log("Face direction sequence complete");
              setIsComplete(true);
              setShowOverlay(true);
            }
          }
          // console.log(data);
          // setCircle(data.face_found);
          // Normalize direction if provided
          const raw = (
            typeof data?.direction === "string"
              ? data.direction
              : data?.head_position || ""
          )
            ?.toString()
            .toLowerCase();
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

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--error-color)",
          fontSize: "18px",
          padding: "20px",
          textAlign: "center",
          background: "var(--background)",
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
            background: "var(--success-color)",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            transition: "all 0.3s ease",
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
        background: "var(--background)",
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
          const state = faceDirectionSequence.current.length < stage.current ? "done" : stepNo === stage.current ? "current" : "pending";
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
      <LeftStepper
        faceDirectionSequence={faceDirectionSequence}
        stage={stage}
      />

      <VideoStream videoRef={videoRef} />

      <FaceDetectionOverlay
        storedFaceDirection={storedFaceDirection}
        expectedDirection={
          faceDirectionSequence.current.length > stage.current
            ? faceDirectionSequence.current[stage.current]
            : null
        }
      />

      {/* Modern feedback indicator */}
      {detectedDirection && (
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 24,
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 16,
            padding: "10px 14px",
            color: "var(--text-primary)",
            fontSize: 13,
            fontWeight: 600,
            zIndex: 50,
            backdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 32px var(--shadow)",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background:
                detectedDirection ===
                (faceDirectionSequence.current[stage.current] || "forward")
                  ? "var(--success-color)"
                  : "var(--warning-color)",
              boxShadow:
                detectedDirection ===
                (faceDirectionSequence.current[stage.current] || "forward")
                  ? "0 0 8px var(--success-bg)"
                  : "0 0 8px var(--warning-bg)",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ opacity: 0.8 }}>
            {detectedDirection.charAt(0).toUpperCase() +
              detectedDirection.slice(1)}
          </span>
          {detectedDirection ===
            (faceDirectionSequence.current[stage.current] || "forward") && (
            <div
              style={{
                background: "var(--success-color)",
                borderRadius: "50%",
                width: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "white",
              }}
            >
              ✓
            </div>
          )}
        </div>
      )}

      {/* Modern face visibility indicator */}
      {!showTips && (
        <div
          style={{
            position: "absolute",
            top: 116,
            right: 24,
            background: faceVisible ? "var(--success-bg)" : "var(--error-bg)",
            border: `1px solid ${
              faceVisible ? "var(--success-color)" : "var(--error-color)"
            }`,
            borderRadius: 12,
            padding: "6px 10px",
            color: faceVisible ? "var(--success-color)" : "var(--error-color)",
            fontSize: 11,
            fontWeight: 600,
            zIndex: 50,
            backdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.3s ease",
            letterSpacing: "0.3px",
          }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: faceVisible
                ? "var(--success-color)"
                : "var(--error-color)",
              animation: faceVisible ? "none" : "pulse 1.5s infinite",
            }}
          />
          {faceVisible ? "VISIBLE" : "NOT VISIBLE"}
        </div>
      )}

      {/* Minimal progress indicator */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
        }}
      >
        <div
          style={{
            width: 180,
            height: 2,
            background: "var(--border-color)",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${(stage.current / 3) * 100}%`,
              height: "100%",
              background: "var(--accent-color)",
              borderRadius: 1,
              transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 0 8px var(--accent-color)",
            }}
          />
        </div>
        <div
          style={{
            textAlign: "center",
            marginTop: 8,
            fontSize: 12,
            fontWeight: 500,
            color: "var(--border-color)",
            letterSpacing: "0.5px",
          }}
        >
          {Math.min(stage.current + 1, 3)} / 3
        </div>
      </div>

      {/* Modern tips overlay */}
      {showTips && !isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--modal-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 24,
            padding: "32px",
            color: "var(--text-primary)",
            zIndex: 70,
            backdropFilter: "blur(24px)",
            maxWidth: "420px",
            textAlign: "center",
            boxShadow: "0 25px 50px var(--shadow)",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 8,
              background: "var(--accent-color)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "var(--accent-color)",
              letterSpacing: "-0.5px",
            }}
          >
            Face Verification
          </div>
          <div
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginBottom: 24,
              fontWeight: 500,
            }}
          >
            Follow these steps for successful scanning
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.8,
              marginBottom: 28,
              textAlign: "left",
            }}
          >
            {[
              "Keep your face centered within the circle",
              "Ensure your face remains visible during turns (Check with the indicator)",
              "Turn your head slowly and smoothly",
              "Rotate approximately 45° for side angles",
              "Follow the on-screen arrows and guidance",
            ].map((tip, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "var(--accent-color)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "white",
                    fontWeight: 600,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {index + 1}
                </div>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                  {tip}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowTips(false)}
            style={{
              background: "var(--accent-color)",
              color: "white",
              border: "none",
              borderRadius: 16,
              padding: "14px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 8px 25px var(--shadow)",
              letterSpacing: "0.3px",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.filter = "brightness(1.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            Start Verification
          </button>
        </div>
      )}

      {isLoading && <LoadingIndicator message="Accessing camera..." />}

      {showOverlay && isComplete && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "var(--overlay-bg)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              background: "var(--modal-bg)",
              borderRadius: 32,
              padding: "48px",
              textAlign: "center",
              border: "1px solid var(--border-color)",
              boxShadow: "0 32px 64px var(--shadow)",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "var(--success-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                boxShadow: "0 16px 32px var(--success-bg)",
              }}
            >
              <div style={{ fontSize: 36, color: "white" }}>✓</div>
            </div>

            <div
              style={{
                marginBottom: 16,
                fontSize: 36,
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "-1px",
              }}
            >
              Verification Complete
            </div>

            <div
              style={{
                marginBottom: 32,
                fontSize: 16,
                color: "var(--text-secondary)",
                fontWeight: 500,
                lineHeight: 1.6,
              }}
            >
              Face scanning completed successfully.
              <br />
              All verification steps have been validated.
            </div>

            <button
              className="click"
              onClick={async () => {
                try {
                  console.log(
                    "Entering exam, cleaning up camera before navigation"
                  );
                  cleanupCamera();

                  const response = await axios.get(
                    `${baseUrl}/getExamSettings`,
                    {
                      params: {
                        userId: Number(userId),
                        examId: Number(examId),
                      },
                    }
                  );

                  if (!response.data.third_eye_enabled) {
                    router.push("/fullscreen");
                  } else {
                    router.push("/SetupThirdEye");
                  }
                } catch (error) {
                  console.error("Error fetching exam settings:", error);
                }
              }}
              style={{
                background: "var(--accent-color)",
                color: "white",
                border: "none",
                borderRadius: 16,
                padding: "16px 32px",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 12px 24px var(--shadow)",
                letterSpacing: "0.3px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.filter = "brightness(1.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.filter = "brightness(1)";
              }}
            >
              Continue to Exam Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoComponent;
