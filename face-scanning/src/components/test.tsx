'use client';

import { useEffect, useRef, useState } from "react";
import { Eye, Shield, Camera, Wifi, WifiOff, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import { getUserId } from "@/constants/AuthStore";
import styles from "../styles/ThirdEye.module.css";
import { delay } from "@/utils/delay";

const userId = getUserId() || "unknown";
console.log("User ID:", userId);

export default function ThirdEye() {
  // const [socket, setSocket] = useState<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showInitialNotice, setShowInitialNotice] = useState(true);
  const [showSurveillanceNotice, setShowSurveillanceNotice] = useState(false);
  const [isStreamingFrames, setIsStreamingFrames] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { toast } = useToast();

  const serverUrl = "https://172.16.105.211:3002/";
  console.log("Server URL:", serverUrl);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);  
  const streamRef = useRef<MediaStream | null>(null);
  const newSocket = useRef<Socket | null>(null);
  const isInitialized = useRef(false);
  
  


  useEffect(() => {

    if (isInitialized.current) return;
    isInitialized.current = true;

    newSocket.current = io(serverUrl);
    console.log("newSocket Created...");
    let timer: NodeJS.Timeout;
    let isMounted = true;
    setHydrated(true); 
    
    const handleOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    const init = async () => {

      window.addEventListener("resize", handleOrientation);
      window.addEventListener("orientationchange", handleOrientation);
      
      timer = setTimeout(() => {
        if (isMounted) {
          setShowInitialNotice(false);
          setShowSurveillanceNotice(true);
        }
      }, 3000);

      if(newSocket.current){

        newSocket.current.on("connect", () => {
          console.log("Socket connected");
          if (isMounted) {
            setIsConnected(true);
            toast({
              title: "Connected",
              description: "Connected to Third Eye server.",
              variant: "success",
            });
          }
          // Only emit after connection is established
          newSocket.current?.emit('mobile');
          newSocket.current?.emit('summa');
        });

        newSocket.current.on("disconnect", (reason) => {
          console.warn("Disconnected:", reason);
          if (isMounted) {
            setIsConnected(false);
            setIsStreamingFrames(false);
          }
        });

        newSocket.current.on("connect_error", (err) => {
          console.error("Connection error:", err.message);
          if (isMounted) {
            toast({
              title: "Connection Error",
              description: "Could not connect to Third Eye server.",
              variant: "destructive",
            });
          }
        });
      }
    }

    init();

    handleOrientation();


    return () => {
      console.log("Mobile component cleanup");
      isMounted = false;
      isInitialized.current = false;

      if(timer){
        clearTimeout(timer)
      }

      if (mediaRecorderRef.current) {
        // Clear event handlers first
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;

        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      }

      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log(`Stopping mobile track: ${track.kind}, state: ${track.readyState}`);
          track.stop();
        });
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      if (newSocket.current) {
        newSocket.current.disconnect();
        newSocket.current = null;
      }

      window.removeEventListener("resize", handleOrientation);
      window.removeEventListener("orientationchange", handleOrientation);
    } 


    // return () => {
    //   newSocket.disconnect();
    // };
  }, []);


  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !newSocket.current || !isConnected) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video is ready
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob && newSocket.current && isConnected) {
        blob.arrayBuffer().then((buffer) => {
          newSocket.current?.emit("video", buffer);
        }).catch((error) => {
          console.error("Error processing frame:", error);
        });
      }
    }, "image/jpeg", 0.7);
  };

  const startStreaming = async () => {
    try {
      console.log("Starting surveillance recording ...");
      
      // Wait for socket connection before proceeding
      if (!newSocket.current || !isConnected) {
        toast({
          title: "Connection Error",
          description: "Not connected to server. Please wait for connection.",
          variant: "destructive",
        });
        return;
      }

      newSocket.current.emit("proxy-start-exam",{
        user_id: userId,
        category: "third_eye",
      });

      await delay(500);

      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Stop any existing MediaRecorder
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      }

      // Stop any existing frame capture
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }

      // Add a delay to ensure camera is released
      await delay(500);

      console.log("Mobile: Requesting camera access...");

      // Try to get camera with retry logic
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

      if (!streamRef.current) {
        throw new Error("Failed to get camera stream");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;

        // Wait for video to be ready before proceeding
        await new Promise<void>((resolve) => {
          const checkVideoReady = () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              resolve();
            } else {
              setTimeout(checkVideoReady, 100);
            }
          };
          checkVideoReady();
        });

        const container = videoRef.current.parentElement?.parentElement;
        if (container && container.requestFullscreen) {
          container.requestFullscreen();
        }

        if (screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock("landscape");
          } catch (e) {}
        }
      }

      // Create MediaRecorder only after stream is ready
      if (streamRef.current) {
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
          mimeType: "video/webm; codecs=vp8",
          videoBitsPerSecond: 1000000,
        });

        mediaRecorderRef.current.ondataavailable = (e: any) => {
          if (e.data.size > 0 && newSocket.current && isConnected) {
            e.data.arrayBuffer().then((buffer: ArrayBuffer) => {
              const chunkData: any = {
                user_id: userId,
                category: "third_eye",
                chunk: buffer,
              };
              if (newSocket.current) {
                console.log("Recording ...");
                newSocket.current.emit("proxy-recorder-add-video-stream-chunk", chunkData);
              }
            }).catch((error: any) => {
              console.error("Error processing video chunk:", error);
            });
          }
        };

        // Add error handler
        mediaRecorderRef.current.onerror = (event: any) => {
          console.error("MediaRecorder error:", event);
        };

        // Wait a bit before starting recording
        await delay(200);
        mediaRecorderRef.current.start(500); // send chunks every 500ms
      }

      // Start frame capture after everything is set up
      frameIntervalRef.current = setInterval(() => {
        captureAndSendFrame();
      }, 1000 / 30);

      setIsStreamingFrames(true);
      toast({
        title: "Third Eye Activated",
        description: "You are under surveillance.",
      });

    } catch (error) {
      console.error("Error starting stream:", error);
      toast({
        title: "Camera Error",
        description: "Could not access the camera.",
        variant: "destructive",
      });
      
      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }
  };

  const stopStreaming = () => {
    console.log("Stopping streaming...")
    
    // Emit stop exam event
    newSocket.current?.emit("proxy-end-exam",{
      user_id: userId,
      category: "third_eye",
    });
    
    // Stop MediaRecorder first
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    // Stop frame capture
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind}, state: ${track.readyState}`);
        track.stop();
      });
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreamingFrames(false);
    toast({ title: "Streaming Stopped", description: "Camera stream ended." });
  };

  return (
    <div
      className={styles.container}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={styles.video}
          style={{
            transform: isLandscape
              ? "translate(-50%, -50%) rotate(0deg)"
              : "translate(-50%, -50%) rotate(90deg)",
            objectFit: "contain",
            width: "95%",
            height: "100vw",
            background: "black",
            position: "absolute",
            top: "50%",
            left: "50%",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Surveillance button or rotate warning */}
        {hydrated && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 120,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {isLandscape ? (
              <button
                className={`${styles.button} ${
                  isStreamingFrames ? styles.stopButton : styles.startButton
                }`}
                onClick={isStreamingFrames ? stopStreaming : startStreaming}
                disabled={!isConnected}
                style={{ pointerEvents: "auto" }}
              >
                {isStreamingFrames ? (
                  <>
                    <Eye className="mr-2 inline" size={18} />
                    Stop Surveillance
                  </>
                ) : (
                  <>
                    <Maximize2 className="mr-2 inline" size={18} />
                    Start Surveillance
                  </>
                )}
              </button>
            ) : (
              <div
                style={{
                  color: "#fff",
                  background: "#e53935",
                  padding: "10px 18px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  pointerEvents: "auto",
                }}
              >
                Please rotate your device to landscape to start surveillance.
              </div>
            )}
          </div>
        )}

        {/* Top status bar */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            minWidth: 220,
            maxWidth: 320,
            background: "rgba(0,0,0,0.65)",
            borderRadius: 12,
            padding: "14px 18px",
            zIndex: 10,
            color: "#fff",
            boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
          }}
        >
          <div
            className={styles.header}
            style={{
              margin: 0,
              background: "none",
              border: "none",
              animation: "none",
              padding: 0,
            }}
          >
            <Eye size={22} className="text-gradient" />
            <span style={{ fontWeight: 600, fontSize: 18 }}>Third Eye</span>
            {isConnected ? (
              <Wifi size={18} className="text-green-400" />
            ) : (
              <WifiOff size={18} className="text-red-400" />
            )}
          </div>

          {showInitialNotice && (
            <div
              className={`${styles.notice} ${styles.initialNotice}`}
              style={{
                margin: "8px 0 0 0",
                background: "rgba(0,162,255,0.12)",
              }}
            >
              <Camera className="inline mr-2" size={16} />
              <span>Initializing...</span>
            </div>
          )}
          {showSurveillanceNotice && (
            <div
              className={`${styles.notice} ${styles.surveillanceNotice}`}
              style={{
                margin: "8px 0 0 0",
                background: "rgba(255,0,0,0.12)",
              }}
            >
              <Shield className="inline mr-2" size={16} />
              <span>Surveillance Engaged</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}