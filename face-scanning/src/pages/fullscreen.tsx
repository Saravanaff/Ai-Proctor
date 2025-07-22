import React from "react";
import { useState, useRef, useEffect } from "react";
import ExamPage from "@/components/FullScreen";
import styles from "../styles/ExamPage.module.css";
import socket from "@/components/socket";

const Fullscreen = () => {
  const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
  const [screenSharingStream, setScreenSharingStream] =
    useState<MediaStream | null>(null);
  const screenSharingRef = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('');

  // Function to handle recording completion
  const handleRecordingComplete = async (blob: Blob) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screen-recording-${timestamp}.webm`;
      
      // Create download link
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
      else if ((el as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen)
        await (el as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      else if ((el as unknown as { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen)
        await (el as unknown as { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen();

      setScreenSharingStream(stream);
      setFullscreenAllowed(true);
      
      // Initialize MediaRecorder for local screen recording
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm'
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        console.log('Screen recording stopped');
        if (chunks.length > 0) {
          const recordedBlob = new Blob(chunks, { type: 'video/webm' });
          await handleRecordingComplete(recordedBlob);
        }
      };
      
      setMediaRecorder(recorder);
      
      // Automatically start recording when entering fullscreen
      setTimeout(() => {
        recorder.start(1000); // Collect data every second
        setIsRecording(true);
        setRecordingStatus('Recording started automatically');
        console.log('Auto-started screen recording');
      }, 1000); // Small delay to ensure everything is set up
      
    } catch (err) {
      console.error("Error requesting fullscreen or screen sharing:", err);
      alert(
        "You must allow fullscreen and screen sharing to continue the exam."
      );
    }
  };

  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingStatus('Recording started');
      console.log('Screen recording started');
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


  // Cleanup effect for screen sharing stream and recording
  useEffect(() => {
    return () => {
      if (screenSharingStream) {
        screenSharingStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
    };
  }, [screenSharingStream, mediaRecorder]);

  if (!fullscreenAllowed) {
    return (
      <div className={styles.blockScreen}>
        <h2>Screen sharing and fullscreen are required to start the exam</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          ⚠️ Recording will start automatically and download when completed
        </p>
        <button onClick={requestFullscreen}>
          Allow Screen Sharing & Enter Fullscreen
        </button>
      </div>
    );
  }

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
