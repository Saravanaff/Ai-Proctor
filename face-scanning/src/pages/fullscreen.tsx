import React from "react";
import { useState, useRef, useEffect } from "react";
import ExamPage from "@/components/FullScreen";
import styles from "../styles/ExamPage.module.css";
import { sleep } from "@/utils/delay";

const fullscreen = () => {
  const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
  const [screenSharingStream, setScreenSharingStream] =
    useState<MediaStream | null>(null);
  const screenSharingRef = useRef<HTMLVideoElement | null>(null);

  const requestFullscreen = async () => {
    const el = document.documentElement;
    try {
      // Request screen sharing FIRST, before entering fullscreen
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: false,
      });

      // Only after screen sharing is granted, request fullscreen
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen)
        await (el as any).webkitRequestFullscreen();
      else if ((el as any).msRequestFullscreen)
        await (el as any).msRequestFullscreen();

      setScreenSharingStream(stream);
      setFullscreenAllowed(true);
    } catch (err) {
      console.error("Error requesting fullscreen or screen sharing:", err);
      alert(
        "You must allow fullscreen and screen sharing to continue the exam."
      );
    }
  };

  // Cleanup effect for screen sharing stream
  useEffect(() => {
    return () => {
      if (screenSharingStream) {
        screenSharingStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []); // Empty dependency array - only cleanup on unmount

  if (!fullscreenAllowed) {
    return (
      <div className={styles.blockScreen}>
        <h2>Screen sharing and fullscreen are required to start the exam</h2>
        <button onClick={requestFullscreen}>
          Allow Screen Sharing & Enter Fullscreen
        </button>
      </div>
    );
  }

  return (
    <>
      {fullscreenAllowed && (
        <ExamPage
          screenSharingRef={screenSharingRef}
          screenSharingStream={screenSharingStream}
        />
      )}
    </>
  );
};

export default fullscreen;
