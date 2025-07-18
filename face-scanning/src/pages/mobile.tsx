import { useEffect, useRef, useState } from "react";
import { Eye, Shield, Camera, Wifi, WifiOff } from "lucide-react";
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

  useEffect(() => {
    const newSocket = io("http://localhost:3001");
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
    <div className={styles.container}>
      <div className={styles.header}>
        <Eye size={24} className="text-gradient" />
        <h1>Third Eye Surveillance</h1>
        {isConnected ? (
          <Wifi size={20} className="text-green-400" />
        ) : (
          <WifiOff size={20} className="text-red-400" />
        )}
      </div>

      {showInitialNotice && (
        <div className={`${styles.notice} ${styles.initialNotice}`}>
          <Camera className="inline mr-2" size={20} />
          <span>Initializing surveillance systems...</span>
        </div>
      )}

      {showSurveillanceNotice && (
        <div className={`${styles.notice} ${styles.surveillanceNotice}`}>
          <Shield className="inline mr-2" size={20} />
          <span>Active Surveillance Mode Engaged</span>
        </div>
      )}

      <video 
        ref={videoRef} 
        className={styles.video} 
        autoPlay 
        playsInline 
        muted 
        style={{ transform: 'rotate(0deg)', objectFit: 'cover' }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <button
        className={`${styles.button} ${
          isStreamingFrames ? styles.stopButton : styles.startButton
        }`}
        onClick={isStreamingFrames ? stopStreaming : startStreaming}
        disabled={!isConnected}
      >
        {isStreamingFrames ? (
          <>
            <Eye className="mr-2 inline" size={18} />
            Stop Surveillance
          </>
        ) : (
          <>
            <Camera className="mr-2 inline" size={18} />
            Start Surveillance
          </>
        )}
      </button>
    </div>
  );
}
