import { useEffect, useState, useRef } from "react";

export const useVideoStream = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream;

    const getVideoStream = async () => {
      try {
        setIsLoading(true);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setVideoStream(stream);
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
      if (videoRef?.current?.srcObject instanceof MediaStream) {
        videoRef?.current?.srcObject.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  return { videoRef, videoStream, isLoading, error };
};
