import { useEffect, useState, useRef } from "react";

export const useVideoStream = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getVideoStream = async () => {
      try {
        setIsLoading(true);
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef && videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        setVideoStream(streamRef.current);
        setError(null);
      } catch (e) {
        console.log("Error While getting Video Stream Object");
        console.error(e);
        setError("Unable to access camera");
      } finally {
        setIsLoading(false);
      }
    };

    getVideoStream();

    return () => {
      // Clean up stream from ref
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Clear video element
      if (videoRef?.current?.srcObject instanceof MediaStream) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return { videoRef, videoStream, isLoading, error };
};
