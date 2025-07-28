import { useEffect, useRef, useState } from "react";
import { Eye, Shield, Camera, Wifi, WifiOff,Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import styles from "../styles/ThirdEye.module.css";

export default function ThirdEye() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showInitialNotice, setShowInitialNotice] = useState(true);
  const [showSurveillanceNotice, setShowSurveillanceNotice] = useState(false);
  const [isStreamingFrames, setIsStreamingFrames] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const serverUrl = "https://10.167.56.168:3002/";
  console.log("Server URL:", serverUrl);

  useEffect(() => {
    const newSocket = io(serverUrl);
    setSocket(newSocket);
    if(newSocket){
      newSocket.emit('mobile');
    }
    newSocket.on("connect", () => {
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "Connected to Third Eye server.",
        variant: "success",
      });
      newSocket.emit('summa');
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("Disconnected:", reason);
      setIsConnected(false);
      setIsStreamingFrames(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
      toast({
        title: "Connection Error",
        description: "Could not connect to Third Eye server.",
        variant: "destructive",
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialNotice(false);
      setShowSurveillanceNotice(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const captureAndSendFrame = () => {
  if (!videoRef.current || !canvasRef.current || !socket || !isConnected) return;

  const video = videoRef.current;
  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");
  if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (blob) {
      blob.arrayBuffer().then((buffer) => {
        socket.emit("video", buffer);
      });
    }
  }, "image/jpeg", 0.7);
};

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (screen.orientation && (screen.orientation as any).lock) {
          try {
            await (screen.orientation as any).lock("landscape");
          } catch (e) {
          }
        }
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
    if (videoRef.current?.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
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
            transform: `translate(-50%, -50%)`,
            objectFit: "contain",
            width: "100%",
            height: "100vw",
            background: "black",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 40,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
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
        </div>
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
              style={{ margin: "8px 0 0 0", background: "rgba(255,0,0,0.12)" }}
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
