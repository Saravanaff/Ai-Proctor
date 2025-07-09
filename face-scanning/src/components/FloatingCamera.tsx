import React, { useRef, useEffect, useState } from "react";
import styles from "../styles/FloatingCamera.module.css";

const FloatingCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    const rect = cameraRef.current?.getBoundingClientRect();
    setOffset({
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, offset]);

  return (
    <div
      ref={cameraRef}
      className={styles.floatingCamera}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      <video ref={videoRef} autoPlay muted width={200} height={150} />
    </div>
  );
};

export default FloatingCamera;
