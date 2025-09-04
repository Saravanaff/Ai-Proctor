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

const userId = getUserId() || "unknown";
const examId = localStorage.getItem("examId") || "unknown";

interface VideoChunkData {
  user_id: string;
  category: string;
  chunk: ArrayBuffer;
}



const FloatingCamera = ({
  socket,
  onLookingAway,
  detect,
  number,
  onAuthFaceMissing,
  examSubmitted,
  mediaRecorderRef,
  onAuthPause,
  onAuthResume,
  screenRecorderMediaRecorderRef,
}: any) => {
  const isInitialized = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const interRef = useRef<any>(null);
  const streamRef = useRef<MediaStream>(null);

  const hasEverAuthedRef = useRef(false);
  const hasPausedOnceRef = useRef(false);
  const lastToastAtRef = useRef<number>(0);

  // Move counters to refs to avoid recreation on each render
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

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [borderColor, setBorderColor] = useState("white");
  const [prevSoundDetected, setPrevSoundDetected] = useState(false);

  const scanning = true;

  const { toast } = useToast();

  const changeColor = useCallback(async () => {
    setBorderColor("red");
    setTimeout(() => setBorderColor("white"), 3000);
  }, []);

  const handleThirdEyeAlert = useCallback(
    (data: any) => {
      if (data.person == 0) {
        countersRef.current.np++;
        if (countersRef.current.np % 100 != 0) {
          return;
        }
        countersRef.current.np = 0;
        toast({
          title: "Canditate is not present",
          description: "No persons are there",
          variant: "destructive",
        });
      }
      if (data.person > 1) {
        countersRef.current.mp++;
        if (countersRef.current.mp % 100 != 0) {
          return;
        }
        countersRef.current.mp = 0;
        toast({
          title: "More number of persons are present",
          description: "Please ensure candidate is present in isolated area",
          variant: "destructive",
        });
      }

      if (data.laptop < 1) {
        countersRef.current.mlp++;
        if (countersRef.current.mlp % 150 != 0) return;
        countersRef.current.mlp = 0;
        toast({
          title: "Candiate Laptop is not present",
          description: "No laptop is present",
          variant: "destructive",
        });
      }
      if (data.unauth_device == true) {
        countersRef.current.uauth++;
        if (countersRef.current.uauth % 50 !== 0) return;
        countersRef.current.uauth = 0;
        toast({
          title: "Unauthorized Device Detected",
          description: "Dont keep Gadgets Nearby",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleAlert = useCallback(
    (data: any) => {
      
      const now = Date.now();
      console.log("hi");
      console.log("data", data);

      if (!hasEverAuthedRef.current) {
        if (data?.auth_face === true) {
          hasEverAuthedRef.current = true;
          if (hasPausedOnceRef.current && typeof onAuthResume === "function")
            onAuthResume();
          if (now - lastToastAtRef.current > 2500) {
            toast({
              title: "Identity Verified",
              description: "Face authenticated",
              variant: "default",
            });
            lastToastAtRef.current = now;
          }
        } else if (data?.auth_face === false) {
          if (!hasPausedOnceRef.current && typeof onAuthPause === "function") {
            onAuthPause();
            hasPausedOnceRef.current = true;
          }
          if (now - lastToastAtRef.current > 2500) {
            toast({
              title: "Face Not Authenticated",
              description: "Hold still for a quick rescan",
              variant: "destructive",
            });
            lastToastAtRef.current = now;
          }
        }
      } else {
        if (data?.auth_face === false) {
          if (now - lastToastAtRef.current > 4000) {
            toast({
              title: "Authentication Lost",
              description: "Face not recognized",
              variant: "destructive",
            });
            lastToastAtRef.current = now;
          }
          onAuthFaceMissing();
        }
      }

      if (data.head_position !== "Forward") {
        countersRef.current.look++;
        if (countersRef.current.look % 10 !== 0) return;
        countersRef.current.look = 0;
        console.log("looking away");
        onLookingAway(data.head_position);
      }
      else{
        countersRef.current.look=0;
      }
      if (
        data.head_position == "Forward" &&
        data.eyes[0] !== "Center" &&
        data.eyes[1] !== "Center"&& data.eyes[0]!=="Left" && data.eyes[1]!=="Left"
      ) {
        console.log("looking away with eyes");
        countersRef.current.look++;
        if (countersRef.current.look % 10 !== 0) return;
        countersRef.current.look = 0;
        onLookingAway(data.head_position);
      }
      else{
        countersRef.current.look=0;
      }
      if (data.object_detected["cell phone"]) {
        // countersRef.current.item++;
        // if (countersRef.current.item % 2 !== 0) return;
        // countersRef.current.item = 0;
        detect();
        changeColor();
      }
      if (data.no_of_person != 1) {
        countersRef.current.person++;
        if (countersRef.current.person % 10 != 0) return;
        countersRef.current.person = 0;
        number(data.no_of_person);
        changeColor();
      }
      else{
        countersRef.current.person=0;
      }
      if (!data.auth_face && data.head_position=="Forward") {
        countersRef.current.auth++;
        if (countersRef.current.auth % 10!== 0) return;
        countersRef.current.auth = 0;
        changeColor();
        onAuthFaceMissing();
      }
      else{
        countersRef.current.auth=0;
      }
    },
    [
      toast,
      onAuthResume,
      onAuthPause,
      onAuthFaceMissing,
      onLookingAway,
      detect,
      number,
      changeColor,
    ]
  );

  useEffect(() => {
    if (examSubmitted) {
      console.log("Exam Submitted");
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      socket.emit("end-exam", {
        user_id: userId,
        category: "face_camera",
        status: "success",
        message: "Exam Ended successfully",
      });
      socket.emit("end-exam", {
        user_id: userId,
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
    if (isSoundDetected && !prevSoundDetected) {
      toast({
        title: "Sound Detected",
        description: "Audio detected during exam",
        variant: "destructive",
      });
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
                      metadata: {
                        width,
                        height,
                      },
                      user_id: userId,
                      exam_id: examId,
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
        }, 1000/10); 


      } catch (error) {
        console.error("Camera access failed:", error);

        // Handle specific camera errors
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

    socket.on("thirdeye_alert", handleThirdEyeAlert);
    socket.on("alert", handleAlert);

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
      {/* Scanning overlay */}
      {scanning && (
        <div className={styles.scanOverlay}>
          <div className={styles.scanLine} />
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
