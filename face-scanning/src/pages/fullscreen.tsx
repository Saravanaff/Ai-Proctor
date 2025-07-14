import React from 'react';
import { useState } from 'react';
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