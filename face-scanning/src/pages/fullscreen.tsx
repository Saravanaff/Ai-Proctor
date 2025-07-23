// Fullscreen.tsx
import React, { useState, useRef, useEffect } from "react";
import ExamPage from "@/components/FullScreen";
import styles from "../styles/ExamPage.module.css";
import socket from "@/components/socket";

const Fullscreen = () => {
  const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
  const [screenSharingStream, setScreenSharingStream] = useState<MediaStream | null>(null);
  const screenSharingRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('');

  // Handles what to do after recording completes
  const handleRecordingComplete = async (blob: Blob) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screen-recording-${timestamp}.webm`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setRecordingStatus(`Recording downloaded as ${filename}`);
      console.log('Recording downloaded:', filename);
    } catch (error) {
      console.error('Error handling recording:', error);
      setRecordingStatus('Error processing recording');
    }
  };

  // Requests screen sharing, then requests fullscreen
  const requestPermissions = async () => {
    try {
      // Request screen sharing
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setScreenSharingStream(null);
        setFullscreenAllowed(false);
        setIsRecording(false);
        setRecordingStatus("");
      });

      setScreenSharingStream(stream);

      // Now request fullscreen
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
      else if ((el as any).msRequestFullscreen) await (el as any).msRequestFullscreen();

      setFullscreenAllowed(true);

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        if (chunks.length > 0) {
          const recordedBlob = new Blob(chunks, { type: 'video/webm' });
          await handleRecordingComplete(recordedBlob);
        }
      };

      setMediaRecorder(recorder);

      setTimeout(() => {
        if (recorder.state === 'inactive') {
          recorder.start(1000);
          setIsRecording(true);
          setRecordingStatus('Recording started automatically');
          console.log('Auto-started screen recording');
        }
      }, 1000);
    } catch (err) {
      console.error("Error requesting permissions:", err);
      alert("You must allow fullscreen and screen sharing to continue the exam.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setRecordingStatus('Processing recording...');
      console.log('Screen recording stopped');
    }
  };

  // Clean up only on unmount
  useEffect(() => {
    return () => {
      if (screenSharingStream) {
        screenSharingStream.getTracks().forEach((track) => track.stop());
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
  }, []); // No dependencies → cleanup only on component unmount

  // UI before fullscreen + screen share granted
  if (!fullscreenAllowed) {
    return (
      <div className={styles.blockScreen}>
        <h2>Screen sharing and fullscreen are required to start the exam</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          ⚠️ Recording will start automatically and download when completed
        </p>
        <button onClick={requestPermissions}>
          Allow Screen Sharing & Enter Fullscreen
        </button>
      </div>
    );
  }

  // UI after permissions granted and recording is running
  return (
    <>
      {fullscreenAllowed && (
        <>
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-end'
          }}>
            {isRecording && (
              <div 
                className="recording-indicator"
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                🔴 REC
              </div>
            )}
          </div>

          <ExamPage
            screenSharingRef={screenSharingRef}
            screenSharingStream={screenSharingStream}
            onStopRecording={stopRecording}
          />
        </>
      )}
    </>
  );
};

export default Fullscreen;
