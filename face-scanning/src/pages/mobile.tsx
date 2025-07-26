import { useEffect, useRef, useState } from "react";
import {
  Eye,
  Shield,
  Camera,
  Wifi,
  WifiOff,
  RotateCcw,
  Maximize2,
  Video,
} from "lucide-react";
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
  const [orientationAllowed, setOrientationAllowed] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [videoRotation, setVideoRotation] = useState(0);
  const { toast } = useToast();

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

  useEffect(() => {
    const handleOrientationChange = () => {
      const angle = screen.orientation?.angle ?? 0;
      setVideoRotation(angle);
      setOrientationAllowed(window.innerWidth > window.innerHeight);
    };

    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);
    handleOrientationChange();

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.emit("mobile");

    newSocket.on("connect", () => {
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "Connected to Third Eye server.",
        variant: "success",
      });
      newSocket.emit("summa");
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
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitialNotice(false);
      setShowSurveillanceNotice(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const requestOrientation = async () => {
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        await (screen.orientation as any).lock("landscape");
        setOrientationAllowed(true);
      } else {
        if (window.innerWidth > window.innerHeight) {
          setOrientationAllowed(true);
        } else {
          setOrientationAllowed(false);
          toast({
            title: "Orientation Required",
            description: "Please rotate your device to landscape mode.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      setOrientationAllowed(false);
      toast({
        title: "Orientation Required",
        description:
          "Please rotate your device to landscape and allow orientation lock.",
        variant: "destructive",
      });
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setCameraStream(stream);
      setCameraAllowed(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      toast({
        title: "Camera Allowed",
        description: "Camera access granted.",
        variant: "success",
      });
    } catch (error) {
      setCameraAllowed(false);
      toast({
        title: "Camera Error",
        description: "Could not access the camera.",
        variant: "destructive",
      });
    }
  };

  const requestFullscreen = async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen)
        await (el as any).webkitRequestFullscreen();
      else if ((el as any).msRequestFullscreen)
        await (el as any).msRequestFullscreen();
      setFullscreenAllowed(true);
    } catch (err) {
      setFullscreenAllowed(false);
      toast({
        title: "Fullscreen Required",
        description: "You must allow fullscreen to continue.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const checkFullscreen = () => {
      setFullscreenAllowed(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };
    document.addEventListener("fullscreenchange", checkFullscreen);
    document.addEventListener("webkitfullscreenchange", checkFullscreen);
    document.addEventListener("msfullscreenchange", checkFullscreen);
    checkFullscreen();
    return () => {
      document.removeEventListener("fullscreenchange", checkFullscreen);
      document.removeEventListener("webkitfullscreenchange", checkFullscreen);
      document.removeEventListener("msfullscreenchange", checkFullscreen);
    };
  }, []);

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !socket || !isConnected)
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
            socket.emit("video", buffer);
          });
        }
      },
      "image/jpeg",
      0.7
    );
  };

  const startStreaming = async () => {
    if (!cameraAllowed || !cameraStream) {
      toast({
        title: "Camera Required",
        description: "Please allow camera before starting surveillance.",
        variant: "destructive",
      });
      return;
    }
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen)
        await (el as any).webkitRequestFullscreen();
      else if ((el as any).msRequestFullscreen)
        await (el as any).msRequestFullscreen();
      setFullscreenAllowed(true);

      if (videoRef.current && videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
        await videoRef.current.play();
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
        title: "Fullscreen Error",
        description: "Could not enter fullscreen.",
        variant: "destructive",
      });
    }
  };

  const stopStreaming = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    setIsStreamingFrames(false);
    toast({ title: "Streaming Stopped", description: "Camera stream ended." });
  };

  if (!orientationAllowed) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Eye size={24} className="text-gradient" />
          <h1>Third Eye Surveillance</h1>
        </div>
        <div className={styles.notice}>
          <RotateCcw className="inline mr-2" size={20} />
          <span>Landscape mode is required to start surveillance.</span>
          <button className={styles.button} onClick={requestOrientation}>
            Allow Landscape
          </button>
        </div>
      </div>
    );
  }

  if (!cameraAllowed) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Eye size={24} className="text-gradient" />
          <h1>Third Eye Surveillance</h1>
        </div>
        <div className={styles.notice}>
          <Video className="inline mr-2" size={20} />
          <span>Camera access is required to continue.</span>
          <button className={styles.button} onClick={requestCamera}>
            Allow Camera
          </button>
        </div>
      </div>
    );
  }

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
