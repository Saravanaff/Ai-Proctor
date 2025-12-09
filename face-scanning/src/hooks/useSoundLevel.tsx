import { useEffect, useState, useRef } from 'react';
import { soundLimit } from '@/constants/soundConfig';

const useSoundLevel = (examSubmitted: boolean = false) => {
    const [isSoundDetected, setIsSoundDetected] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const animationFrameRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isMountedRef = useRef(true);

    // ✅ Cleanup function to stop all microphone resources
    const cleanupMicrophone = () => {
      console.log("🎬 Cleaning up useSoundLevel microphone...");
      
      isMountedRef.current = false;

      // Cancel animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
          console.log("✅ AudioContext closed");
        } catch (e) {
          console.warn("Error closing AudioContext:", e);
        }
        audioContextRef.current = null;
      }

      // ✅ Stop microphone stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log(`🎬 Stopping useSoundLevel microphone track: ${track.kind}, state: ${track.readyState}`);
          track.stop();
        });
        streamRef.current = null;
        console.log("✅ Microphone stream stopped in useSoundLevel");
      }
    };

    // ✅ Stop microphone immediately when exam is submitted
    useEffect(() => {
      if (examSubmitted) {
        console.log("🛑 Exam submitted - stopping useSoundLevel microphone immediately");
        cleanupMicrophone();
      }
    }, [examSubmitted]);

    useEffect(() => {
      isMountedRef.current = true;

      const initSound = async () => {
        try {
          console.log("🎤 Initializing sound detection...");
          streamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });

          if (!streamRef.current || !isMountedRef.current) {
            console.log("⚠️ Sound detection initialization cancelled");
            return;
          }

          console.log("✅ Audio stream obtained");
          audioContextRef.current = new (
            window.AudioContext ||
            (window as any).webkitAudioContext
          )();
          
          const analyser = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
          source.connect(analyser);

          // ✅ Better settings for voice/sound detection
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.8;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          console.log(`🎤 Sound detection active - threshold: ${soundLimit}`);

          let logCounter = 0;
          const detectSound = () => {
            if (!isMountedRef.current) return;

            analyser.getByteFrequencyData(dataArray);
            
            // ✅ Calculate average with focus on voice frequencies (85Hz - 255Hz for human voice)
            let sum = 0;
            let count = 0;
            
            // Focus on frequency bins that typically contain voice (roughly bins 8-50 for voice range)
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
              if (dataArray[i] > 0) {
                count++;
              }
            }
            
            const avg = sum / bufferLength;
            
            // ✅ Also calculate max value for spike detection
            const max = Math.max(...Array.from(dataArray));

            setAudioLevel(avg);
            
            // ✅ Detect sound if average OR max exceeds threshold
            const isDetected = avg > soundLimit || max > (soundLimit * 3);
            setIsSoundDetected(isDetected);

            // Log every 60 frames (~1 second) to show audio levels
            logCounter++;
            if (logCounter % 60 === 0) {
              console.log(`📊 Audio Stats - Avg: ${avg.toFixed(2)}, Max: ${max}, Active bins: ${count}/${bufferLength}`);
            }

            if (isDetected) {
              console.log(`🔊 Sound detected! Avg: ${avg.toFixed(2)}, Max: ${max}, Active bins: ${count} (threshold: ${soundLimit})`);
            }

            animationFrameRef.current = requestAnimationFrame(detectSound);
          };

          detectSound();
        } catch (error) {
          console.error("❌ Error initializing sound detection:", error);
        }
      };

      initSound();

      // ✅ Cleanup on unmount
      return cleanupMicrophone;
    }, []); // Empty dependency array - only run once

    return { isSoundDetected, audioLevel };
};

export default useSoundLevel;