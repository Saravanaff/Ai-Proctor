import React, { useEffect, useState, useRef, useCallback } from "react";
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
import { getExamId, getUserId, setExamId } from "@/constants/AuthStore";
import LeftStepper from "./LeftStepper";
import axios from "axios";
import { useTheme } from "@/contexts/ThemeContext";
import { setExamSettings, getExamSettings } from "@/constants/examSettingsConsts";
import { loadMeshModel } from "@/lib/mediapipemodel";
import { headPos } from "@/utils/aiModel/headPos";
import { eye_direction } from "@/utils/aiModel/eyePos";
import { loadFaceModel } from "@/lib/facemodel"

import { storeEmbedding } from "@/utils/datastore";
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
  exam_id: string;
  stage: number;
  counter: number;
}

import styles from "./VideoComponent.module.css";

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
  // const [examSettings, setExamSettings] = useState<any>({});
  const [showTips, setShowTips] = useState(true);
  const [faceVisible, setFaceVisible] = useState<boolean>(false);

  const router = useRouter();
  const { theme } = useTheme();

  // const storedFaceDirection = useRef<string[]>([]);
  const [storedFaceDirection, setStoredFaceDirection] = useState<string[]>([]);
  const faceDirectionSequence = useRef<any>(["forward", "right", "left"]);
  const faceMatch = useRef<Boolean>(false);
  const stage = useRef(0);
  const counter = useRef(1);
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const userId = getUserId() || "unknown";
  const examId = getExamId();

  const lastVideoTimeRef = useRef<number>(-1);
  const lastObjTimeRef = useRef<number>(-1);
  const faceLandmarkerRef = useRef<any | null>(null);
  const objectDetectorRef = useRef<any | null>(null);
  const faceRegRef = useRef<any | null>(null);
  const embeddingsRef = useRef([]);



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


    // Check if face authentication is enabled
    const checkFaceAuthEnabled = async () => {
      try {
        const response = await axios.get(`${baseUrl}/getExamSettings`, {
          params: {
            userId: Number(userId),
            examId: Number(examId),
          },
        });

        if (response.data) {
          setExamSettings(response.data);

          // If face authentication is disabled, skip to next page
          if (!response.data.face_authentication_enabled) {
            console.log("Face authentication is disabled, skipping face scanning");
            cleanupCamera();

            // Navigate to appropriate page based on third_eye_enabled
            if (!response.data.third_eye_enabled) {
              router.push("/fullscreen");
            } else {
              router.push("/SetupThirdEye");
            }
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching exam settings:", error);
      }
    };

    checkFaceAuthEnabled();

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

        const { faceLandmarker, objectDetector } = await loadMeshModel();
        const faceReg = await loadFaceModel();
        faceLandmarkerRef.current = faceLandmarker;
        objectDetectorRef.current = objectDetector;
        faceRegRef.current = faceReg;

        console.log("✅ Models ready (stored in refs)");

        const userId: string | null = getUserId();
        const examId: string | null = getExamId();
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
                    exam_id: examId || "unknown",
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


        const calculateHeadPosition = (landmarks: any[]): string => {
          let head = headPos(landmarks);
          return head;
        };

        const calculateEyeGaze = (landmarks: any[]): string => {
          if (!landmarks || landmarks.length < 478) return 'unknown';

          let r_eye_direction = eye_direction(landmarks[163], landmarks[157], landmarks[471], landmarks[469], "right", 480, 480);
          let l_eye_direction = eye_direction(landmarks[390], landmarks[384], landmarks[474], landmarks[476], "left", 480, 480);

          let eyeDir = "center";

          if (r_eye_direction == "left" && l_eye_direction == "left") {
            eyeDir = "left";
          }
          else if (r_eye_direction == "right" && l_eye_direction == "right") {
            eyeDir = "right";
          }
          return eyeDir;
        };

        console.log("Loading reference image...");



        const detectFrame = async () => {
          if (!videoRef.current || !faceLandmarkerRef.current || !faceRegRef.current) return;
          try {
            const currentTime = videoRef.current.currentTime;
            if (currentTime !== lastVideoTimeRef.current) {
              lastVideoTimeRef.current = currentTime;
              const startTimeMs = performance.now();
              const results = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);



              if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
                const landmarks = results.faceLandmarks[0];

                const headPos = calculateHeadPosition(landmarks);
                console.log(`📍 Head Position: ${headPos}`);

                const eyeGaze = calculateEyeGaze(landmarks);
                console.log(`👁️ Eye Gaze: ${eyeGaze}`);

                let match = false;

                const liveDetection = await faceRegRef.current
                  .detectSingleFace(videoRef.current, new faceRegRef.current.TinyFaceDetectorOptions())
                  .withFaceLandmarks()
                  .withFaceDescriptor();







                if (headPos !== "unknown") {
                  setFaceVisible(true);
                }
                else {
                  setFaceVisible(false);
                }

                if (!liveDetection) {
                  console.warn("❌ No face descriptor detected in this frame.");
                  return;
                }

                if (headPos.toString().toLowerCase() ===
                  faceDirectionSequence.current[stage.current]) {
                  const descriptor = Array.from(liveDetection.descriptor);
                  embeddingsRef.current.push(descriptor);
                  console.log(embeddingsRef.current);
                  setStoredFaceDirection((prev) => [
                    ...prev,
                    headPos.toString().toLowerCase(),
                  ]);
                  stage.current++;
                  counter.current = 0;

                  if (stage.current >= faceDirectionSequence.current.length) {
                    console.log("Face direction sequence complete");
                    console.log("Final embeddings:", embeddingsRef.current);
                    storeEmbedding(embeddingsRef.current);
                    setIsComplete(true);
                    setShowOverlay(true);
                  }
                }
                const raw = (
                  typeof headPos === "string"
                    ? headPos
                    : headPos || ""
                )
                  ?.toString()
                  .toLowerCase();
                if (raw) {
                  if (raw.includes("left")) setDetectedDirection("left");
                  else if (raw.includes("right")) setDetectedDirection("right");
                  else setDetectedDirection("forward");
                }


              }
            }
          }
          catch (error) {
            console.log("faceLandmark Error: ", error);
          }
        };

        const detectLoop = () => {
          detectFrame();
          requestAnimationFrame(detectLoop);
        };
        requestAnimationFrame(detectLoop);

        const onFres = (data: any) => {
          console.log(
            data,
            " found :",
            data.face_found,
            " success :",
            data.success,
            " con: ",
            data.head_position?.toString().toLowerCase() ===
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
            data.head_position?.toString().toLowerCase() ===
            faceDirectionSequence.current[stage.current]
          ) {
            setStoredFaceDirection((prev) => [
              ...prev,
              data.head_position?.toString().toLowerCase(),
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
      <div className={styles.pageContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <div style={{ marginBottom: "20px", color: "var(--error-color)", fontSize: "18px" }}>{error}</div>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(true);
            // Reset cleanup flag to allow camera access
            isCleaningUpRef.current = false;
            // Force component remount by changing key or refresh page
            window.location.reload();
          }}
          className={styles.primaryButton}
          style={{ background: 'var(--success-color)' }}
        >
          Retry Camera Access
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
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
        <div className={styles.feedbackIndicator}>
          <div
            className={`${styles.indicatorDot} ${
              detectedDirection ===
              (faceDirectionSequence.current[stage.current] || "forward")
                ? styles.dotSuccess
                : styles.dotWarning
            }`}
          />
          <span className={styles.indicatorText}>
            {detectedDirection.charAt(0).toUpperCase() +
              detectedDirection.slice(1)}
          </span>
          {detectedDirection ===
            (faceDirectionSequence.current[stage.current] || "forward") && (
              <div className={styles.successCheck}>
                ✓
              </div>
            )}
        </div>
      )}

      {/* Modern face visibility indicator */}
      {!showTips && (
        <div
          className={`${styles.visibilityIndicator} ${
            faceVisible ? styles.visibilityVisible : styles.visibilityNotVisible
          }`}
        >
          <div
            className={`${styles.visibilityDot} ${
              faceVisible
                ? styles.visibilityDotVisible
                : styles.visibilityDotNotVisible
            }`}
          />
          {faceVisible ? "VISIBLE" : "NOT VISIBLE"}
        </div>
      )}

      {/* Minimal progress indicator */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${(stage.current / 3) * 100}%` }}
          />
        </div>
        <div className={styles.progressText}>
          {Math.min(stage.current + 1, 3)} / 3
        </div>
      </div>

      {/* Modern tips overlay */}
      {showTips && !isLoading && (
        <div className={styles.tipsOverlay}>
          <div className={styles.tipsTitle}>
            Face Verification
          </div>
          <div className={styles.tipsSubtitle}>
            Follow these steps for successful scanning
          </div>

          <div className={styles.tipsList}>
            {[
              "Keep your face centered within the circle",
              "Ensure your face remains visible during turns (Check with the indicator)",
              "Turn your head slowly and smoothly",
              "Rotate approximately 45° for side angles",
              "Follow the on-screen arrows and guidance",
            ].map((tip, index) => (
              <div key={index} className={styles.tipItem}>
                <div className={styles.tipNumber}>
                  {index + 1}
                </div>
                <span className={styles.tipText}>
                  {tip}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowTips(false)}
            className={styles.primaryButton}
          >
            Start Verification
          </button>
        </div>
      )}

      {isLoading && <LoadingIndicator message="Loading verification..." />}

      {showOverlay && isComplete && (
        <div className={styles.completionOverlay}>
          <div className={styles.completionCard}>
            <div className={styles.successIcon}>
              <div>✓</div>
            </div>

            <div className={styles.completionTitle}>
              Verification Complete
            </div>

            <div className={styles.completionSubtitle}>
              Face scanning completed successfully.
              <br />
              All verification steps have been validated.
            </div>

            <button
              className={styles.primaryButton}
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

                  if (response.data) {
                    setExamSettings(response.data);
                  }

                  if (!response.data.third_eye_enabled) {
                    router.push("/fullscreen");
                  } else {
                    router.push("/SetupThirdEye");
                  }
                } catch (error) {
                  console.error("Error fetching exam settings:", error);
                }
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