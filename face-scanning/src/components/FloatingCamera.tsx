import React, { useRef, useEffect, useState } from "react";
import styles from "../styles/FloatingCamera.module.css";
import { useToast } from "@/hooks/use-toast";
import * as mediasoupClient from "mediasoup-client";
import useSoundLevel from "@/hooks/useSoundLevel";
import { getUserId } from "../constants/AuthStore";
import { delay } from '@/utils/delay';


interface VideoChunkData {
  user_id: string;
  category: string;
  chunk: ArrayBuffer;
}

const FloatingCamera = ({
  socket,
  onLookingAway,
  detect,
  number,
  onAuthFaceMissing,
  examSubmitted,
  mediaRecorderRef,
  onAuthPause,
  onAuthResume,
}: any) => {
  
  const isInitialized = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const interRef = useRef<any>(null);
  const streamRef = useRef<MediaStream>(null);
  
  const hasEverAuthedRef = useRef(false);
  const hasPausedOnceRef = useRef(false);
  const lastToastAtRef = useRef<number>(0);
  
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [borderColor, setBorderColor] = useState("white");
  const [prevSoundDetected, setPrevSoundDetected] = useState(false);

  const scanning = true; 

  const { toast } = useToast();

  let look = 0;
  let person = 0;
  let auth = 0;
  let item = 0;
  let np = 0;
  let mp = 0;
  let uauth = 0;
  let mlp = 0;

  useEffect(() => {
    if (examSubmitted) {
      console.log("Exam Submitted");
      if (mediaRecorderRef.current) {
        console.log(mediaRecorderRef.current.state);
        mediaRecorderRef.current.stop();
        console.log(mediaRecorderRef.current.state);
      }
    }
  }, [examSubmitted]);

  /* Sound Level Detection */
  const { isSoundDetected, audioLevel } = useSoundLevel();
  useEffect(() => {
    if (isSoundDetected && !prevSoundDetected) {
      toast({
        title: "Sound Detected",
        description: "Audio detected during exam",
        variant: "destructive",
      });
      setBorderColor("red");
    } else if (!isSoundDetected) {
      setBorderColor("white");
    }
    setPrevSoundDetected(isSoundDetected);
  }, [audioLevel, isSoundDetected, prevSoundDetected, toast]);



  /* Front Camera Streaming And Detection */
  useEffect(() => {
    if (isInitialized.current) return;

    isInitialized.current = true;
    let isMounted = true;

    const changeColor = async () => {
      setBorderColor("red");
      setTimeout(() => setBorderColor("white"), 3000);
    };

    const startCamera = async () => {
      try {
        // Stop any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Add a delay to ensure camera is released
        await delay(500);

        console.log("FloatingCamera: Requesting camera access...");

        // Try to get camera with retry logic
        let retries = 3;
        while (retries > 0) {
          try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({
              video: {
                height: 480,
                width: 480,
                frameRate: 30,
              },
              
            });
            break;
          
          } catch (err) {
            const error = err as Error;
            if (error.name === "NotReadableError" && retries > 1) {
              console.log(
                `Camera busy, retrying... (${retries - 1} attempts left)`
              );
              await new Promise((resolve) => setTimeout(resolve, 2000));
              retries--;
            } else {
              throw err; 
            }
          }
        }

        if (!isMounted) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          return;
        }
        console.log("FloatingCamera: Camera access successful");
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }

        if (streamRef.current) {
          mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
            mimeType: "video/webm; codecs=vp8",
            videoBitsPerSecond: 1000000,
          });
        }

        mediaRecorderRef.current.ondataavailable = (e: any) => {
          if (e.data.size > 0 && !examSubmitted) {

            e.data.arrayBuffer().then((buffer: ArrayBuffer) => {
              const chunkData: VideoChunkData = {
                user_id: getUserId() || "unknown",
                category: "face_camera",
                chunk: buffer,
              };
              socket.emit("recorder-add-video-stream-chunk", chunkData);
            });
          }
        };

        mediaRecorderRef.current.start(500); // send chunks every 500ms

        // const { rtpCapabilities } = await socket.emitWithAck(
        //   "getRtpCapabilities"
        // );
        // device = new mediasoupClient.Device();
        // await device.load({ routerRtpCapabilities: rtpCapabilities });
        // let transportOptions = await socket.emitWithAck(
        //   "createWebRtcTransport",
        //   {
        //     direction: "send",
        //   }
        // );
        // sendTransport = device.createSendTransport(transportOptions);
        // sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
        //   socket.emit(
        //     "connectTransport",
        //     {
        //       transportId: sendTransport.id,
        //       dtlsParameters,
        //     },
        //     callback
        //   );
        // });
        // sendTransport.on(
        //   "produce",
        //   async ({ kind, rtpParameters }, callback, errback) => {
        //     const { id } = await socket.emitWithAck("produce", {
        //       transportId: sendTransport.id,
        //       kind,
        //       rtpParameters,
        //     });
        //     callback({ id });
        //   }
        // );
        // const videoTrack = streamRef.current.getVideoTracks()[0];
        // await sendTransport.produce({ track: videoTrack });
        // sendTransportRef.current = sendTransport;

        interRef.current = setInterval(async () => {
          if (!isMounted) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;

          const width = video.videoWidth;
          const height = video.videoHeight;

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(video, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob && isMounted) {
                blob
                  .arrayBuffer()
                  .then((buffer) => {
                    socket.emit("authenticate", {
                      buffer,
                      metadata: {
                        width,
                        height,
                      },
                    user_id: getUserId(),
                    });
                  })
                  .catch((error) => {
                    console.error(
                      "Error processing authentication frame:",
                      error
                    );
                  });
              }
            },
            "image/jpeg",
            0.7
          );
        }, 1000 / 5); // Reduced from 30fps to 5fps
      } catch (error) {
        console.error("Camera access failed:", error);

        // Handle specific camera errors
        const err = error as Error;
        if (err.name === "NotReadableError") {
          console.log("Camera is busy, likely being used by another component");
          // toast({
          //   title: "Camera Busy",
          //   description: "Camera is being used by another component",
          //   variant: "destructive",
          // });

          // Try again after a delay
          setTimeout(() => {
            if (isMounted) {
              console.log("Retrying camera access...");
              startCamera();
            }
          }, 3000);
        } else if (err.name === "NotAllowedError") {
          toast({
            title: "Camera Permission Denied",
            description: "Please allow camera access",
            variant: "destructive",
          });
        }
      }
    };

    startCamera();

    socket.on("thirdeye_alert", (data: any) => {
      if (data.person == 0) {
        np++;
        if (np % 100 != 0) {
          return;
        }
        np = 0;
        toast({
          title: "Canditate is not present",
          description: "No persons are there",
          variant: "destructive",
        });
      }
      if (data.person > 1) {
        mp++;
        if (mp % 100 != 0) {
          return;
        }
        mp = 0;
        toast({
          title: "More number of persons are present",
          description: "Please ensure candidate is present in isolated area",
          variant: "destructive",
        });
      }
      // if(data.laptop>1){
      //   lp++;
      //   if(lp%150!==0) return;
      //   lp=0;
      //   toast({
      //     title:"Laptop other than Canditate is present",
      //     description:"More number of Laptops are present",
      //     variant:"destructive"
      //   })
      // }

      if (data.laptop < 1) {
        mlp++;
        if (mlp % 150 != 0) return;
        mlp = 0;
        toast({
          title: "Candiate Laptop is not present",
          description: "No laptop is present",
          variant: "destructive",
        });
      }
      if (data.unauth_device == true) {
        uauth++;
        if (uauth % 50 !== 0) return;
        uauth = 0;
        toast({
          title: "Unauthorized Device Detected",
          description: "Dont keep Gadgets Nearby",
          variant: "destructive",
        });
      }
    });
    const handleAlert = (data: any) => {
      const now = Date.now();
      // Initial authentication gating
      // console.log(data);
      if (!hasEverAuthedRef.current) {
        if (data?.auth_face === true) {
          hasEverAuthedRef.current = true;
          if (hasPausedOnceRef.current && typeof onAuthResume === 'function') onAuthResume();
          if (now - lastToastAtRef.current > 2500) {
            toast({ title: "Identity Verified", description: "Face authenticated", variant: "default" });
            lastToastAtRef.current = now;
          }
        } else if (data?.auth_face === false) {
          if (!hasPausedOnceRef.current && typeof onAuthPause === 'function') {
            onAuthPause();
            hasPausedOnceRef.current = true;
          }
          if (now - lastToastAtRef.current > 2500) {
            toast({ title: "Face Not Authenticated", description: "Hold still for a quick rescan", variant: "destructive" });
            lastToastAtRef.current = now;
          }
        }
      } else {
        // Post-initial phase: only indicate, never pause/resume
        if (data?.auth_face === false) {
          if (now - lastToastAtRef.current > 4000) {
            toast({ title: "Authentication Lost", description: "Face not recognized", variant: "destructive" });
            lastToastAtRef.current = now;
          }
          onAuthFaceMissing();
        }
      }

      if (data.head_position !== "Forward") {
        look++;
        if (look % 150 !== 0) return;
        look = 0;
        console.log("looking away")
        onLookingAway(data.head_position);
      }
      if (
        data.head_position == "Forward" &&
        data.eyes[0] !== "Center" &&
        data.eyes[1] !== "Center"
      ) {
        // console.log("looking away with eyes");
        look++;
        if (look % 150 !== 0) return;
        look = 0;
        onLookingAway(data.head_position);
      }
      if (data.object_detected["cell phone"]) {
        item++;
        if (item % 10 !== 0) return;
        item = 0;
        detect();
        changeColor();
      }
      if (data.no_of_person != 1) {
        person++;
        if (person % 50 != 0) return;
        person = 0;
        number(data.no_of_person);
        changeColor();
      } 
       if (!data.auth_face) {
        auth++;
        if (auth %600 !== 0) return;
        auth = 0;
        changeColor();
        onAuthFaceMissing();
      }
    };
    socket.on("alert", handleAlert);

    return () => {
      console.log("FloatingCamera cleanup - stopping recording");
      isMounted = false;
      isInitialized.current = false; // Reset for potential remount

      if (mediaRecorderRef.current) {
        // Clear event handler first
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;

        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      }

      if (interRef.current) {
        clearInterval(interRef.current);
        interRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          console.log(
            `Stopping FloatingCamera track: ${track.kind}, state: ${track.readyState}`
          );
          track.stop();
        });
        streamRef.current = null;
      }

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Remove socket listeners
      socket.off("thirdeye_alert");
      socket.off("alert");
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    const rect = cameraRef.current?.getBoundingClientRect();
    setOffset({
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, offset]);

  return (
    <div
      ref={cameraRef}
      className={styles.floatingCamera}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        border: `2px solid ${borderColor}`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Scanning overlay */}
      {scanning && (
        <div className={styles.scanOverlay}>
          <div className={styles.scanLine} />
        </div>
      )}
      <video
        className={styles.video}
        ref={videoRef}
        autoPlay
        muted
        width={200}
        height={150}
      />
    </div>
  );
};

export default FloatingCamera;

