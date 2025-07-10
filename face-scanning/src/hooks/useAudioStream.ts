import { useState, useEffect } from "react";

export const useAudioStream = () => {
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let stream: MediaStream;

    const getAudioStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
      } catch (e) {
        console.error("Microphone access error:", e);
        setAudioStream(null);
      }
    };

    getAudioStream();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { audioStream };
};
