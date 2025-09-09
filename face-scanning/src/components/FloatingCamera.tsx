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
import { getUserId } from "../constants/AuthStore";
import { delay } from "@/utils/delay";
import axios from 'axios'

const userId = getUserId() || "unknown";
let examId;
if(localStorage)
examId = localStorage?.getItem("examId");
else examId = "unknown";

interface VideoChunkData {
  user_id: string;
  exam_id: string | null;
  category: string;
  chunk: ArrayBuffer;
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

  // Initial authentication state
  const initialAuthDoneRef = useRef(false);
  const [showInitialScan, setShowInitialScan] = useState(true);

  const FIRE_THRESHOLD_MS = 30000;
  const unauthStartAtRef = useRef<number | null>(null);
  const unauthTriggeredRef = useRef(false);

  const scanning = !initialAuthDoneRef.current; // Only scan when not authenticated

  const { toast } = useToast();

  const changeColor = useCallback(async () => {
    setBorderColor("red");
    setTimeout(() => setBorderColor("white"), 3000);
  }, []);
  const baseUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL;
  const userId = getUserId() || "unknown";

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
        if (onAuthResume) onAuthResume();
        return;
      }
      if (!initialAuthDoneRef.current) {
        return;
      }
      if(data.auth === false) {
        if (Date.now() - lastNotificationRef.current.faceAuth >= NOTIFICATION_THROTTLE_MS) {
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
      if( data.data["Mobile-phone"] !== 0 || data.data["Laptop"] !== 0) {
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
      if ( data.data["Mobile-phone"] !== 0 || data.data.Laptop > 1 ) {
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
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      socket.emit("end-exam", {
        user_id: userId,
        exam_id: examId,
        category: "face_camera",
        status: "success",
        message: "Exam Ended successfully",
      });
      socket.emit("end-exam", {
        user_id: userId,
        exam_id: examId,
        category: "screen_recording",
        status: "success",
        message: "Exam Ended successfully",
      });

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

          canvas.toBlob(
            (blob) => {
              if (blob && isMounted) {
                blob
                  .arrayBuffer()
                  .then((buffer) => {
                    socket.emit("authenticate", {
                      buffer,
                      metadata: { width, height },
                      user_id: userId,
                      exam_id: examId,
                      userId: userId,
                      examId: examId,
                      settings: settingsRef.current, 
                      examSettings: settingsRef.current,
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
      {/* Initial scanning overlay animation */}
      {showInitialScan && (
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
            background: 'rgba(0,0,0,0.4)',
            color: 'white',
            fontWeight: 600,
            fontSize: 16
          }}>
            <span>Authenticating Face...</span>
            <span style={{fontSize: 12, marginTop: 4}}>Please look at the camera</span>
          </div>
        </div>
      )}
      <video
        className={styles.video}
        ref={videoRef}
        autoPlay
        muted
        width={200}
        height={150}
      />
    </div>
  );
};

export default FloatingCamera;
