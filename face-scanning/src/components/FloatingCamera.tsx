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
import { getExamId, getUserId } from "../constants/AuthStore";
import { delay } from "@/utils/delay";
import axios from 'axios'
import { getExamSettings } from "@/constants/examSettingsConsts";
import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';

const userId = getUserId() || "unknown";
let examId = getExamId();
const examSettings = getExamSettings();

interface VideoChunkData {
  user_id: string;
  exam_id: string | null;
  category: string;
  chunk: ArrayBuffer;
  timestamps: number;
  examSettings:any;
  settings:any;
}

interface ExamMetrics {
  headPositions: { [key: string]: number };
  eyeMovements: { [key: string]: number };
  mobileDetections: number;
  frameCount: number;
  startTime: number;
  endTime: number;
  totalDuration: number;
  headPitch: number[];
  headYaw: number[];
  headRoll: number[];
  eyeGazeHistory: string[];
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
  const lastVideoTimeRef = useRef<number>(-1);
  
  // Exam metrics tracking
  const metricsRef = useRef<ExamMetrics>({
    headPositions: {},
    eyeMovements: {},
    mobileDetections: 0,
    frameCount: 0,
    startTime: Date.now(),
    endTime: 0,
    totalDuration: 0,
    headPitch: [],
    headYaw: [],
    headRoll: [],
    eyeGazeHistory: [],
  });

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
  const lastNotificationRef = useRef<{[key: string]: number}>({
    faceAuth: 0,
    headDirection: 0,
    eyePosition: 0,
    deviceDetected: 0,
    multiplePersons: 0,
    soundDetected: 0,
    noLaptop: 0,
    noCandidate: 0
  });

  const NOTIFICATION_THROTTLE_MS = 2000; // 2 seconds gap

  const settingsRef = useRef<any>({});
  useEffect(() => {
    settingsRef.current = (settings && typeof settings === 'object') ? settings : {};
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
    if (!landmarks || landmarks.length < 468) return 'unknown';
    
    const nose = landmarks[1];
    const noseY = nose.y;
    const noseX = nose.x;
    
    let headPos = 'Forward';
    // Y-axis: When you look up, nose moves up (lower y value)
    if (noseY < 0.4) headPos = 'Up';
    // When you look down, nose moves down (higher y value)
    else if (noseY > 0.6) headPos = 'Down';
    // X-axis: In selfie mode, when you turn right, nose moves left (lower x value)
    else if (noseX < 0.42) headPos = 'Right';
    // When you turn left, nose moves right (higher x value)f
    else if (noseX > 0.58) headPos = 'Left';
    
    metricsRef.current.headPositions[headPos] = (metricsRef.current.headPositions[headPos] || 0) + 1;
    return headPos;
  }, []);

  // Calculate eye gaze direction
  const calculateEyeGaze = useCallback((landmarks: any[]): string => {
    if (!landmarks || landmarks.length < 478) return 'center';
    
    // Eye corner landmarks for reference
    const leftEyeOuter = landmarks[33];   // Left eye outer corner
    const leftEyeInner = landmarks[133];  // Left eye inner corner
    const rightEyeInner = landmarks[362]; // Right eye inner corner  
    const rightEyeOuter = landmarks[263]; // Right eye outer corner
    
    // Iris center landmarks
    const leftIris = landmarks[468];
    const rightIris = landmarks[473];
    
    if (!leftIris || !rightIris || !leftEyeOuter || !leftEyeInner || !rightEyeInner || !rightEyeOuter) {
      return 'center';
    }
    
    // Calculate iris position relative to eye corners (normalized 0-1)
    const leftEyeWidth = Math.abs(leftEyeOuter.x - leftEyeInner.x);
    const rightEyeWidth = Math.abs(rightEyeOuter.x - rightEyeInner.x);
    
    const leftIrisRelative = (leftIris.x - Math.min(leftEyeOuter.x, leftEyeInner.x)) / leftEyeWidth;
    const rightIrisRelative = (rightIris.x - Math.min(rightEyeOuter.x, rightEyeInner.x)) / rightEyeWidth;
    
    // Determine direction for each eye (0.5 is center)
    let leftEyeDir = 'center';
    if (leftIrisRelative < 0.35) leftEyeDir = 'left';
    else if (leftIrisRelative > 0.65) leftEyeDir = 'right';
    
    let rightEyeDir = 'center';
    if (rightIrisRelative < 0.35) rightEyeDir = 'left';
    else if (rightIrisRelative > 0.65) rightEyeDir = 'right';
    
    // Log for debugging
    console.log(`👁️ Left: ${leftEyeDir} (${leftIrisRelative.toFixed(2)}), Right: ${rightEyeDir} (${rightIrisRelative.toFixed(2)})`);
    
    // Only return left/right if BOTH eyes are looking in the same direction
    let eyeDir = 'center';
    if (leftEyeDir === 'left' && rightEyeDir === 'left') {
      eyeDir = 'left';
    } else if (leftEyeDir === 'right' && rightEyeDir === 'right') {
      eyeDir = 'right';
    }
    
    metricsRef.current.eyeMovements[eyeDir] = (metricsRef.current.eyeMovements[eyeDir] || 0) + 1;
    metricsRef.current.eyeGazeHistory.push(eyeDir);
    
    return eyeDir;
  }, []);

  // Detect mobile device in frame
  const detectMobileDevice = useCallback((canvas: HTMLCanvasElement): boolean => {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let edgeCount = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        if (Math.abs(r - g) > 50 || Math.abs(g - b) > 50) {
          edgeCount++;
        }
      }

      const isMobileDetected = edgeCount > data.length * 0.15;
      if (isMobileDetected) {
        metricsRef.current.mobileDetections++;
      }
      return isMobileDetected;
    } catch (error) {
      return false;
    }
  }, []);

  // Log exam completion metrics
  const logExamMetrics = () => {
    metricsRef.current.endTime = Date.now();
    metricsRef.current.totalDuration = metricsRef.current.endTime - metricsRef.current.startTime;
    
    console.log('======= EXAM COMPLETION METRICS =======');
    console.log('User ID:', userId);
    console.log('Exam ID:', examId);
    console.log('');
    
    console.log('📊 HEAD POSITION TRACKING:');
    console.log('  - Head Positions:', metricsRef.current.headPositions);
    console.log('  - Most Common Position:', Object.keys(metricsRef.current.headPositions).reduce((a, b) => 
      metricsRef.current.headPositions[a] > metricsRef.current.headPositions[b] ? a : b, 'unknown'));
    console.log('');
    
    console.log('👁️ EYE MOVEMENT TRACKING:');
    console.log('  - Eye Movements:', metricsRef.current.eyeMovements);
    console.log('  - Gaze History (last 20):', metricsRef.current.eyeGazeHistory.slice(-20));
    console.log('');
    
    console.log('📱 MOBILE DETECTION:');
    console.log('  - Times Mobile Detected:', metricsRef.current.mobileDetections);
    console.log('');
    
    console.log('📈 FRAME STATISTICS:');
    console.log('  - Total Frames Processed:', metricsRef.current.frameCount);
    console.log('  - Total Duration (ms):', metricsRef.current.totalDuration);
    console.log('  - Duration (seconds):', Math.round(metricsRef.current.totalDuration / 1000));
    console.log('  - Average FPS:', Math.round((metricsRef.current.frameCount / metricsRef.current.totalDuration) * 1000));
    console.log('');
    
    console.log('======= END METRICS =======');
  };
  
  const baseUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (!initialAuthDoneRef.current && onAuthPause) {
      onAuthPause();
    }
  }, [onAuthPause]);

  const handleUserAlert = useCallback((data : any,socketName: string) => {
    console.log("Alert Data:", data, "from", socketName)
    const now = Date.now();

    if(socketName === "faceAuthRes-client") {
      if(data.auth === true && !initialAuthDoneRef.current) {
        initialAuthDoneRef.current = true;
        setShowInitialScan(false);
        // ✅ ONLY RESUME IF FACE AUTHENTICATION IS ENABLED IN EXAM SETTINGS
        if (examSettings?.face_authentication_enabled && onAuthResume) {
          console.log("✅ Face authenticated - Calling onAuthResume (face_auth enabled)");
          onAuthResume();
        }
        return;
      }
      if (!initialAuthDoneRef.current) {
        return;
      }
      if(data.auth === false) {
        // ✅ ONLY PAUSE IF FACE AUTHENTICATION IS ENABLED IN EXAM SETTINGS
        if (examSettings?.face_authentication_enabled && 
            Date.now() - lastNotificationRef.current.faceAuth >= NOTIFICATION_THROTTLE_MS) {
          console.log("⚠️ Face lost - Calling onAuthFaceMissing (face_auth enabled)");
          onAuthFaceMissing();
          lastNotificationRef.current.faceAuth = Date.now();
        }
      }
    }
    if (!initialAuthDoneRef.current) return;

    if(socketName === "headPositionRes-client"){
      if(data.data.headPos !== "Forward" && data.data.headPos!== "Down"){
        if (now - lastNotificationRef.current.headDirection >= NOTIFICATION_THROTTLE_MS) {
          onHeadDirection(data.data.headPos);
          lastNotificationRef.current.headDirection = now;
        }
      }
    }
    
    if(socketName === "eyePositionRes-client"){
      if(
        data?.data?.leftEye !== "Center" &&
        data?.data?.rightEye !== "Center"
      ) {
        if (now - lastNotificationRef.current.eyePosition >= NOTIFICATION_THROTTLE_MS) {
          onLookingAway(data.data.leftEye);
          lastNotificationRef.current.eyePosition = now;
        }
      }
    }
    
    if(socketName === "webDetectRes-client"){
      if( data.data["Mobile"] !== 0 || data.data["Laptop"] !== 0) {
        if (now - lastNotificationRef.current.deviceDetected >= NOTIFICATION_THROTTLE_MS) {
          detect();
          changeColor();
          lastNotificationRef.current.deviceDetected = now;
        }
      }
      if(data.data.Person > 1){
        if (now - lastNotificationRef.current.multiplePersons >= NOTIFICATION_THROTTLE_MS) {
          number(data.data.Person);
          changeColor();
          lastNotificationRef.current.multiplePersons = now;
        }
      }
    }

    if(socketName === "mobileDetectRes-client"){
      if ( data.data["Mobile"] !== 0 || data.data.Laptop > 1 ) {
        if (now - lastNotificationRef.current.deviceDetected >= NOTIFICATION_THROTTLE_MS) {
          toast({
            title: "Unauthorized Device Detected",
            description: "Dont keep Gadgets Nearby",
            variant: "destructive",
          });
          lastNotificationRef.current.deviceDetected = now;
        }
      }

      if ( data.data.Laptop === 0 ) {
        if (now - lastNotificationRef.current.noLaptop >= NOTIFICATION_THROTTLE_MS) {
          toast({
            title: "Canditate Laptop is not present",
            description: "No laptop is present",
            variant: "destructive",
          });
          lastNotificationRef.current.noLaptop = now;
        }
      }

      if ( data.data.Person === 0 ) {
        if (now - lastNotificationRef.current.noCandidate >= NOTIFICATION_THROTTLE_MS) {
          toast({
            title: "Canditate is not present",
            description: "No persons are there",
            variant: "destructive",
          });
          lastNotificationRef.current.noCandidate = now;
        }
      }
      else if ( data.data.Person > 1 ) {
        if (now - lastNotificationRef.current.multiplePersons >= NOTIFICATION_THROTTLE_MS) {
          toast({
            title: "More number of persons are present",
            description: "Please ensure candidate is present in isolated area",
            variant: "destructive",
          });
          lastNotificationRef.current.multiplePersons = now;
        }
      }
    }
    
  },[
    toast, 
    onLookingAway,
    changeColor, 
    detect, 
    number,
    onAuthResume,
    onAuthFaceMissing
  ]);


  useEffect(() => {
    if (examSubmitted) {
      console.log("Exam Submitted");
      logExamMetrics();
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }

      if (screenRecorderMediaRecorderRef.current) {
        console.log("Stopped screenRecording...");
        screenRecorderMediaRecorderRef.current.stop();
      }
    }
  }, [examSubmitted]);

  const { isSoundDetected, audioLevel } = useSoundLevel();

  const handleSoundDetection = useCallback(() => {
    const now = Date.now();
    if (isSoundDetected && !prevSoundDetected) {
      if (now - lastNotificationRef.current.soundDetected >= NOTIFICATION_THROTTLE_MS) {
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

        await delay(500);

        console.log("FloatingCamera: Requesting camera access...");

        let retries = 3;
        while (retries > 0) {
          try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({
              video: {
                height: 480,
                width: 480,
                frameRate: 30,
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
        
        try {
          if (!faceLandmarkerRef.current) {
            // Initialize MediaPipe Face Landmarker with new API
            const vision = await FilesetResolver.forVisionTasks(
              "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
            );
            
            const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU"
              },
              runningMode: "VIDEO",
              numFaces: 1,
              minFaceDetectionConfidence: 0.5,
              minFacePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
              outputFaceBlendshapes: false,
              outputFacialTransformationMatrixes: false
            });
            
            faceLandmarkerRef.current = faceLandmarker;
            console.log("✅ MediaPipe Face Landmarker initialized successfully");
          }
        } catch (error) {
          console.error("❌ Failed to initialize Face Landmarker:", error);
          faceLandmarkerRef.current = null;
        }
        
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }

        if (streamRef.current) {
          mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
            mimeType: "video/webm; codecs=vp8",
            videoBitsPerSecond: 1000000,
          });
        }

        mediaRecorderRef.current.ondataavailable = (e: any) => {

          if (e.data.size > 0 && !examSubmitted) {
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
            });
          }
        };

        mediaRecorderRef.current.start(1000);

        interRef.current = setInterval(async () => {
          if (!isMounted) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          const width = video.videoWidth;
          const height = video.videoHeight;

          let canvas = document.getElementById(
            "auth-canvas"
          ) as HTMLCanvasElement;
          if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.id = "auth-canvas";
            canvas.style.display = "none";
            document.body.appendChild(canvas);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(video, 0, 0, width, height);

          // Track frame metrics
          metricsRef.current.frameCount++;
          
          // Process with MediaPipe Face Landmarker if available
          if (faceLandmarkerRef.current && videoRef.current && canvasRef.current) {
            try {
              const currentTime = videoRef.current.currentTime;
              
              // Only detect if this is a new frame
              if (currentTime !== lastVideoTimeRef.current) {
                lastVideoTimeRef.current = currentTime;
                
                const startTimeMs = performance.now();
                const results = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
                
                if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
                  const landmarks = results.faceLandmarks[0];
                  
                  // Draw landmarks on visible overlay canvas
                  const overlayCtx = canvasRef.current.getContext('2d');
                  if (overlayCtx) {
                    // Clear previous landmarks
                    overlayCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    
                    // Draw all face landmarks
                    overlayCtx.fillStyle = '#00FF00';
                    landmarks.forEach((landmark: any, index: number) => {
                      const x = landmark.x * canvasRef.current!.width;
                      const y = landmark.y * canvasRef.current!.height;
                      
                      // Draw point
                      overlayCtx.beginPath();
                      overlayCtx.arc(x, y, 1.5, 0, 2 * Math.PI);
                      overlayCtx.fill();
                      
                      // Highlight specific landmarks with different colors
                      if (index === 1) { // Nose tip
                        overlayCtx.fillStyle = '#FF0000';
                        overlayCtx.beginPath();
                        overlayCtx.arc(x, y, 4, 0, 2 * Math.PI);
                        overlayCtx.fill();
                        overlayCtx.fillStyle = '#00FF00';
                      } else if (index === 468 || index === 473) { // Iris centers
                        overlayCtx.fillStyle = '#FFFF00'; // Yellow for iris
                        overlayCtx.beginPath();
                        overlayCtx.arc(x, y, 4, 0, 2 * Math.PI);
                        overlayCtx.fill();
                        overlayCtx.fillStyle = '#00FF00';
                      }
                    });
                  }
                  
                  // Calculate head position from landmarks
                  const headPos = calculateHeadPosition(landmarks);
                  console.log(`📍 Head Position: ${headPos}`);
                  
                  // Calculate eye gaze from landmarks
                  const eyeGaze = calculateEyeGaze(landmarks);
                  console.log(`👁️ Eye Gaze: ${eyeGaze}`);
                }
              }
            } catch (error) {
              console.error("Face Landmarker processing error:", error);
              // Don't retry - just skip this frame
            }
          }
          
          // Detect mobile device on canvas (every 10 frames)
          if (metricsRef.current.frameCount % 10 === 0) {
            detectMobileDevice(canvas);
          }

          canvas.toBlob(
            (blob) => {
              if (blob && isMounted) {
                blob
                  .arrayBuffer()
                  .then((buffer) => {
                    socket.emit("authenticate",{
                      buffer,
                      metadata: { width, height },
                      user_id: userId,
                      exam_id: examId,
                      userId: userId,
                      examId: examId,
                      settings: settingsRef.current, 
                      examSettings: settingsRef.current,
                      timestamp: new Date(),
                    });
                  })
                  .catch((error) => {
                    console.error(
                      "Error processing authentication frame:",
                      error
                    );
                  });
              }
            },
            "image/jpeg",
            0.5
          );
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

    socket.on("faceAuthRes-client",(data : any)=>{
      handleUserAlert(data,"faceAuthRes-client");
    });
    
    socket.on("headPositionRes-client",(data : any)=>{
      handleUserAlert(data,"headPositionRes-client");
    });

    socket.on("eyePositionRes-client",(data : any)=>{
      handleUserAlert(data,"eyePositionRes-client");
    });
    
    socket.on("webDetectRes-client",(data : any)=>{
      handleUserAlert(data,"webDetectRes-client");
    });

    socket.on("mobileDetectRes-client",(data : any)=>{
      handleUserAlert(data,"mobileDetectRes-client");
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
      {/* Initial scanning overlay animation - Only show if face authentication is enabled */}
      {showInitialScan && examSettings?.face_authentication_enabled && (
        <div className={styles.scanOverlay}>
          <div className={styles.scanLine} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            zIndex: 2,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)',
            color: 'white',
            fontWeight: 600,
            fontSize: 16,
            gap: 12,
            padding: '16px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: 24,
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              ✓
            </div>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: '#00ff88',
              textShadow: '0 0 8px rgba(0, 255, 136, 0.5)'
            }}>
              Authenticating
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '0.3px'
            }}>
              Keep steady and centered
            </span>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
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
      <canvas
        ref={canvasRef}
        className={styles.overlayCanvas}
        width={400}
        height={300}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10
        }}
      />
    </div>
  );
};

export default FloatingCamera;
