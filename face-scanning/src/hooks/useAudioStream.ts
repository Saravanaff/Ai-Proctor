import { useState, useEffect } from "react";

export const useAudioStream = () => {
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    const getAudioStream = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(localStream);
      } catch (e) {
        console.error("Microphone access error:", e);
        setAudioStream(null);
      }
    };

    getAudioStream();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { audioStream };
};
