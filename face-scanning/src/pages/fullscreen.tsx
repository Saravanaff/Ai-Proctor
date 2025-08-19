import React,{ useEffect, useState } from 'react';
import ExamPage from "@/components/FullScreen";
import styles from "../styles/ExamPage.module.css";
import { sleep } from '@/utils/delay';

const fullscreen = () => {
    const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
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
                <button onClick={requestFullscreen}>Enter Fullscreen</button>
            </div>
        );
    }
    
    return (
    <>
        {fullscreenAllowed && <ExamPage />}
    </>
  )
}


export default fullscreen