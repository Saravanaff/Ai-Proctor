import { useEffect, useState, useRef } from 'react';
import { soundLimit } from '@/constants/soundConfig';

const useSoundLevel = () => {
    const [isSoundDetected, setIsSoundDetected] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const animationFrameRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
      isMountedRef.current = true;

      const initSound = async () => {
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });

          if (!streamRef.current || !isMountedRef.current) return;

          audioContextRef.current = new (
            window.AudioContext ||
            (window as any).webkitAudioContext
          )();
          
          const analyser = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
          source.connect(analyser);

          analyser.fftSize = 2048;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const detectSound = () => {
            if (!isMountedRef.current) return;

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
              sum += dataArray[i];
            }
            const avg = sum / bufferLength;

            setAudioLevel(avg);
            setIsSoundDetected(avg > soundLimit);

            animationFrameRef.current = requestAnimationFrame(detectSound);
          };

          detectSound();
        } catch (error) {
          console.error("Error initializing sound detection:", error);
        }
      };

      initSound();

      return () => {
        isMountedRef.current = false;

        // Cancel animation frame
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Stop media stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };
    }, []); // Empty dependency array - only run once

    return { isSoundDetected, audioLevel };
};

export default useSoundLevel;