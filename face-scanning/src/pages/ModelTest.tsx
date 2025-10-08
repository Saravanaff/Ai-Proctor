import React, { useEffect, useRef } from 'react'
import io from 'socket.io-client';


/*  
    Access To modify this file only goes to Sriram !!!!!
*/



const socket = io("http://localhost:3001");

const ModelTest = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const intervalRef = useRef<any>(null);

    useEffect(() => {
        const init = async() => {    
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video:true,
                audio:false,
            })
            if(videoRef.current){
                videoRef.current.srcObject = videoStream;
            }

            intervalRef.current = setInterval(async() => {
                const canvas = document.createElement('canvas');
                if(videoRef.current && videoRef.current.readyState >= 2) {
                    canvas.width = videoRef.current.videoWidth;
                    canvas.height = videoRef.current.videoHeight;
                    const context = canvas.getContext('2d');
                    if(!context) return ;
                    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height); 
                }
                canvas.toBlob((blob) => {
                    if(blob) {
                        blob.arrayBuffer().then((buffer) => {
                            // Modify Data Here As you want sriram
                            console.log("buff");
                            const sendingData = {
                                buffer: buffer
                            };
                            socket.emit("sriram-server",sendingData);
                        });
                    }
                });
            },1000/30)

        }   
        init();
    },[]);
   
  return (
    <>
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
            }}
        >
            <video 
                ref={videoRef}
                autoPlay
                playsInline 
            />
        </div>
    </>
  )
}

export default ModelTest