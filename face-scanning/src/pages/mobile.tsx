"use client";

import { useEffect, useRef, useState } from "react";
// Orientation helper
function getOrientation() {
  if (typeof window === "undefined") return "portrait";
  if (window.matchMedia("(orientation: landscape)").matches) return "landscape";
  return "portrait";
}
import { Eye, Shield, Camera, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { getUserId } from "@/constants/AuthStore";
import styles from "../styles/ThirdEye.module.css";
import { delay } from "@/utils/delay";

const userId = getUserId() || "unknown";
// const examId = localStorage.getItem("examId") || "unknown";
const examId = "unknown";

function currentUserId(): string | null {
  try {
    const id = getUserId?.();
    if (id) return id;
  } catch {}
  try {
    if (typeof window !== "undefined")
      return window.localStorage.getItem("userId");
  } catch {}
  return null;
}

export default function ThirdEye() {
  const [orientation, setOrientation] = useState(getOrientation());
  // Listen for orientation changes
  useEffect(() => {
    function handleOrientation() {
      setOrientation(getOrientation());
    }
    window.addEventListener("orientationchange", handleOrientation);
    window.addEventListener("resize", handleOrientation);
    return () => {
      window.removeEventListener("orientationchange", handleOrientation);
      window.removeEventListener("resize", handleOrientation);
    };
  }, []);
  // const [socket, setSocket] = useState<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showInitialNotice, setShowInitialNotice] = useState(true);
  const [showSurveillanceNotice, setShowSurveillanceNotice] = useState(false);
  const [isStreamingFrames, setIsStreamingFrames] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { toast } = useToast();

  const serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  console.log("Server URL:", serverUrl);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream>(null);
  const newSocket = useRef<Socket | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    setHydrated(true);

    const initSocket = () => {
      // Clean up existing socket first
      if (newSocket.current) {
        newSocket.current.removeAllListeners();
        newSocket.current.disconnect();
        newSocket.current = null;
      }

      // Create new socket with better configuration
      newSocket.current = io(serverUrl, {
        transports: ["polling", "websocket"],
        auth: { userId: currentUserId() || "" },
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        forceNew: true,
      });

      console.log("newSocket Created...");

      if (newSocket.current) {
        newSocket.current.emit("mobile");

        newSocket.current.on("connect", () => {
          console.log("Socket connected successfully");
          setIsConnected(true);
          toast({
            title: "Connected",
            description: "Connected to Third Eye server.",
            variant: "success",
          });
          if (newSocket.current) {
            newSocket.current.emit("mobile-acknowledgment",{userId:userId});
          }
        });

        newSocket.current.on("disconnect", (reason) => {
          console.warn("Disconnected:", reason);
          setIsConnected(false);
          setIsStreamingFrames(false);
        });

        newSocket.current.on("reconnect", (attemptNumber) => {
          console.log("Reconnected after", attemptNumber, "attempts");
          setIsConnected(true);
        });

        newSocket.current.on("reconnect_error", (error) => {
          console.error("Reconnection error:", error);
        });

        newSocket.current.on("connect_error", (err) => {
          console.error("Connection error:", err.message);
          toast({
            title: "Connection Error",
            description: "Could not connect to Third Eye server. Retrying...",
            variant: "destructive",
          });
        });
      }
    };

    const init = async () => {
      timer = setTimeout(() => {
        setShowInitialNotice(false);
        setShowSurveillanceNotice(true);
      }, 3000);

      setTimeout(initSocket, 100);
    };

    try {
      init();
    } catch (err) {
      console.error("Initialization error:", err);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }

      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }

      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
          mediaRecorderRef.current.ondataavailable = null;
          mediaRecorderRef.current.onstop = null;
        } catch (err) {
          console.error("Error stopping media recorder:", err);
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (newSocket.current) {
        newSocket.current.removeAllListeners();
        newSocket.current.disconnect();
        newSocket.current = null;
      }
    };
  }, []);

  const captureAndSendFrame = () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !newSocket.current ||
      !isConnected
    )
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          blob.arrayBuffer().then((buffer) => {
            newSocket.current?.emit("videos", {
              buffer,
              userId: userId,
              examId: examId,
            });
          });
        }
      },
      "image/jpeg",
      0.7
    );
  };

  const startStreaming = async () => {
    try {
      console.log("Starting surveillance recording ...");
      newSocket.current?.emit("start-exam", {
        user_id: userId,
        category: "third_eye",
      });

      await delay(500);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Add a delay to ensure camera is released
      await delay(500);

      console.log("FloatingCamera: Requesting camera access...");

      // Try to get camera with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          const currentOrientation = getOrientation();
          streamRef.current = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: {
                ideal: currentOrientation === "landscape" ? 640 : 640,
              },
              height: {
                ideal: currentOrientation === "landscape" ? 480 : 480,
              },
              frameRate: { ideal: 30 },
              aspectRatio:
                currentOrientation === "landscape"
                  ? { ideal: 16 / 9 }
                  : { ideal: 4 / 3 },
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

      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }

      if (streamRef.current) {
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
          mimeType: "video/webm; codecs=vp8",
          videoBitsPerSecond: 1000000,
        });
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = (e: any) => {
          if (e.data.size > 0) {
            e.data.arrayBuffer().then((buffer: ArrayBuffer) => {
              const chunkData: any = {
                user_id: userId,
                category: "third_eye",
                chunk: buffer,
              };
              if (newSocket.current) {
                console.log("Recording ...");
                newSocket.current.emit(
                  "recorder-add-video-stream-chunk",
                  chunkData
                );
              }
            });
          }
        };

        mediaRecorderRef.current.start(500); // send chunks every 500ms
      }

      frameIntervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 1000 / 30);

      setIsStreamingFrames(true);
      toast({
        title: "Third Eye Activated",
        description: "You are under surveillance.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Camera Error",
        description: "Could not access the camera.",
        variant: "destructive",
      });
    }
  };

  const stopStreaming = () => {
    console.log("Stopping streaming...");

    newSocket.current?.emit("end-exam", {
      user_id: userId,
      category: "third_eye",
    });

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log(
          `Stopping track: ${track.kind}, state: ${track.readyState}`
        );
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreamingFrames(false);
    toast({ title: "Streaming Stopped", description: "Camera stream ended." });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(120deg, #232526 0%, #414345 100%)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Orientation Message */}
      {orientation === "portrait" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.85)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 1,
            textAlign: "center",
            backdropFilter: "blur(6px)",
          }}
        >
          <span style={{ marginBottom: 16 }}>
            Please rotate your device to{" "}
            <span style={{ color: "#38bdf8" }}>landscape</span> mode to use
            Third Eye.
          </span>
          <svg
            width="60"
            height="60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="m3 8 4-4 4 4" />
            <path d="m13 16 4 4 4-4" />
          </svg>
        </div>
      )}
      {/* Status Header */}
      {orientation === "landscape" && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            right: 20,
            zIndex: 30,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,0,0,0.7)",
              padding: "8px 12px",
              borderRadius: 20,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <Eye size={16} />
            <span>Third Eye</span>
          </div>

          <div
            style={{
              background: isConnected
                ? "rgba(34,197,94,0.8)"
                : "rgba(239,68,68,0.8)",
              padding: "8px 12px",
              borderRadius: 20,
              color: "#fff",
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </div>
      )}

      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: orientation === "landscape" ? "100vh" : "100%",
          height: orientation === "landscape" ? "100vw" : "100%",
          objectFit: "cover",
          transform:
            orientation === "landscape"
              ? "translate(-50%, -50%) rotate(90deg)"
              : "translate(-50%, -50%) rotate(0deg)",
          objectPosition: "center",
          background: "rgba(30,41,59,0.7)",
          zIndex: 1,
          borderRadius: 0,
          boxShadow: "0 8px 32px 0 rgba(31,38,135,0.37)",
          filter:
            orientation === "portrait" ? "blur(8px) grayscale(0.7)" : "none",
          transition: "all 0.3s ease",
        }}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Control Button */}
      {hydrated && orientation === "landscape" && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 0,
            width: "100vw",
            display: "flex",
            justifyContent: "center",
            zIndex: 20,
          }}
        >
          <button
            onClick={isStreamingFrames ? stopStreaming : startStreaming}
            disabled={!isConnected}
            style={{
              background: isStreamingFrames
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              border: "none",
              padding: "18px 38px",
              borderRadius: 60,
              fontSize: 18,
              fontWeight: 700,
              cursor: isConnected ? "pointer" : "not-allowed",
              opacity: isConnected ? 1 : 0.5,
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 8px 32px 0 rgba(31,38,135,0.37)",
              transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
              transform: "translateY(0)",
              letterSpacing: 0.5,
              backdropFilter: "blur(2px)",
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = "translateY(2px)";
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {isStreamingFrames ? (
              <>
                <Eye size={22} />
                Stop Surveillance
              </>
            ) : (
              <>
                <Camera size={22} />
                Start Surveillance
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Messages */}
      {(showInitialNotice || showSurveillanceNotice) &&
        orientation === "landscape" && (
          <div
            style={{
              position: "absolute",
              top: 80,
              left: 20,
              right: 20,
              zIndex: 15,
            }}
          >
            {showInitialNotice && (
              <div
                style={{
                  background: "rgba(59,130,246,0.9)",
                  color: "#fff",
                  padding: "12px 16px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Camera size={16} />
                Initializing camera...
              </div>
            )}
            {/* {showSurveillanceNotice && (
              <div
                style={{
                  background: "rgba(239,68,68,0.9)",
                  color: "#fff",
                  padding: "12px 16px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Shield size={16} />
                Surveillance Active
              </div>
            )} */}
          </div>
        )}
    </div>
  );
}
