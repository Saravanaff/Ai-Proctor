import React,{ useEffect, useState, useRef } from 'react';
import ExamPage from "@/components/FullScreen";
import styles from "../styles/ExamPage.module.css";
import { sleep } from '@/utils/delay';
import { getUserId } from '@/constants/AuthStore';
import socket from "@/components/socket";


const userId = getUserId() || "unknown";
console.log("User ID:", userId);


const fullscreen = () => {
    const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
    
    // const frontCameraMediaRecorderRef = useRef<MediaRecorder>(null);
    const screenRecorderMediaRecorderRef = useRef<MediaRecorder>(null);


    const startScreenRecording = async (screenStream : any) => {
        try {
            socket.emit("start-exam",{
                user_id: userId,
                category: "screen_recording"
            });
            // const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            console.log("screenStream : ",screenStream)
            if (screenStream) {
                screenRecorderMediaRecorderRef.current = new MediaRecorder(screenStream, {
                    mimeType: "video/webm; codecs=vp8",
                });
                // screenRecorderMediaRecorderRef.current.start();
            }
            if(screenRecorderMediaRecorderRef.current){
                console.log("ondataavailable");
                screenRecorderMediaRecorderRef.current.ondataavailable = (e: any) => {
                    if (e.data.size > 0) {
                        e.data.arrayBuffer().then((buffer: ArrayBuffer) => {
                            const chunkData: any = {
                                user_id: userId,
                                category: "screen_recording",
                                chunk: buffer,
                            };
                            console.log("Sending screen recording chunk");
                            socket.emit("recorder-add-video-stream-chunk", chunkData);
                        });
                    }
                };
            }
            if(screenRecorderMediaRecorderRef.current){
                console.log("Starting screen recorder");
                screenRecorderMediaRecorderRef.current.start(500);
            }

            requestFullscreen();
        } catch (error) {
            console.error("Error starting screen recording:", error);
        }
    };
    
    const requestFullscreen = async () => {
        const el = document.documentElement;
        try {
            if (el.requestFullscreen) await el.requestFullscreen();
            else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
            else if ((el as any).msRequestFullscreen) await (el as any).msRequestFullscreen();
    
            setFullscreenAllowed(true);

        } catch (err) {
            alert("You must allow fullscreen to continue the exam.");
        }
    };



    useEffect(() => {
        const onFsChange = () => {
            const doc: any = document as any;
            const active = !!(document.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
            setFullscreenAllowed(active);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        // @ts-ignore vendor prefixes
        document.addEventListener('webkitfullscreenchange', onFsChange);
        // @ts-ignore
        document.addEventListener('msfullscreenchange', onFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            // @ts-ignore
            document.removeEventListener('webkitfullscreenchange', onFsChange);
            // @ts-ignore
            document.removeEventListener('msfullscreenchange', onFsChange);
        };
    }, []);
    

    if (!fullscreenAllowed) {

        return (
            <div className={styles.blockScreen}>
                <h2>Fullscreen is required to start the exam</h2>
                <button onClick={async () => {
                    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    startScreenRecording(screenStream)
                }}>Enter Fullscreen</button>
            </div>
        );
    }
    
    return (
    <>
        {fullscreenAllowed && <ExamPage screenRecorderMediaRecorderRef={screenRecorderMediaRecorderRef}/>}
    </>
  )
}


export default fullscreen