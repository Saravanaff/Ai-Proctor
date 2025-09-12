import React, { useEffect, useState, useRef } from 'react';
import ExamPage from "@/components/FullScreen";
import styles from "../styles/ExamPage.module.css";
import { sleep } from '@/utils/delay';
import { getExamId, getUserId } from '@/constants/AuthStore';
import socket from "@/components/socket";
import { useTheme } from "@/contexts/ThemeContext";
import useMicrophoneDevices from '@/hooks/useMicrophoneDevices';
import axios from 'axios';
import { getExamSettings } from '@/constants/examSettingsConsts';
import { setNumberOfMicrophones } from '@/constants/violationConsts';


const userId = getUserId() || "unknown";
const examId = getExamId();
const examSettings = getExamSettings();
console.log("User ID:", userId);


const fullscreen = () => {
    const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
    const [rulesAccepted, setRulesAccepted] = useState(false);
    const { theme } = useTheme();
    const { getMicrophoneCount } = useMicrophoneDevices();

    useEffect(() => {
        const getCount = async() => {
            let cnt = await getMicrophoneCount();
            return cnt;
        }
        getCount().then(cnt => {
            setNumberOfMicrophones(cnt);
        });
    },[])

    // const frontCameraMediaRecorderRef = useRef<MediaRecorder>(null);
    const screenRecorderMediaRecorderRef = useRef<MediaRecorder>(null);


    const startScreenRecording = async (screenStream: any) => {
        try {
            socket.emit("start-exam", {
                user_id: userId,
                exam_id: examId,
                category: "screen_recording"
            });
            // const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            console.log("screenStream : ", screenStream)
            if (screenStream) {
                screenRecorderMediaRecorderRef.current = new MediaRecorder(screenStream, {
                    mimeType: "video/webm; codecs=vp8",
                    videoBitsPerSecond: 1000000,
                });
                // screenRecorderMediaRecorderRef.current.start();
            }
            if (screenRecorderMediaRecorderRef.current) {
                console.log("ondataavailable");
                screenRecorderMediaRecorderRef.current.ondataavailable = (e: any) => {
                    if (e.data.size > 0) {
                        e.data.arrayBuffer().then((buffer: ArrayBuffer) => {
                            const chunkData: any = {
                                user_id: userId,
                                exam_id: examId,
                                category: "screen_recording",
                                chunk: buffer,
                            };
                            console.log("Sending screen recording chunk");
                            socket.emit("recorder-add-video-stream-chunk", chunkData);
                        });
                    }
                };
            }
            if (screenRecorderMediaRecorderRef.current) {
                console.log("Starting screen recorder");
                screenRecorderMediaRecorderRef.current.start(500);
            }
            setFullscreenAllowed(true);
            // requestFullscreen();
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
            <div className={`${styles.examGuidelinesContainer} theme-transition`} data-theme={theme}>
                <div className={`${styles.guidelinesCard} card-theme`}>
                    <div className={styles.header}>
                        <h1>Online Exam Guidelines</h1>
                        <p>Please read carefully and follow all instructions</p>
                    </div>
                    
                    <div className={styles.content}>
                        <section className={styles.section}>
                            <h2>🚨 Important Requirements</h2>
                            <ul>
                                <li>Ensure you have a stable internet connection</li>
                                <li>Use a desktop or laptop computer</li>
                                <li>Close all unnecessary applications and browser tabs</li>
                                <li>Charge your device or keep it plugged in</li>
                                <li>Have a backup internet connection ready if possible</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>📹 Camera & Audio Setup</h2>
                            <ul>
                                <li>Position your camera to show your face and shoulders clearly</li>
                                <li>Ensure good lighting - avoid backlighting</li>
                                <li>Test your microphone and camera before starting</li>
                                <li>Keep your camera on throughout the entire exam</li>
                                <li>Do not cover or disable your camera during the exam</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>🏠 Environment Guidelines</h2>
                            <ul>
                                <li>Choose a quiet, well-lit room with minimal distractions</li>
                                <li>Sit at a clean desk with only permitted materials</li>
                                <li>Inform others not to disturb you during the exam</li>
                                <li>Remove or cover any notes, books, or electronic devices</li>
                                <li>Keep your workspace organized and clutter-free</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>📋 During the Exam</h2>
                            <ul>
                                <li>Look directly at your screen - avoid looking away frequently</li>
                                <li>Do not leave your seat</li>
                                <li>Do not use any unauthorized materials or devices</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>🚫 Prohibited Activities</h2>
                            <ul>
                                <li>Using tablets, or smart devices</li>
                                <li>Communicating with others during the exam</li>
                                <li>Opening new browser tabs or applications</li>
                                <li>Taking screenshots or photos of exam content</li>
                                <li>Using notes, books, or external materials (unless permitted)</li>
                                <li>Having other people in the room</li>
                            </ul>
                        </section>

                        <section className={styles.section}>
                            <h2>⚠️ Proctoring Notice</h2>
                            <p className={styles.notice}>
                                This exam is monitored by AI proctoring software. Your screen activity, 
                                camera feed, and audio will be recorded and analyzed for any suspicious 
                                behavior. Any violations may result in immediate exam termination and 
                                academic consequences.
                            </p>
                        </section>
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.acknowledgment}>
                            <label className={styles.checkbox}>
                                <input 
                                    type="checkbox" 
                                    onChange={(e) => setRulesAccepted(e.target.checked)}
                                />
                                <span>I have read and understood all the guidelines above</span>
                            </label>
                        </div>
                        <button 
                            className={`${styles.proceedButton} button-theme`}
                            disabled={!rulesAccepted}
                            onClick={async () => {
                                let screenStream = null;
                                if(examSettings.screen_sharing_enabled){
                                    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                                }
                                startScreenRecording(screenStream)
                            }}
                        >
                            Accept & Start Exam
                        </button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <>
            {fullscreenAllowed && <ExamPage screenRecorderMediaRecorderRef={screenRecorderMediaRecorderRef} />}
        </>
    );
}


export default fullscreen