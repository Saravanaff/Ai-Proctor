import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import styles from "../styles/FloatingCamera.module.css";
import { useToast } from "@/hooks/use-toast";
import * as mediasoupClient from "mediasoup-client";
import useSoundLevel from "@/hooks/useSoundLevel";
import {
  getExamId,
  getUserId,
  getTokenFromCookie,
} from "../constants/AuthStore";
import { delay } from "@/utils/delay";
import axios from "axios";
import { getExamSettings } from "@/constants/examSettingsConsts";
import {
  FilesetResolver,
  FaceLandmarker,
  ObjectDetector,
} from "@mediapipe/tasks-vision";
import { headPos } from "@/utils/aiModel/headPos";
import { eye_direction } from "@/utils/aiModel/eyePos";
import { detector } from "@/utils/aiModel/objDetector";
// import { loadFaceModel } from "@/lib/facemodel"; // ✅ DISABLED for performance
// import { getEmbeddings, clearEmbeddings } from "@/utils/datastore"; // ✅ DISABLED for performance

const userId = getUserId() || "unknown";
let examId = getExamId();
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
  settings: any;
  chunkNumber?: number;
  isFinal?: boolean;
  totalChunks?: number;
}

const FloatingCamera = ({
  socket,
  onLookingAway,
  onHeadDirection,
  detect,
  number,
  onAuthFaceMissing,
  examSubmitted,
  mediaRecorderRef,
  onAuthPause,
  onAuthResume,
  screenRecorderMediaRecorderRef,
  settings = {},
  pendingChunksRef,
  onModelsLoaded,
}: any) => {
  const isInitialized = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const interRef = useRef<any>(null);
  const streamRef = useRef<MediaStream>(null);
  const hasEverAuthedRef = useRef(false);
  const hasPausedOnceRef = useRef(false);
  const lastToastAtRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const faceAuthRef = useRef<any | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastObjTimeRef = useRef<number>(-1);
  const endExamSentRef = useRef(false);
  const isStoppingRef = useRef(false);
  const pendingFaceChunksRef = useRef<Set<number>>(new Set());
  const faceChunkCounterRef = useRef<number>(0);
  const examSubmittedRef = useRef(false);
  const AUTH_INTERVAL = 10000;
  const FACE_INTERVAL = 2000; // ✅ OPTIMIZED: Increased from 1000ms to 2000ms for better performance

  const countersRef = useRef({
    look: 0,
    person: 0,
    auth: 0,
    item: 0,
    np: 0,
    mp: 0,
    uauth: 0,
    mlp: 0,
  });

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

  const violationStartTimeRef = useRef<{ [key: string]: number | null }>({
    headDirection: null,
    eyePosition: null,
    deviceDetected: null,
    multiplePersons: null,
    noCandidate: null,
    soundDetected: null,
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
  const MOBILE_FRAME_THRESHOLD = 5; // 5 consecutive frames



  const NOTIFICATION_THROTTLE_MS = 2000; // 2 seconds gap
  const FRAME_VIOLATION_THRESHOLD = 2; // 2 consecutive frames to trigger violation

  // ✅ Frame counters for each violation type
  const violationFrameCountRef = useRef<{ [key: string]: number }>({
    headDirection: 0,
    eyePosition: 0,
    multiplePersons: 0,
    noCandidate: 0,
  });


  const settingsRef = useRef<any>({});
  useEffect(() => {
    settingsRef.current =
      settings && typeof settings === "object" ? settings : {};
  }, [settings]);

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [borderColor, setBorderColor] = useState("white");
  const [prevSoundDetected, setPrevSoundDetected] = useState(false);

  const initialAuthDoneRef = useRef(false);
  const [showInitialScan, setShowInitialScan] = useState(true);

  const FIRE_THRESHOLD_MS = 30000;
  const unauthStartAtRef = useRef<number | null>(null);
  const unauthTriggeredRef = useRef(false);

  const scanning = !initialAuthDoneRef.current;

  const { toast } = useToast();

  const changeColor = useCallback(async () => {
    setBorderColor("red");
    setTimeout(() => setBorderColor("white"), 3000);
  }, []);

  const calculateHeadPosition = useCallback((landmarks: any[]): string => {
    let head = headPos(landmarks);
    return head;
  }, []);

  const calculateEyeGaze = useCallback((landmarks: any[]): string => {
    if (!landmarks || landmarks.length < 478) return "unknown";

    let r_eye_direction = eye_direction(
      landmarks[163],
      landmarks[157],
      landmarks[471],
      landmarks[469],
      "right",
      480,
      480
    );
    let l_eye_direction = eye_direction(
      landmarks[390],
      landmarks[384],
      landmarks[474],
      landmarks[476],
      "left",
      480,
      480
    );

    let eyeDir = "center";

    if (r_eye_direction == "left" && l_eye_direction == "left") {
      eyeDir = "left";
    } else if (r_eye_direction == "right" && l_eye_direction == "right") {
      eyeDir = "right";
    }
    return eyeDir;
  }, []);

  const objdetect = useCallback((result: any) => {
    let detection = detector(result);
    return detection;
  }, []);

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!initialAuthDoneRef.current && onAuthPause) {
      onAuthPause();
    }
  }, [onAuthPause]);

  useEffect(() => {
    console.log(`📊 FloatingCamera: examSubmitted changed to: ${examSubmitted}`);

    // ✅ Update ref immediately when examSubmitted changes
    examSubmittedRef.current = examSubmitted;

    if (examSubmitted && !isStoppingRef.current) {
      isStoppingRef.current = true;
      console.log("🛑 Exam Submitted - Stopping all recordings");
      console.log("⏰ Current timestamp:", new Date().toISOString());
      console.log("👤 User ID:", userId, "📝 Exam ID:", examId);
      console.log(`📊 MediaRecorder current state: ${mediaRecorderRef.current?.state || 'null'}`);

      if (streamRef.current) {
        try {
          console.log("📷 Stopping camera stream tracks...");
          streamRef.current.getTracks().forEach((track) => {
            console.log(
              `  Stopping camera track: ${track.kind}, state: ${track.readyState}`
            );
            track.stop();
          });
          streamRef.current = null;

          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }

          console.log("✅ Camera turned OFF");
        } catch (e) {
          console.warn("Error stopping camera stream:", e);
        }
      }

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          console.log(`� Stopping MediaRecorder immediately - current state: ${mediaRecorderRef.current.state}`);

          // ✅ STOP IMMEDIATELY - Don't request data first, just stop
          mediaRecorderRef.current.stop();
          console.log("✅ Face camera MediaRecorder.stop() called - waiting for onstop event");

          // ✅ The onstop handler will handle waiting for pending chunks
        } catch (e) {
          console.error("❌ Error stopping MediaRecorder:", e);
        }
      } else {
        console.warn(`⚠️ MediaRecorder not available or already inactive - state: ${mediaRecorderRef.current?.state || 'null'}`);
      }

      // Stop screen recording (already handled in FullScreen.tsx, but as backup)
      if (
        screenRecorderMediaRecorderRef.current &&
        screenRecorderMediaRecorderRef.current.state !== "inactive"
      ) {
        console.log("Stopped screenRecording...");
        screenRecorderMediaRecorderRef.current.stop();
      }
    }
  }, [examSubmitted]);

  // Handle browser close/refresh/navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Cleanup will be handled by FullScreen component
      console.log("⚠️ Browser closing/refreshing during exam");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const { isSoundDetected, audioLevel } = useSoundLevel(examSubmitted);

  // Debug: Log sound detection status
  // useEffect(() => {
  //   console.log(`🔊 Sound Detection - isSoundDetected: ${isSoundDetected}, audioLevel: ${audioLevel}, microphone_enabled: ${examSettings?.microphone_detection_enabled}`);
  // }, [isSoundDetected, audioLevel]);

  const handleSoundDetection = useCallback(() => {
    const now = Date.now();

    // ✅ Only process sound detection if microphone detection is enabled
    if (!examSettings?.microphone_detection_enabled) {
      return;
    }

    if (isSoundDetected && !prevSoundDetected) {
      // ✅ Only show notification, do NOT log to backend
      console.log("� Sound detected - Showing notification only (no backend logging)");

      // Show notification (throttled)e
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
                width: { ideal: 480 },
                height: { ideal: 480 },
                frameRate: { ideal: 30 },
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

        const loadModels = async () => {
          try {
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );

            // ✅ Conditionally load models based on exam settings
            const shouldLoadFaceLandmarker =
              examSettings?.head_direction_enabled ||
              examSettings?.eyeball_detection_enabled;

            const shouldLoadObjectDetector =
              examSettings?.object_detection_enabled ||
              examSettings?.multiple_person_detection_enabled;

            const modelPromises: Promise<any>[] = [];

            // Load Face Landmarker only if head or eye detection is enabled
            if (shouldLoadFaceLandmarker) {
              modelPromises.push(
                !faceLandmarkerRef.current
                  ? FaceLandmarker.createFromOptions(vision, {
                    baseOptions: {
                      modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                      delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numFaces: 1,
                    minFaceDetectionConfidence: 0.5,
                    minFacePresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                    outputFaceBlendshapes: false,
                    outputFacialTransformationMatrixes: false,
                  })
                  : Promise.resolve(faceLandmarkerRef.current)
              );
            } else {
              modelPromises.push(Promise.resolve(null));
              console.log("⏭️ Skipping Face Landmarker - head/eye detection disabled");
            }

            // Load Object Detector only if object or multiple person detection is enabled
            if (shouldLoadObjectDetector) {
              modelPromises.push(
                !objectDetectorRef.current
                  ? ObjectDetector.createFromOptions(vision, {
                    baseOptions: {
                      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                    },
                    scoreThreshold: 0.4,
                    runningMode: "VIDEO",
                    maxResults: 10,
                  })
                  : Promise.resolve(objectDetectorRef.current)
              );
            } else {
              modelPromises.push(Promise.resolve(null));
              console.log("⏭️ Skipping Object Detector - object/person detection disabled");
            }

            const [faceLandmarker, objectDetector] = await Promise.all(modelPromises);
            // const faceAuth = await loadFaceModel();

            if (faceLandmarker && !faceLandmarkerRef.current) {
              faceLandmarkerRef.current = faceLandmarker;
              console.log("✅ MediaPipe Face Landmarker initialized");
            }
            if (objectDetector && !objectDetectorRef.current) {
              objectDetectorRef.current = objectDetector;
              console.log("✅ MediaPipe Object Detector initialized");
            }
            // if (faceAuth && !faceAuthRef.current) {
            //   faceAuthRef.current = faceAuth;
            //   console.log("✅ Face Authentication model initialized");
            // }

            // ✅ Notify parent component that models are loaded
            console.log("✅ All AI models loaded successfully");
            if (onModelsLoaded) {
              onModelsLoaded(true);
            }
          } catch (error) {
            console.error("❌ Failed to initialize Models:", error);
            objectDetectorRef.current = null;
            faceLandmarkerRef.current = null;

            // ✅ Notify parent even on error so exam can proceed
            if (onModelsLoaded) {
              onModelsLoaded(false);
            }
          }
        };

        loadModels();

        // ✅ FIX: Create MediaRecorder only if stream exists, and guard all subsequent operations
        if (streamRef.current) {
          mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
            mimeType: "video/webm; codecs=vp8",
            videoBitsPerSecond: 250000,  // ✅ Reduced from 500Kbps to 250Kbps to reduce memory usage
          });

          mediaRecorderRef.current.ondataavailable = (e: any) => {
            if (e.data.size > 0) {
              const chunkNum = faceChunkCounterRef.current++;
              const blob = e.data; // Store blob reference

              // ✅ CRITICAL: Check if exam is already submitted - if so, ignore this chunk
              if (examSubmittedRef.current && mediaRecorderRef.current?.state === 'recording') {
                console.warn(`⚠️ Ignoring face camera chunk #${chunkNum} - exam already submitted but recorder still active`);
                return;
              }

              // ✅ Track this chunk as pending (both internal and external refs)
              pendingFaceChunksRef.current.add(chunkNum);
              if (pendingChunksRef?.current) {
                pendingChunksRef.current.add(chunkNum);
              }

              blob.arrayBuffer().then((buffer: ArrayBuffer) => {
                // ✅ CRITICAL: Double-check exam submission status before sending
                if (examSubmittedRef.current && mediaRecorderRef.current?.state === 'recording') {
                  console.warn(`⚠️ Dropping face chunk #${chunkNum} inside arrayBuffer - exam submitted but recorder still active`);
                  // Remove from pending
                  pendingFaceChunksRef.current.delete(chunkNum);
                  if (pendingChunksRef?.current) {
                    pendingChunksRef.current.delete(chunkNum);
                  }
                  return;
                }

                // ✅ Check if MediaRecorder is inactive (meaning this is likely the final chunk)
                const isFinalChunk = mediaRecorderRef.current?.state === 'inactive';

                const chunkData: VideoChunkData = {
                  user_id: userId,
                  exam_id: examId,
                  category: "face_camera",
                  chunk: buffer,
                  timestamps: Date.now(),
                  examSettings: settingsRef.current,
                  settings: settingsRef.current,
                  chunkNumber: chunkNum,
                  isFinal: isFinalChunk,
                  totalChunks: isFinalChunk ? chunkNum + 1 : undefined,
                };
                socket.emit("recorder-add-video-stream-chunk", chunkData);

                if (isFinalChunk) {
                  console.log(`🏁 Sent FINAL face camera chunk #${chunkNum} (${buffer.byteLength} bytes)`);
                } else {
                  console.log(`📹 Sent face camera chunk #${chunkNum} (${buffer.byteLength} bytes)`);
                }

                // ✅ Remove from pending after successful emit (both refs)
                pendingFaceChunksRef.current.delete(chunkNum);
                if (pendingChunksRef?.current) {
                  pendingChunksRef.current.delete(chunkNum);
                }
                console.log(`✅ Face chunk #${chunkNum} sent, ${pendingFaceChunksRef.current.size} pending`);

                // ✅ CRITICAL: Clear buffer reference to allow garbage collection
                // @ts-ignore
                chunkData.chunk = null;
              }).catch((err: any) => {
                console.error(`Failed to send face chunk #${chunkNum}:`, err);
                // ✅ Remove from pending even on error (both refs)
                pendingFaceChunksRef.current.delete(chunkNum);
                if (pendingChunksRef?.current) {
                  pendingChunksRef.current.delete(chunkNum);
                }
              });
            }
          };

          mediaRecorderRef.current.onstop = async () => {
            console.log("🎬 Face camera MediaRecorder stopped event fired");
            console.log(`📊 examSubmitted state value: ${examSubmitted}`);
            console.log(`📊 examSubmittedRef.current: ${examSubmittedRef.current}`); // ✅ Use ref instead
            console.log(`📊 Current pending face chunks: ${pendingFaceChunksRef.current.size}`);

            // ✅ Use ref instead of state to avoid stale closure
            if (examSubmittedRef.current) {
              // ✅ Wait for all pending chunks to finish uploading
              console.log(`⏳ Waiting for ${pendingFaceChunksRef.current.size} pending face chunks...`);
              await waitForPendingFaceChunks(pendingFaceChunksRef);
              console.log("✅ All face chunks sent!");

              // ✅ Additional 500ms delay to ensure chunks are transmitted over network
              console.log("⏳ Additional 500ms network safety delay for face camera...");
              await new Promise(resolve => setTimeout(resolve, 500));

              // ✅ NOW emit stream-listener-off AFTER all chunks are sent
              console.log("📤 Emitting stream-listener-off for face_camera");
              socket.emit("stream-listener-off", {
                user_id: userId,
                exam_id: examId,
                category: "face_camera",
                timestamp: new Date(),
                totalChunks: faceChunkCounterRef.current,
                isFinal: true,
              });

              console.log(`✅ Face camera recording complete - ${faceChunkCounterRef.current} chunks sent`);
            } else {
              console.warn("⚠️ Face camera stopped but examSubmittedRef.current is false - not emitting stream-listener-off");
            }
          };

          mediaRecorderRef.current.start(2000); // ✅ Changed from 1000ms to 2000ms to reduce memory usage
        } else {
          console.error("❌ Cannot create MediaRecorder: No stream available");
        }

        // ✅ Clear any existing interval before creating new one
        if (interRef.current) {
          clearInterval(interRef.current);
          interRef.current = null;
        }
        let lastFace = 0;
        let lastAuth = 0;
        // ✅ Reduce interval frequency from 10 FPS to 1 FPS (1000ms) to reduce CPU/memory usage
        interRef.current = setInterval(async () => {
          if (!isMounted) {
            clearInterval(interRef.current);
            return;
          }
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;

          if (
            faceLandmarkerRef.current &&
            videoRef.current
          ) {
            try {
              const startTimeMs = performance.now();

              if (startTimeMs - lastFace >= FACE_INTERVAL) {

                const results = faceLandmarkerRef.current.detectForVideo(
                  videoRef.current,
                  startTimeMs
                );

                if (
                  results &&
                  results.faceLandmarks &&
                  results.faceLandmarks.length > 0
                ) {
                  const landmarks = results.faceLandmarks[0];


                  const headPos = calculateHeadPosition(landmarks);
                  // console.log(`📍 Head Position: ${headPos}`); // ✅ DISABLED for performance
                  // if (startTimeMs - lastAuth >= AUTH_INTERVAL) {
                  //   const liveDetection = await faceAuthRef.current
                  //     .detectSingleFace(videoRef.current, new faceAuthRef.current.TinyFaceDetectorOptions())
                  //     .withFaceLandmarks()
                  //     .withFaceDescriptor();

                  //   const reference = getEmbeddings();
                  //   console.log("Reference embeddings loaded:", reference ? reference.length : 0);

                  //   let isAuth = false;

                  //   if (liveDetection && reference && reference.length > 0) {
                  //     for (let i = 0; i < reference.length; i++) {
                  //       const refEmbedding = new Float32Array(reference[i]);
                  //       console.log("refEmbedding:", refEmbedding);
                  //       const labeledDescriptor = new faceAuthRef.current.LabeledFaceDescriptors("User", [refEmbedding,]);
                  //       const matcher = new faceAuthRef.current.FaceMatcher(labeledDescriptor, 0.6);
                  //       const bestMatch = matcher.findBestMatch(liveDetection.descriptor);
                  //       if (bestMatch.label === "User") {
                  //         isAuth = true;
                  //         break;
                  //       }
                  //     }
                  //   }
                  //   console.log("Face Authentication : ", isAuth);
                  //   lastAuth = startTimeMs;
                  // }

                  if (examSettings?.head_direction_enabled) {
                    if (
                      headPos.toLowerCase() !== "forward" &&
                      headPos.toLowerCase() !== "down"
                    ) {
                      const now = Date.now();

                      // Increment frame counter
                      violationFrameCountRef.current.headDirection++;

                      // Check if threshold reached (2 consecutive frames)
                      if (
                        violationFrameCountRef.current.headDirection >= FRAME_VIOLATION_THRESHOLD &&
                        !violationLoggedRef.current.headDirection
                      ) {
                        console.log(
                          `🚨 Head direction violation - ${violationFrameCountRef.current.headDirection} consecutive frames - Logging`
                        );
                        logViolation("head_position_violation");
                        violationLoggedRef.current.headDirection = true;

                        if (
                          now - lastNotificationRef.current.headDirection >=
                          NOTIFICATION_THROTTLE_MS
                        ) {
                          onHeadDirection(headPos);
                          lastNotificationRef.current.headDirection = now;
                        }
                      }
                    } else {
                      // Reset frame counter when violation ends
                      if (violationFrameCountRef.current.headDirection > 0) {
                        console.log("✅ Head direction violation ended");
                        violationFrameCountRef.current.headDirection = 0;
                        violationLoggedRef.current.headDirection = false;
                      }
                    }
                  }

                  const eyeGaze = calculateEyeGaze(landmarks);
                  // console.log(`👁️ Eye Gaze: ${eyeGaze}`); // ✅ DISABLED for performance

                  // ✅ Only check eye position if head is in forward/down position
                  // When head is turned, eye detection is unreliable
                  const isHeadNormal = headPos.toLowerCase() === "forward" || headPos.toLowerCase() === "down";

                  if (examSettings?.eyeball_detection_enabled && isHeadNormal) {
                    if (eyeGaze.toLowerCase() !== "center") {
                      const now = Date.now();

                      // Increment frame counter
                      violationFrameCountRef.current.eyePosition++;

                      // Check if threshold reached (2 consecutive frames)
                      if (
                        violationFrameCountRef.current.eyePosition >= FRAME_VIOLATION_THRESHOLD &&
                        !violationLoggedRef.current.eyePosition
                      ) {
                        console.log(
                          `🚨 Eye position violation - ${violationFrameCountRef.current.eyePosition} consecutive frames - Logging`
                        );
                        logViolation("eye_position_violation");
                        violationLoggedRef.current.eyePosition = true;

                        if (
                          now - lastNotificationRef.current.eyePosition >=
                          NOTIFICATION_THROTTLE_MS
                        ) {
                          onLookingAway(eyeGaze);
                          lastNotificationRef.current.eyePosition = now;
                        }
                      }
                    } else {
                      // Reset frame counter when violation ends
                      if (violationFrameCountRef.current.eyePosition > 0) {
                        console.log("✅ Eye position violation ended");
                        violationFrameCountRef.current.eyePosition = 0;
                        violationLoggedRef.current.eyePosition = false;
                      }
                    }
                  } else if (!isHeadNormal) {
                    // Reset when head not forward
                    if (violationFrameCountRef.current.eyePosition > 0) {
                      console.log("✅ Eye position tracking paused (head not forward)");
                      violationFrameCountRef.current.eyePosition = 0;
                      violationLoggedRef.current.eyePosition = false;
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Face Landmarker processing error:", error);
            }
          }
          if (objectDetectorRef.current && videoRef.current) {
            try {
              const currentTime = videoRef.current.currentTime;

              if (currentTime !== lastObjTimeRef.current) {
                lastObjTimeRef.current = currentTime;

                const startTimeMs = performance.now();
                const result = objectDetectorRef.current.detectForVideo(
                  video,
                  startTimeMs
                );
                // console.log(result); // ✅ DISABLED for performance
                if (result) {
                  const detection = objdetect(result);
                  // console.log(
                  //   `Person : ${detection.person}, Mobile: ${detection.phone}`
                  // ); // ✅ DISABLED for performance

                  const now = Date.now();

                  // ✅ UPDATED: Track mobile phone detection by frames (5 consecutive frames to flag)
                  if (examSettings?.object_detection_enabled && detection.phone > 0) {
                    // Increment frame counter for consecutive detections
                    mobileFrameCountRef.current += 1;

                    // Track start time on first detection
                    if (mobileFrameCountRef.current === 1) {
                      mobileDetectionStartTimeRef.current = now;
                      console.log(`📱 Mobile phone first detected at ${new Date(now).toISOString()}`);
                    }

                    console.log(`📱 Mobile phone detected - Frame count: ${mobileFrameCountRef.current}/${MOBILE_FRAME_THRESHOLD}`);

                    if (
                      mobileFrameCountRef.current >= MOBILE_FRAME_THRESHOLD &&
                      !violationLoggedRef.current.deviceDetected &&
                      mobileDetectionStartTimeRef.current !== null
                    ) {
                      console.log(
                        `🚨 Mobile phone detected for ${mobileFrameCountRef.current} consecutive frames - Logging violation`
                      );
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
                      // Show notification but don't flag yet
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
                      console.log(`✅ Mobile phone no longer detected - Resetting counter from ${mobileFrameCountRef.current}`);
                      mobileFrameCountRef.current = 0;
                      mobileDetectionStartTimeRef.current = null;
                      violationLoggedRef.current.deviceDetected = false;
                    }
                  }

                  if (examSettings?.multiple_person_detection_enabled && detection.person > 1) {
                    // Increment frame counter
                    violationFrameCountRef.current.multiplePersons++;

                    // Check if threshold reached (2 consecutive frames)
                    if (
                      violationFrameCountRef.current.multiplePersons >= FRAME_VIOLATION_THRESHOLD &&
                      !violationLoggedRef.current.multiplePersons
                    ) {
                      console.log(
                        `🚨 Multiple persons violation - ${violationFrameCountRef.current.multiplePersons} consecutive frames - Logging`
                      );
                      logViolation("multiple_persons_detected");
                      violationLoggedRef.current.multiplePersons = true;

                      if (
                        now - lastNotificationRef.current.multiplePersons >=
                        NOTIFICATION_THROTTLE_MS
                      ) {
                        number(detection.person);
                        changeColor();
                        toast({
                          title: "Multiple Persons Detected",
                          description: `${detection.person} people detected. Only the registered candidate should be visible.`,
                          variant: "destructive",
                        });
                        lastNotificationRef.current.multiplePersons = now;
                      }
                    }
                  } else {
                    // Reset frame counter
                    if (violationFrameCountRef.current.multiplePersons > 0) {
                      console.log("✅ Multiple persons violation ended");
                      violationFrameCountRef.current.multiplePersons = 0;
                      violationLoggedRef.current.multiplePersons = false;
                    }
                  }

                  if (detection.person === 0) {
                    // Increment frame counter
                    violationFrameCountRef.current.noCandidate++;

                    // Check if threshold reached (2 consecutive frames)
                    if (
                      violationFrameCountRef.current.noCandidate >= FRAME_VIOLATION_THRESHOLD &&
                      !violationLoggedRef.current.noCandidate
                    ) {
                      console.log(
                        `🚨 No person violation - ${violationFrameCountRef.current.noCandidate} consecutive frames - Logging`
                      );
                      logViolation("no_person_detected");
                      violationLoggedRef.current.noCandidate = true;

                      // Show notification for no person detected
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
                    // Reset frame counter when person is detected again
                    if (violationFrameCountRef.current.noCandidate > 0) {
                      console.log("✅ No person violation ended");
                      violationFrameCountRef.current.noCandidate = 0;
                      violationLoggedRef.current.noCandidate = false;
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Object Detector processing error:", error);
            }
          }
        }, 1000); // ✅ OPTIMIZED: Changed from 1000ms to 2000ms (0.5 FPS) to reduce CPU/memory usage
      } catch (error) {
        console.error("Camera access failed:", error);

        const err = error as Error;
        if (err.name === "NotReadableError") {
          console.log("Camera is busy, likely being used by another component");
          // toast({
          //   title: "Camera Busy",
          //   description: "Camera is being used by another component",
          //   variant: "destructive",
          // });

          // Try again after a delay
          setTimeout(() => {
            if (isMounted) {
              console.log("Retrying camera access...");
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

    // socket.on("thirdeye_alert", handleThirdEyeAlert);
    // socket.on("alert", handleAlert);

    return () => {
      console.log("FloatingCamera cleanup - stopping recording");

      isMounted = false;
      isInitialized.current = false;

      // ✅ Clear interval FIRST to stop all processing
      if (interRef.current) {
        clearInterval(interRef.current);
        interRef.current = null;
      }

      // ✅ Clean up AI models to free memory
      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close();
        } catch (e) {
          console.warn("Error closing FaceLandmarker:", e);
        }
        faceLandmarkerRef.current = null;
        console.log("Face Landmarker cleaned up");
      }

      // ✅ Clean up Object Detector to free memory
      if (objectDetectorRef.current) {
        try {
          objectDetectorRef.current.close();
        } catch (e) {
          console.warn("Error closing ObjectDetector:", e);
        }
        objectDetectorRef.current = null;
        console.log("Object Detector cleaned up");
      }

      // ✅ Clean up Face Auth model
      if (faceAuthRef.current) {
        faceAuthRef.current = null;
        console.log("Face Auth cleaned up");
      }

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;

        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }

        // ✅ FIX: Set to null to prevent memory leaks
        mediaRecorderRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log(
            `Stopping FloatingCamera track: ${track.kind}, state: ${track.readyState}`
          );
          track.stop(); // ✅ This stops both camera AND microphone
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
        videoRef.current.load(); // ✅ Force video element to release resources
        videoRef.current.remove(); // ✅ Remove from DOM to free memory
      }

      // ✅ REMOVE ALL SOCKET EVENT LISTENERS (PREVENT MEMORY LEAKS)
      socket.off("thirdeye_alert");
      socket.off("alert");
    };
  }, []);

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
      {showInitialScan && examSettings?.face_authentication_enabled && (
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
