import { useState, useEffect, useRef } from "react";

export const useAudioStream = () => {
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const getAudioStream = async () => {
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(streamRef.current);
      } catch (e) {
        console.error("Microphone access error:", e);
        setAudioStream(null);
      }
    };

    getAudioStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return { audioStream };
};
