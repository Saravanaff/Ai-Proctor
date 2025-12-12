import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import styles from "../styles/FloatingCamera.module.css";
import { useToast } from "@/hooks/use-toast";
import useSoundLevel from "@/hooks/useSoundLevel";
import {
  getExamId,
  getUserId,
  getTokenFromCookie,
} from "../constants/AuthStore";
import axios from "axios";
import { getExamSettings } from "@/constants/examSettingsConsts";
import { closeModels } from "@/lib/modelManager";

const userId = getUserId() || "unknown";
const examId = getExamId();
const examSettings = getExamSettings();
const baseUrlGlobal = process.env.NEXT_PUBLIC_BACKEND_URL;

// Helper function to log violations to API
const logViolation = async (violationName: string) => {
  try {
    // ✅ Subtract 2 seconds because violation started 2 frames ago (at ~2 second interval)
    const actualViolationTime = new Date(Date.now());

    await axios.post(
      `${baseUrlGlobal}/storeLogs`,
      {
        userId: Number(userId),
        examId: Number(examId),
        violationName,
        violationTimestamp: actualViolationTime,
      },
      {
        headers: {
          Authorization: `Bearer ${getTokenFromCookie()}`,
        },
      }
    );
    console.log(
      `📝 Logged ${violationName} at ${actualViolationTime.toISOString()} (2s before detection)`
    );
  } catch (error) {
    console.error(`Failed to log ${violationName}:`, error);
  }
};

// ✅ Helper function to wait for all pending face camera chunks to complete
const waitForPendingFaceChunks = (pendingChunksRef: React.MutableRefObject<Set<number>>): Promise<void> => {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (pendingChunksRef.current.size === 0) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100); // Check every 100ms

    // Safety timeout (10 seconds max)
    setTimeout(() => {
      if (pendingChunksRef.current.size > 0) {
        console.warn(`⚠️ Timeout waiting for face chunks. ${pendingChunksRef.current.size} chunks still pending.`);
      }
      clearInterval(checkInterval);
      resolve();
    }, 10000);
  });
};

interface VideoChunkData {
  user_id: string;
  exam_id: string | null;
  category: string;
  chunk: ArrayBuffer;
  timestamps: number;
  examSettings: any;
  chunkNumber?: number;
  isFinal?: boolean;
  totalChunks?: number;
}

interface FloatingCameraProps {
  socket: any;
  onLookingAway: (direction: string) => void;
  onHeadDirection: (direction: string) => void;
  detect: () => void;
  number: (num: number) => void;
  examSubmitted: boolean;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  settings?: object;
  pendingChunksRef?: React.MutableRefObject<Set<number>>;
  onModelsLoaded: (loaded: boolean) => void;
}

const FloatingCamera = ({
  socket,
  onLookingAway,
  onHeadDirection,
  detect,
  number,
  examSubmitted,
  mediaRecorderRef,
  settings = {},
  pendingChunksRef,
  onModelsLoaded,
}: FloatingCameraProps) => {
  const isInitialized = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const interRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingFaceChunksRef = useRef<Set<number>>(new Set());
  const faceChunkCounterRef = useRef<number>(0);
  const examSubmittedRef = useRef(false);

  const lastNotificationRef = useRef<{ [key: string]: number }>({
    faceAuth: 0,
    headDirection: 0,
    eyePosition: 0,
    deviceDetected: 0,
    multiplePersons: 0,
    soundDetected: 0,
    noLaptop: 0,
    noCandidate: 0,
  });

  const violationLoggedRef = useRef<{ [key: string]: boolean }>({
    headDirection: false,
    eyePosition: false,
    deviceDetected: false,
    multiplePersons: false,
    noCandidate: false,
    soundDetected: false,
  });

  const mobileFrameCountRef = useRef(0);
  const mobileDetectionStartTimeRef = useRef<number | null>(null);
  const MOBILE_FRAME_THRESHOLD = 5;

  const NOTIFICATION_THROTTLE_MS = 2000;
  const FRAME_VIOLATION_THRESHOLD = 2;

  const violationFrameCountRef = useRef<{ [key: string]: number }>({
    headDirection: 0,
    eyePosition: 0,
    multiplePersons: 0,
    noCandidate: 0,
  });


  const settingsRef = useRef<object>({});
  useEffect(() => {
    settingsRef.current =
      settings && typeof settings === "object" ? settings : {};
  }, [settings]);

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [borderColor, setBorderColor] = useState("white");
  const [prevSoundDetected, setPrevSoundDetected] = useState(false);

  const { toast } = useToast();

  const changeColor = useCallback(async () => {
    setBorderColor("red");
    setTimeout(() => setBorderColor("white"), 3000);
  }, []);

  const { isSoundDetected, audioLevel } = useSoundLevel(examSubmitted);

  const handleSoundDetection = useCallback(() => {
    const now = Date.now();

    if (!examSettings?.microphone_detection_enabled) {
      return;
    }

    if (isSoundDetected && !prevSoundDetected) {
      if (
        now - lastNotificationRef.current.soundDetected >=
        NOTIFICATION_THROTTLE_MS
      ) {
        toast({
          title: "Sound Detected",
          description: `Audio level: ${audioLevel.toFixed(0)}% - Keep average level for indication`,
          variant: "destructive",
        });
        lastNotificationRef.current.soundDetected = now;
      }
      setBorderColor("red");
    } else if (!isSoundDetected) {
      setBorderColor("white");
    }
    setPrevSoundDetected(isSoundDetected);
  }, [isSoundDetected, prevSoundDetected, audioLevel, toast]);

  useEffect(() => {
    handleSoundDetection();
  }, [handleSoundDetection]);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    let isMounted = true;

    workerRef.current = new Worker(new URL('../workers/inference.worker.ts', import.meta.url));

    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'initialized') {
        console.log('✅ Worker initialized');
        if (onModelsLoaded) {
          onModelsLoaded(true);
        }
      } else if (type === 'detectionResult') {
        const { head, gaze, objects } = payload;
        const now = Date.now();

        if (examSettings?.head_direction_enabled) {
          if (
            head.toLowerCase() !== "forward" &&
            head.toLowerCase() !== "down"
          ) {
            violationFrameCountRef.current.headDirection++;

            if (
              violationFrameCountRef.current.headDirection >= FRAME_VIOLATION_THRESHOLD &&
              !violationLoggedRef.current.headDirection
            ) {
              logViolation("head_position_violation");
              violationLoggedRef.current.headDirection = true;

              if (
                now - lastNotificationRef.current.headDirection >=
                NOTIFICATION_THROTTLE_MS
              ) {
                onHeadDirection(head);
                lastNotificationRef.current.headDirection = now;
              }
            }
          } else {
            if (violationFrameCountRef.current.headDirection > 0) {
              violationFrameCountRef.current.headDirection = 0;
              violationLoggedRef.current.headDirection = false;
            }
          }
        }
        
        const isHeadNormal = head.toLowerCase() === "forward" || head.toLowerCase() === "down";
        if (examSettings?.eyeball_detection_enabled && isHeadNormal) {
          if (gaze.toLowerCase() !== "center") {
            violationFrameCountRef.current.eyePosition++;
            if (
              violationFrameCountRef.current.eyePosition >= FRAME_VIOLATION_THRESHOLD &&
              !violationLoggedRef.current.eyePosition
            ) {
              logViolation("eye_position_violation");
              violationLoggedRef.current.eyePosition = true;
              if (
                now - lastNotificationRef.current.eyePosition >=
                NOTIFICATION_THROTTLE_MS
              ) {
                onLookingAway(gaze);
                lastNotificationRef.current.eyePosition = now;
              }
            }
          } else {
            if (violationFrameCountRef.current.eyePosition > 0) {
              violationFrameCountRef.current.eyePosition = 0;
              violationLoggedRef.current.eyePosition = false;
            }
          }
        } else if (!isHeadNormal) {
          if (violationFrameCountRef.current.eyePosition > 0) {
            violationFrameCountRef.current.eyePosition = 0;
            violationLoggedRef.current.eyePosition = false;
          }
        }

        if (examSettings?.object_detection_enabled && objects.phone > 0) {
          mobileFrameCountRef.current += 1;
          if (mobileFrameCountRef.current === 1) {
            mobileDetectionStartTimeRef.current = now;
          }

          if (
            mobileFrameCountRef.current >= MOBILE_FRAME_THRESHOLD &&
            !violationLoggedRef.current.deviceDetected &&
            mobileDetectionStartTimeRef.current !== null
          ) {
            logViolation("object_detection_violation");
            violationLoggedRef.current.deviceDetected = true;

            if (
              now - lastNotificationRef.current.deviceDetected >=
              NOTIFICATION_THROTTLE_MS
            ) {
              detect();
              changeColor();
              lastNotificationRef.current.deviceDetected = now;
            }
          } else if (mobileFrameCountRef.current < MOBILE_FRAME_THRESHOLD) {
            if (
              now - lastNotificationRef.current.deviceDetected >=
              NOTIFICATION_THROTTLE_MS
            ) {
              toast({
                title: "Mobile Phone Detected",
                description: `Warning ${mobileFrameCountRef.current}/${MOBILE_FRAME_THRESHOLD} - Keep device away`,
                variant: "destructive",
              });
              lastNotificationRef.current.deviceDetected = now;
            }
          }
        } else {
          if (mobileFrameCountRef.current > 0) {
            mobileFrameCountRef.current = 0;
            mobileDetectionStartTimeRef.current = null;
            violationLoggedRef.current.deviceDetected = false;
          }
        }

        if (examSettings?.multiple_person_detection_enabled && objects.person > 1) {
          violationFrameCountRef.current.multiplePersons++;

          if (
            violationFrameCountRef.current.multiplePersons >= FRAME_VIOLATION_THRESHOLD &&
            !violationLoggedRef.current.multiplePersons
          ) {
            logViolation("multiple_persons_detected");
            violationLoggedRef.current.multiplePersons = true;
            if (
              now - lastNotificationRef.current.multiplePersons >=
              NOTIFICATION_THROTTLE_MS
            ) {
              number(objects.person);
              changeColor();
              toast({
                title: "Multiple Persons Detected",
                description: `${objects.person} people detected. Only the registered candidate should be visible.`,
                variant: "destructive",
              });
              lastNotificationRef.current.multiplePersons = now;
            }
          }
        } else {
          if (violationFrameCountRef.current.multiplePersons > 0) {
            violationFrameCountRef.current.multiplePersons = 0;
            violationLoggedRef.current.multiplePersons = false;
          }
        }

        if (objects.person === 0) {
          violationFrameCountRef.current.noCandidate++;
          if (
            violationFrameCountRef.current.noCandidate >= FRAME_VIOLATION_THRESHOLD &&
            !violationLoggedRef.current.noCandidate
          ) {
            logViolation("no_person_detected");
            violationLoggedRef.current.noCandidate = true;
            if (
              now - lastNotificationRef.current.noCandidate >=
              NOTIFICATION_THROTTLE_MS
            ) {
              toast({
                title: "No Person Detected",
                description: "Please ensure you are visible in the camera frame.",
                variant: "destructive",
              });
              lastNotificationRef.current.noCandidate = now;
            }
          }
        } else {
          if (violationFrameCountRef.current.noCandidate > 0) {
            violationFrameCountRef.current.noCandidate = 0;
            violationLoggedRef.current.noCandidate = false;
          }
        }
      }
    }

    const startCamera = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        console.log("FloatingCamera: Requesting camera access...");

        let retries = 3;
        while (retries > 0) {
          try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 320 },
                height: { ideal: 240 },
                frameRate: { ideal: 15 },
              },
            });
            break;
          } catch (err) {
            const error = err as Error;
            if (error.name === "NotReadableError" && retries > 1) {
              console.log(
                `Camera busy, retrying... (${retries - 1} attempts left)`
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
              retries--;
            } else {
              throw err;
            }
          }
        }

        if (!isMounted) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          return;
        }
        console.log("FloatingCamera: Camera access successful");

        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }

        workerRef.current?.postMessage({
            type: 'init',
            payload: { examSettings }
        });
        
        if (streamRef.current) {
          mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
            mimeType: "video/webm; codecs=vp8",
            videoBitsPerSecond: 250000,
          });

          mediaRecorderRef.current.ondataavailable = (e: BlobEvent) => {
            if (e.data.size > 0) {
              const chunkNum = faceChunkCounterRef.current++;
              const blob = e.data;
              if (examSubmittedRef.current && mediaRecorderRef.current?.state === 'recording') {
                return;
              }
              pendingFaceChunksRef.current.add(chunkNum);
              if (pendingChunksRef?.current) {
                pendingChunksRef.current.add(chunkNum);
              }

              blob.arrayBuffer().then((buffer: ArrayBuffer) => {
                if (examSubmittedRef.current && mediaRecorderRef.current?.state === 'recording') {
                  pendingFaceChunksRef.current.delete(chunkNum);
                  if (pendingChunksRef?.current) {
                    pendingChunksRef.current.delete(chunkNum);
                  }
                  return;
                }

                const isFinalChunk = mediaRecorderRef.current?.state === 'inactive';
                const chunkData: VideoChunkData = {
                  user_id: userId,
                  exam_id: examId,
                  category: "face_camera",
                  chunk: buffer,
                  timestamps: Date.now(),
                  examSettings: settingsRef.current,
                  chunkNumber: chunkNum,
                  isFinal: isFinalChunk,
                  totalChunks: isFinalChunk ? chunkNum + 1 : undefined,
                };
                socket.emit("recorder-add-video-stream-chunk", chunkData);

                pendingFaceChunksRef.current.delete(chunkNum);
                if (pendingChunksRef?.current) {
                  pendingChunksRef.current.delete(chunkNum);
                }
                // @ts-expect-error chunk can be nullified to free up memory
                chunkData.chunk = null;
              }).catch((err: Error) => {
                console.error(`Failed to send face chunk #${faceChunkCounterRef.current}:`, err);
                pendingFaceChunksRef.current.delete(faceChunkCounterRef.current);
                if (pendingChunksRef?.current) {
                  pendingChunksRef.current.delete(faceChunkCounterRef.current);
                }
              });
            }
          };

          mediaRecorderRef.current.onstop = async () => {
            if (examSubmittedRef.current) {
              await waitForPendingFaceChunks(pendingFaceChunksRef);
              await new Promise(resolve => setTimeout(resolve, 500));
              socket.emit("stream-listener-off", {
                user_id: userId,
                exam_id: examId,
                category: "face_camera",
                timestamp: new Date(),
                totalChunks: faceChunkCounterRef.current,
                isFinal: true,
              });
            }
          };
          mediaRecorderRef.current.start(2000);
        }

        if (interRef.current) {
          clearInterval(interRef.current);
          interRef.current = null;
        }

        interRef.current = setInterval(async () => {
          if (!isMounted) {
            clearInterval(interRef.current);
            return;
          }
          const video = videoRef.current;
          if (!video || video.readyState < 2 || video.videoWidth === 0) return;

          const imageBitmap = await createImageBitmap(video);
          workerRef.current?.postMessage({ type: 'detect', payload: { imageBitmap } }, [imageBitmap]);

        }, 1000);
      } catch (error) {
        const err = error as Error;
        console.error("Camera access failed:", error);
        if (err.name === "NotReadableError") {
          setTimeout(() => {
            if (isMounted) {
              startCamera();
            }
          }, 3000);
        } else if (err.name === "NotAllowedError") {
          toast({
            title: "Camera Permission Denied",
            description: "Please allow camera access",
            variant: "destructive",
          });
        }
      }
    };

    startCamera();
    
    const videoElement = videoRef.current;

    return () => {
      console.log("FloatingCamera cleanup - stopping recording");

      isMounted = false;
      isInitialized.current = false;

      if (interRef.current) {
        clearInterval(interRef.current);
        interRef.current = null;
      }
      
      workerRef.current?.postMessage({ type: 'close' });
      workerRef.current?.terminate();
      closeModels();

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;

        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }

      if (videoElement) {
        videoElement.srcObject = null;
        videoElement.pause();
        videoElement.load();
      }
      socket.off("thirdeye_alert");
      socket.off("alert");
    };
  }, [changeColor, detect, examSettings, examSubmitted, mediaRecorderRef, number, onHeadDirection, onLookingAway, onModelsLoaded, pendingChunksRef, socket, toast]); 
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    const rect = cameraRef.current?.getBoundingClientRect();
    setOffset({
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      requestAnimationFrame(() => {
        setPosition({
          x: e.clientX - offset.x,
          y: e.clientY - offset.y,
        });
      });
    },
    [dragging, offset]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={cameraRef}
      className={styles.floatingCamera}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        border: `2px solid ${borderColor}`,
      }}
      onMouseDown={handleMouseDown}
    >
      {examSettings?.face_authentication_enabled && (
        <div className={styles.scanOverlay}>
          <div className={styles.scanLine} />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              zIndex: 2,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)",
              color: "white",
              fontWeight: 600,
              fontSize: 16,
              gap: 12,
              padding: "16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                animation: "pulse 2s ease-in-out infinite",
              }}
            >
              ✓
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                color: "#00ff88",
                textShadow: "0 0 8px rgba(0, 255, 136, 0.5)",
              }}
            >
              Authenticating
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: "rgba(255,255,255,0.8)",
                letterSpacing: "0.3px",
              }}
            >
              Keep steady and centered
            </span>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
      <video
        className={styles.video}
        ref={videoRef}
        autoPlay
        muted
        width={400}
        height={300}
      />
    </div>
  );
};

export default FloatingCamera;