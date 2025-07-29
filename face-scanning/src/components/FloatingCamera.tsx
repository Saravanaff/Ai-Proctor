import React, { useRef, useEffect, useState } from "react";
import styles from "../styles/FloatingCamera.module.css";
import { gname } from "./GetName";
import { useToast } from "@/hooks/use-toast";
const FloatingCamera = ({
  socket,
  onLookingAway,
  detect,
  number,
  onAuthFaceMissing,
}: any) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const interRef = useRef<any>(null);
  const audRef = useRef<any>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [borderColor, setBorderColor] = useState("white");
  const {toast}=useToast();

  let look=0;
  let person=0;
  let auth=0;
  let item=0;
  let np=0;
  let mp=0;
  let uauth=0;
  let lp=0;
  let mlp=0;

  // const [look, setLook] = useState(0);
  // const [person, setPerson] = useState(0);
  // const [auth, setAuth] = useState(0);
  // const [item, setItem] = useState(0);

  useEffect(() => {
    let stream: MediaStream;
    let audioStream: MediaStream;
    const changeColor = async () => {
      setBorderColor("red");
      setTimeout(() => setBorderColor("white"), 3000);
    };

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            height: 480,
            width: 480,
          },
        });
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        interRef.current = setInterval(async () => {
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
              if (blob) {
                blob.arrayBuffer().then((buffer) => {
                  socket.emit("authenticate", {
                    buffer,
                    metadata: {
                      width,
                      height,
                    },
                    name: gname,
                  });
                });
              }
            },
            "image/jpeg",
            0.7
          );
        }, 1000 / 30);
      } catch (error) {
        console.error("Camera access failed:", error);
      }
    };

    startCamera();

    socket.on("thirdeye_alert",(data:any)=>{
      if(data.person==0){
        np++;
        if(np%100!=0){
          return;
        }
        np=0;
        toast({
          title:"Canditate is not present",
          description:"No persons are there",
          variant:"destructive"
        });
      }
      if(data.person>1){
        mp++;
        if(mp%100!=0){
          return;
        }
        mp=0;
        toast({
          title:"More number of persons are present",
          description:"Please ensure candidate is present in isolated area",
          variant:"destructive"
        })
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

      if(data.laptop<1){
        mlp++;
        if(mlp%150!=0) return;
        mlp=0;
          toast({
            title:"Candiate Laptop is not present",
            description:"No laptop is present",
            variant:"destructive"
          })
        
      }
      if(data.unauth_device==true){
        uauth++;
        if(uauth%50!==0) return;
        uauth=0;
        toast({
          title:"Unauthorized Device Detected",
          description:"Dont keep Gadgets Nearby",
          variant:"destructive"
        });
      }
    })
    socket.on("alert", (data: any) => {
      console.log(data);
    if(data.head_position !=="Forward"){
      look++;
      if(look%150 !== 0) return;
      look=0;
      onLookingAway(data.head_position);
    }
    if(data.head_position=='Forward' && data.eyes[0] !== "Center" && data.eyes[1] !== "Center"){
      console.log("looking away with eyes");
      look++;
      if(look%150 !== 0) return;
      look=0;
      onLookingAway(data.head_position);
    }
    if(data.object_detected["cell phone"]){
      item++;
      if(item%10 !== 0) return;
      item=0;
      detect();
      changeColor();
    }
    if(data.no_of_person != 1){
      person++;
      if(person%120 != 0) return;
      person=0;
      number(data.no_of_person);
      changeColor();
    }
    else if(!data.auth_face){
      auth++;
      if(auth%600 !== 0) return;
      auth=0;
      changeColor();
      onAuthFaceMissing();
    }


  });

    return () => {
      if (interRef.current) clearInterval(interRef.current);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [socket]);

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
