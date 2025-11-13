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

const userId = getUserId() || "unknown";
let examId = getExamId();
const examSettings = getExamSettings();
const baseUrlGlobal = process.env.NEXT_PUBLIC_BACKEND_URL;

// Helper function to log violations to API
const logViolation = async (violationName: string) => {
  try {
    // ✅ Subtract 4 seconds (4000ms) because violation was detected after 4 seconds of continuous occurrence
    // This gives us the actual time when the violation STARTED, not when it was logged
    const actualViolationTime = new Date(Date.now() - 4000);
    
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
    console.log(`📝 Logged ${violationName} at ${actualViolationTime.toISOString()} (4s before detection)`);
  } catch (error) {
    console.error(`Failed to log ${violationName}:`, error);
  }
};

interface VideoChunkData {
  user_id: string;
  exam_id: string | null;
  category: string;
  chunk: ArrayBuffer;
  timestamps: number;
  examSettings: any;
  settings: any;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const lastObjTimeRef = useRef<number>(-1);
  const endExamSentRef = useRef(false);
  const isStoppingRef = useRef(false);

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

  // Track last notification timestamps to prevent repeated alerts
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

  // ✅ NEW: Track when violations START (for continuous violation detection)
  const violationStartTimeRef = useRef<{ [key: string]: number | null }>({
    headDirection: null,
    eyePosition: null,
    deviceDetected: null,
    multiplePersons: null,
    noCandidate: null,
  });

  // ✅ NEW: Track if violation has been logged (to avoid duplicate logs)
  const violationLoggedRef = useRef<{ [key: string]: boolean }>({
    headDirection: false,
    eyePosition: false,
    deviceDetected: false,
    multiplePersons: false,
    noCandidate: false,
  });

  const NOTIFICATION_THROTTLE_MS = 2000; // 2 seconds gap
  const CONTINUOUS_VIOLATION_THRESHOLD_MS = 4000; // 4 seconds continuous violation

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

  // Calculate head position from landmarks
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

  const handleUserAlert = useCallback(
    (data: any, socketName: string) => {
      console.log("Alert Data:", data, "from", socketName);
      const now = Date.now();

      if (socketName === "faceAuthRes-client") {
        if (data.auth === true && !initialAuthDoneRef.current) {
          initialAuthDoneRef.current = true;
          setShowInitialScan(false);
          // ✅ ONLY RESUME IF FACE AUTHENTICATION IS ENABLED IN EXAM SETTINGS
          if (examSettings?.face_authentication_enabled && onAuthResume) {
            console.log(
              "✅ Face authenticated - Calling onAuthResume (face_auth enabled)"
            );
            onAuthResume();
          }
          return;
        }
        if (!initialAuthDoneRef.current) {
          return;
        }
        if (data.auth === false) {
          // ✅ ONLY PAUSE IF FACE AUTHENTICATION IS ENABLED IN EXAM SETTINGS
          if (
            examSettings?.face_authentication_enabled &&
            Date.now() - lastNotificationRef.current.faceAuth >=
              NOTIFICATION_THROTTLE_MS
          ) {
            console.log(
              "⚠️ Face lost - Calling onAuthFaceMissing (face_auth enabled)"
            );
            onAuthFaceMissing();
            lastNotificationRef.current.faceAuth = Date.now();
          }
        }
      }
      if (!initialAuthDoneRef.current) return;

      if (socketName === "headPositionRes-client") {
        if (data.data.headPos !== "Forward" && data.data.headPos !== "Down") {
          if (
            now - lastNotificationRef.current.headDirection >=
            NOTIFICATION_THROTTLE_MS
          ) {
            onHeadDirection(data.data.headPos);
            lastNotificationRef.current.headDirection = now;
          }
        }
      }

      if (socketName === "eyePositionRes-client") {
        if (
          data?.data?.leftEye !== "Center" &&
          data?.data?.rightEye !== "Center"
        ) {
          if (
            now - lastNotificationRef.current.eyePosition >=
            NOTIFICATION_THROTTLE_MS
          ) {
            onLookingAway(data.data.leftEye);
            lastNotificationRef.current.eyePosition = now;
          }
        }
      }

      if (socketName === "webDetectRes-client") {
        if (data.data["Mobile"] !== 0 || data.data["Laptop"] !== 0) {
          if (
            now - lastNotificationRef.current.deviceDetected >=
            NOTIFICATION_THROTTLE_MS
          ) {
            detect();
            changeColor();
            lastNotificationRef.current.deviceDetected = now;
          }
        }
        if (data.data.Person > 1) {
          if (
            now - lastNotificationRef.current.multiplePersons >=
            NOTIFICATION_THROTTLE_MS
          ) {
            number(data.data.Person);
            changeColor();
            lastNotificationRef.current.multiplePersons = now;
          }
        }
      }

      if (socketName === "mobileDetectRes-client") {
        if (data.data["Mobile"] !== 0 || data.data.Laptop > 1) {
          if (
            now - lastNotificationRef.current.deviceDetected >=
            NOTIFICATION_THROTTLE_MS
          ) {
            toast({
              title: "Unauthorized Device Detected",
              description: "Dont keep Gadgets Nearby",
              variant: "destructive",
            });
            lastNotificationRef.current.deviceDetected = now;
          }
        }

        if (data.data.Laptop === 0) {
          if (
            now - lastNotificationRef.current.noLaptop >=
            NOTIFICATION_THROTTLE_MS
          ) {
            toast({
              title: "Canditate Laptop is not present",
              description: "No laptop is present",
              variant: "destructive",
            });
            lastNotificationRef.current.noLaptop = now;
          }
        }

        if (data.data.Person === 0) {
          if (
            now - lastNotificationRef.current.noCandidate >=
            NOTIFICATION_THROTTLE_MS
          ) {
            toast({
              title: "Canditate is not present",
              description: "No persons are there",
              variant: "destructive",
            });
            lastNotificationRef.current.noCandidate = now;
          }
        } else if (data.data.Person > 1) {
          if (
            now - lastNotificationRef.current.multiplePersons >=
            NOTIFICATION_THROTTLE_MS
          ) {
            toast({
              title: "More number of persons are present",
              description:
                "Please ensure candidate is present in isolated area",
              variant: "destructive",
            });
            lastNotificationRef.current.multiplePersons = now;
          }
        }
      }
    },
    [
      toast,
      onLookingAway,
      changeColor,
      detect,
      number,
      onAuthResume,
      onAuthFaceMissing,
    ]
  );

  useEffect(() => {
    if (examSubmitted && !isStoppingRef.current) {
      isStoppingRef.current = true;
      console.log("🛑 Exam Submitted - Stopping all recordings");
      console.log("⏰ Current timestamp:", new Date().toISOString());
      console.log("👤 User ID:", userId, "📝 Exam ID:", examId);

      // ✅ STOP CAMERA STREAM TRACKS IMMEDIATELY (Turn off camera)
      if (streamRef.current) {
        try {
          console.log("📷 Stopping camera stream tracks...");
          streamRef.current.getTracks().forEach((track) => {
            console.log(`  Stopping camera track: ${track.kind}, state: ${track.readyState}`);
            track.stop();
          });
          streamRef.current = null;
          
          // Clear video element srcObject to fully release camera
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          
          console.log("✅ Camera turned OFF");
        } catch (e) {
          console.warn("Error stopping camera stream:", e);
        }
      }

      // Stop face camera recording - this will trigger final ondataavailable
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        // First, request any pending data to be flushed
        try {
          console.log("📤 Requesting final data from MediaRecorder...");
          mediaRecorderRef.current.requestData();
        } catch (e) {
          console.warn("Could not request data:", e);
        }

        // Then stop the recorder (will trigger final ondataavailable)
        setTimeout(() => {
          if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
          ) {
            mediaRecorderRef.current.stop();
            console.log(
              "✅ Face camera MediaRecorder stopped - waiting for final chunk"
            );
          }
        }, 100);
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

  const { isSoundDetected, audioLevel } = useSoundLevel();

  const handleSoundDetection = useCallback(() => {
    const now = Date.now();
    if (isSoundDetected && !prevSoundDetected) {
      if (
        now - lastNotificationRef.current.soundDetected >=
        NOTIFICATION_THROTTLE_MS
      ) {
        toast({
          title: "Sound Detected",
          description: "Audio detected during exam",
          variant: "destructive",
        });
        lastNotificationRef.current.soundDetected = now;
      }
      setBorderColor("red");
    } else if (!isSoundDetected) {
      setBorderColor("white");
    }
    setPrevSoundDetected(isSoundDetected);
  }, [isSoundDetected, prevSoundDetected, toast]);

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

        // ✅ START CAMERA IMMEDIATELY - Don't wait for models
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

        // ✅ SHOW CAMERA IMMEDIATELY
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }

        // ✅ LOAD MODELS IN PARALLEL (NOT BLOCKING CAMERA DISPLAY)
        const loadModels = async () => {
          try {
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            
            // Load both models in parallel
            const [faceLandmarker, objectDetector] = await Promise.all([
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
                : Promise.resolve(faceLandmarkerRef.current),
              !objectDetectorRef.current
                ? ObjectDetector.createFromOptions(vision, {
                    baseOptions: {
                      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
                      delegate: "GPU",
                    },
                    scoreThreshold: 0.5,
                    runningMode: "VIDEO",
                  })
                : Promise.resolve(objectDetectorRef.current),
            ]);

            if (!faceLandmarkerRef.current) {
              faceLandmarkerRef.current = faceLandmarker;
              console.log("✅ MediaPipe Face Landmarker initialized");
            }
            if (!objectDetectorRef.current) {
              objectDetectorRef.current = objectDetector;
              console.log("✅ MediaPipe Object Detector initialized");
            }
          } catch (error) {
            console.error("❌ Failed to initialize Models:", error);
            objectDetectorRef.current = null;
            faceLandmarkerRef.current = null;
          }
        };

        // ✅ Load models in background (non-blocking)
        loadModels();

        if (streamRef.current) {
          mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
            mimeType: "video/webm; codecs=vp8",
            videoBitsPerSecond: 1000000,
          });
        }

        mediaRecorderRef.current.ondataavailable = (e: any) => {
          if (e.data.size > 0) {
            const isLastChunk = mediaRecorderRef.current?.state === "inactive";

            e.data.arrayBuffer().then((buffer: ArrayBuffer) => {
              const chunkData: VideoChunkData = {
                user_id: userId,
                exam_id: examId,
                category: "face_camera",
                chunk: buffer,
                timestamps: Date.now(),
                examSettings: settingsRef.current,
                settings: settingsRef.current,
              };
              socket.emit("recorder-add-video-stream-chunk", chunkData);
              console.log(
                "📹 Sent face camera chunk:",
                buffer.byteLength,
                "bytes",
                isLastChunk ? "(FINAL CHUNK)" : ""
              );
            });
          }
        };

        // Handle when MediaRecorder stops
        mediaRecorderRef.current.onstop = () => {
          console.log("🎬 Face camera MediaRecorder stopped event fired");
          
          // ✅ Emit stream-listener-off AFTER final chunk is sent
          if (examSubmitted) {
            console.log("📤 Emitting stream-listener-off for face_camera");
            socket.emit("stream-listener-off", {
              user_id: userId,
              exam_id: examId,
              category: "face_camera",
              timestamp: new Date(),
            });
          }
        };

        mediaRecorderRef.current.start(1000);

        interRef.current = setInterval(async () => {
          if (!isMounted) {
            clearInterval(interRef.current);
            return;
          }
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          const width = video.videoWidth;
          const height = video.videoHeight;

          let canvas = canvasRef.current; // Use ref instead of getElementById
          if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.id = "auth-canvas";
            canvas.style.display = "none";
            document.body.appendChild(canvas);
            canvasRef.current = canvas;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d", { willReadFrequently: true }); // Add performance hint
          if (!ctx) return;

          ctx.drawImage(video, 0, 0, width, height);

          // Process with MediaPipe Face Landmarker if available
          if (
            faceLandmarkerRef.current &&
            videoRef.current &&
            canvasRef.current
          ) {
            try {
              const currentTime = videoRef.current.currentTime;

              // Only detect if this is a new frame
              if (currentTime !== lastVideoTimeRef.current) {
                lastVideoTimeRef.current = currentTime;

                const startTimeMs = performance.now();
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

                  // ✅ REMOVED: Don't draw landmarks on overlay (causes flickering)
                  // Just process the data without visualization

                  const headPos = calculateHeadPosition(landmarks);
                  console.log(`📍 Head Position: ${headPos}`);

                  // ✅ NEW: Track continuous head position violation
                  if (
                    headPos.toLowerCase() !== "forward" &&
                    headPos.toLowerCase() !== "down"
                  ) {
                    const now = Date.now();
                    
                    // Start tracking if not already tracking
                    if (violationStartTimeRef.current.headDirection === null) {
                      violationStartTimeRef.current.headDirection = now;
                      violationLoggedRef.current.headDirection = false;
                      console.log("⚠️ Head direction violation started");
                    }
                    
                    // Check if violation has been continuous for 4 seconds
                    const violationDuration = now - violationStartTimeRef.current.headDirection;
                    if (
                      violationDuration >= CONTINUOUS_VIOLATION_THRESHOLD_MS &&
                      !violationLoggedRef.current.headDirection
                    ) {
                      console.log(`🚨 Head direction violation continuous for ${violationDuration}ms - Logging`);
                      logViolation("head_position_violation");
                      violationLoggedRef.current.headDirection = true;
                      
                      // Trigger UI notification
                      if (
                        now - lastNotificationRef.current.headDirection >=
                        NOTIFICATION_THROTTLE_MS
                      ) {
                        onHeadDirection(headPos);
                        lastNotificationRef.current.headDirection = now;
                      }
                    }
                  } else {
                    // ✅ Reset tracking when violation stops
                    if (violationStartTimeRef.current.headDirection !== null) {
                      console.log("✅ Head direction violation ended");
                      violationStartTimeRef.current.headDirection = null;
                      violationLoggedRef.current.headDirection = false;
                    }
                  }

                  const eyeGaze = calculateEyeGaze(landmarks);
                  console.log(`👁️ Eye Gaze: ${eyeGaze}`);

                  // ✅ NEW: Track continuous eye position violation
                  if (eyeGaze.toLowerCase() !== "center") {
                    const now = Date.now();
                    
                    // Start tracking if not already tracking
                    if (violationStartTimeRef.current.eyePosition === null) {
                      violationStartTimeRef.current.eyePosition = now;
                      violationLoggedRef.current.eyePosition = false;
                      console.log("⚠️ Eye position violation started");
                    }
                    
                    // Check if violation has been continuous for 4 seconds
                    const violationDuration = now - violationStartTimeRef.current.eyePosition;
                    if (
                      violationDuration >= CONTINUOUS_VIOLATION_THRESHOLD_MS &&
                      !violationLoggedRef.current.eyePosition
                    ) {
                      console.log(`🚨 Eye position violation continuous for ${violationDuration}ms - Logging`);
                      logViolation("eye_position_violation");
                      violationLoggedRef.current.eyePosition = true;
                      
                      // Trigger UI notification
                      if (
                        now - lastNotificationRef.current.eyePosition >=
                        NOTIFICATION_THROTTLE_MS
                      ) {
                        onLookingAway(eyeGaze);
                        lastNotificationRef.current.eyePosition = now;
                      }
                    }
                  } else {
                    // ✅ Reset tracking when violation stops
                    if (violationStartTimeRef.current.eyePosition !== null) {
                      console.log("✅ Eye position violation ended");
                      violationStartTimeRef.current.eyePosition = null;
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
                console.log(result);
                if (result) {
                  const detection = objdetect(result);
                  console.log(
                    `Person : ${detection.person}, Mobile: ${detection.phone}`
                  );

                  const now = Date.now();

                  // ✅ NEW: Track continuous phone detection violation
                  if (detection.phone > 0) {
                    // Start tracking if not already tracking
                    if (violationStartTimeRef.current.deviceDetected === null) {
                      violationStartTimeRef.current.deviceDetected = now;
                      violationLoggedRef.current.deviceDetected = false;
                      console.log("⚠️ Phone detection violation started");
                    }
                    
                    // Check if violation has been continuous for 4 seconds
                    const violationDuration = now - violationStartTimeRef.current.deviceDetected;
                    if (
                      violationDuration >= CONTINUOUS_VIOLATION_THRESHOLD_MS &&
                      !violationLoggedRef.current.deviceDetected
                    ) {
                      console.log(`🚨 Phone detection violation continuous for ${violationDuration}ms - Logging`);
                      logViolation("object_detection_violation");
                      violationLoggedRef.current.deviceDetected = true;
                      
                      // Trigger UI notification
                      if (
                        now - lastNotificationRef.current.deviceDetected >=
                        NOTIFICATION_THROTTLE_MS
                      ) {
                        detect();
                        changeColor();
                        lastNotificationRef.current.deviceDetected = now;
                      }
                    }
                  } else {
                    // ✅ Reset tracking when phone is no longer detected
                    if (violationStartTimeRef.current.deviceDetected !== null) {
                      console.log("✅ Phone detection violation ended");
                      violationStartTimeRef.current.deviceDetected = null;
                      violationLoggedRef.current.deviceDetected = false;
                    }
                  }

                  // ✅ NEW: Track continuous multiple persons violation
                  if (detection.person > 1) {
                    // Start tracking if not already tracking
                    if (violationStartTimeRef.current.multiplePersons === null) {
                      violationStartTimeRef.current.multiplePersons = now;
                      violationLoggedRef.current.multiplePersons = false;
                      console.log("⚠️ Multiple persons violation started");
                    }
                    
                    // Check if violation has been continuous for 4 seconds
                    const violationDuration = now - violationStartTimeRef.current.multiplePersons;
                    if (
                      violationDuration >= CONTINUOUS_VIOLATION_THRESHOLD_MS &&
                      !violationLoggedRef.current.multiplePersons
                    ) {
                      console.log(`🚨 Multiple persons violation continuous for ${violationDuration}ms - Logging`);
                      logViolation("multiple_persons_detected");
                      violationLoggedRef.current.multiplePersons = true;
                      
                      // Trigger UI notification
                      if (
                        now - lastNotificationRef.current.multiplePersons >=
                        NOTIFICATION_THROTTLE_MS
                      ) {
                        number(detection.person);
                        changeColor();
                        lastNotificationRef.current.multiplePersons = now;
                      }
                    }
                  } else {
                    // ✅ Reset tracking when multiple persons are no longer detected
                    if (violationStartTimeRef.current.multiplePersons !== null) {
                      console.log("✅ Multiple persons violation ended");
                      violationStartTimeRef.current.multiplePersons = null;
                      violationLoggedRef.current.multiplePersons = false;
                    }
                  }

                  // ✅ NEW: Track continuous no person violation
                  if (detection.person === 0) {
                    // Start tracking if not already tracking
                    if (violationStartTimeRef.current.noCandidate === null) {
                      violationStartTimeRef.current.noCandidate = now;
                      violationLoggedRef.current.noCandidate = false;
                      console.log("⚠️ No person violation started");
                    }
                    
                    // Check if violation has been continuous for 4 seconds
                    const violationDuration = now - violationStartTimeRef.current.noCandidate;
                    if (
                      violationDuration >= CONTINUOUS_VIOLATION_THRESHOLD_MS &&
                      !violationLoggedRef.current.noCandidate
                    ) {
                      console.log(`🚨 No person violation continuous for ${violationDuration}ms - Logging`);
                      logViolation("no_person_detected");
                      violationLoggedRef.current.noCandidate = true;
                    }
                  } else {
                    // ✅ Reset tracking when person is detected again
                    if (violationStartTimeRef.current.noCandidate !== null) {
                      console.log("✅ No person violation ended");
                      violationStartTimeRef.current.noCandidate = null;
                      violationLoggedRef.current.noCandidate = false;
                    }
                  }
                }
              }
            } catch (error) {
              console.error("Object Detector processing error:", error);
            }
          }
        }, 1000 / 10);
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

    socket.on("faceAuthRes-client", (data: any) => {
      handleUserAlert(data, "faceAuthRes-client");
    });

    socket.on("headPositionRes-client", (data: any) => {
      handleUserAlert(data, "headPositionRes-client");
    });

    socket.on("eyePositionRes-client", (data: any) => {
      handleUserAlert(data, "eyePositionRes-client");
    });

    socket.on("webDetectRes-client", (data: any) => {
      handleUserAlert(data, "webDetectRes-client");
    });

    socket.on("mobileDetectRes-client", (data: any) => {
      handleUserAlert(data, "mobileDetectRes-client");
    });

    return () => {
      console.log("FloatingCamera cleanup - stopping recording");

      isMounted = false;
      isInitialized.current = false;

      // Clean up Face Landmarker
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
        console.log("✅ Face Landmarker cleaned up");
      }

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;

        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      }

      if (interRef.current) {
        clearInterval(interRef.current);
        interRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log(
            `Stopping FloatingCamera track: ${track.kind}, state: ${track.readyState}`
          );
          track.stop();
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      const canvas = document.getElementById("auth-canvas");
      if (canvas) {
        canvas.remove();
      }

      // ✅ REMOVE ALL SOCKET EVENT LISTENERS (PREVENT MEMORY LEAKS)
      socket.off("faceAuthRes-client");
      socket.off("headPositionRes-client");
      socket.off("eyePositionRes-client");
      socket.off("webDetectRes-client");
      socket.off("mobileDetectRes-client");
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
      setPosition({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
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
      {/* ✅ HIDDEN: Canvas overlay not needed for display (only used for processing) */}
      <canvas
        ref={canvasRef}
        className={styles.overlayCanvas}
        width={400}
        height={300}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 10,
          display: "none", // ✅ Hide the canvas overlay
        }}
      />
    </div>
  );
};

export default FloatingCamera;
