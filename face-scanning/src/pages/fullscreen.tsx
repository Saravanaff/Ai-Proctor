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
    const [screenShareError, setScreenShareError] = useState(false);
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

    const screenRecorderMediaRecorderRef = useRef<MediaRecorder>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const pendingScreenChunksRef = useRef<Set<number>>(new Set());
    const screenChunkCounterRef = useRef<number>(0);
    const pendingFaceChunksRef = useRef<Set<number>>(new Set());

    // ✅ Helper function to wait for all pending chunks to complete
    const waitForPendingScreenChunks = (): Promise<void> => {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (pendingScreenChunksRef.current.size === 0) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100); // Check every 100ms
            
            // Safety timeout (10 seconds max)
            setTimeout(() => {
                if (pendingScreenChunksRef.current.size > 0) {
                    console.warn(`⚠️ Timeout waiting for screen chunks. ${pendingScreenChunksRef.current.size} chunks still pending.`);
                }
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });
    };

    const startScreenRecording = async () => {
        try {
            socket.emit("start-exam", {
                user_id: userId,
                exam_id: examId,
                category: "screen_recording",
                timestamp: new Date(),
            });

            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            console.log("screenStream : ", screenStream);

            if (!screenStream) {
                throw new Error("No screen stream obtained");
            }

            screenStreamRef.current = screenStream;

            const mimeType = "video/webm; codecs=vp8";
            const options: any = { videoBitsPerSecond: 500000 };  // ✅ Reduced from 1Mbps to 500Kbps
            if (MediaRecorder && typeof (MediaRecorder as any).isTypeSupported === 'function') {
                if ((MediaRecorder as any).isTypeSupported(mimeType)) {
                    options.mimeType = mimeType;
                } else {
                    console.warn(`MIME type ${mimeType} not supported by this browser. Using default MediaRecorder settings.`);
                }
            }

            screenRecorderMediaRecorderRef.current = new MediaRecorder(screenStream, options);

            screenRecorderMediaRecorderRef.current.ondataavailable = (e: any) => {
                try {
                    if (e && e.data && e.data.size > 0) {
                        const chunkNum = screenChunkCounterRef.current++;
                        
                        // ✅ Track this chunk as pending
                        pendingScreenChunksRef.current.add(chunkNum);
                        
                        e.data.arrayBuffer().then((buffer: ArrayBuffer) => {
                            // ✅ Check if MediaRecorder is inactive (meaning this is likely the final chunk)
                            const isFinalChunk = screenRecorderMediaRecorderRef.current?.state === 'inactive';
                            
                            const chunkData: any = {
                                user_id: userId,
                                exam_id: examId,
                                category: "screen_recording",
                                chunk: buffer,
                                timestamp: Date.now(),
                                chunkNumber: chunkNum,
                                isFinal: isFinalChunk,
                                totalChunks: isFinalChunk ? chunkNum + 1 : undefined,
                            };
                            
                            if (isFinalChunk) {
                                console.log(`🏁 Sending FINAL screen chunk #${chunkNum} (${buffer.byteLength} bytes)`);
                            } else {
                                console.log(`📹 Sending screen chunk #${chunkNum} (${buffer.byteLength} bytes)`);
                            }
                            
                            socket.emit("recorder-add-video-stream-chunk", chunkData);
                            
                            // ✅ Remove from pending after successful emit
                            pendingScreenChunksRef.current.delete(chunkNum);
                            console.log(`✅ Screen chunk #${chunkNum} sent, ${pendingScreenChunksRef.current.size} pending`);
                        }).catch((err: any) => {
                            console.error(`Failed to convert screen chunk #${chunkNum}:`, err);
                            // ✅ Remove from pending even on error
                            pendingScreenChunksRef.current.delete(chunkNum);
                        });
                    }
                } catch (err) {
                    console.error("Error in ondataavailable for screen recorder:", err);
                }
            };

            screenRecorderMediaRecorderRef.current.onstop = async () => {
                console.log("🎬 Screen MediaRecorder stopped event fired");
                
                // ✅ Wait for all pending chunks to finish uploading
                console.log(`⏳ Waiting for ${pendingScreenChunksRef.current.size} pending screen chunks...`);
                await waitForPendingScreenChunks();
                console.log("✅ All screen chunks sent!");
                
                // ✅ Wait additional 500ms to ensure chunks are fully transmitted over network
                console.log("⏳ Additional 500ms network safety delay...");
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // ✅ NOW emit stream-listener-off AFTER all chunks are sent
                console.log("📤 Emitting stream-listener-off for screen_recording");
                socket.emit("stream-listener-off", {
                    user_id: userId,
                    exam_id: examId,
                    category: "screen_recording",
                    timestamp: new Date(),
                    totalChunks: screenChunkCounterRef.current,
                    isFinal: true,
                });
                
                // ✅ Wait 3.5 seconds to ensure face camera completes and storage server drains all buffers
                console.log("⏳ Waiting 3.5 seconds for face camera to complete and buffers to drain...");
                await new Promise(resolve => setTimeout(resolve, 3500));
                
                // ✅ NOW emit end-exam AFTER ensuring both recordings are complete
                console.log("📤 Emitting end-exam event");
                socket.emit("end-exam", {
                    user_id: userId,
                    exam_id: examId,
                    timestamp: new Date(),
                    status: "success",
                    message: "Exam Ended successfully",
                });
            };

            screenRecorderMediaRecorderRef.current.onerror = (err: any) => {
                console.error("Screen MediaRecorder error:", err);
            };

            try {
                console.log("Starting screen recorder");
                screenRecorderMediaRecorderRef.current.start(500);
            } catch (err) {
                console.error("Failed to start screen MediaRecorder:", err);
                if (screenStreamRef.current) {
                    screenStreamRef.current.getTracks().forEach((t) => t.stop());
                    screenStreamRef.current = null;
                }
                throw err;
            }

            setFullscreenAllowed(true);
            // requestFullscreen();
        } catch (error: any) {
            console.log("Screen sharing permission denied or cancelled:", error);
            // User denied screen sharing permission or cancelled
            setScreenShareError(true);
            setFullscreenAllowed(false);
            
            // Make sure any partial stream is stopped
            if (screenStreamRef.current) {
                try {
                    screenStreamRef.current.getTracks().forEach((t) => t.stop());
                } catch (e) {
                    // ignore
                }
                screenStreamRef.current = null;
            }
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
        document.addEventListener('webkitfullscreenchange', onFsChange);
        document.addEventListener('msfullscreenchange', onFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', onFsChange);
            document.removeEventListener('webkitfullscreenchange', onFsChange);
            document.removeEventListener('msfullscreenchange', onFsChange);
        };
    }, []);

    // Cleanup screen recording and tracks when this page unmounts
    useEffect(() => {
        return () => {
            try {
                if (screenRecorderMediaRecorderRef.current) {
                    try {
                        if (screenRecorderMediaRecorderRef.current.state !== 'inactive') {
                            screenRecorderMediaRecorderRef.current.stop();
                        }
                    } catch (e) {
                        // ignore stop errors
                    }
                    screenRecorderMediaRecorderRef.current.ondataavailable = null;
                    screenRecorderMediaRecorderRef.current.onstop = null;
                    screenRecorderMediaRecorderRef.current.onerror = null;
                    screenRecorderMediaRecorderRef.current = null;
                }

                if (screenStreamRef.current) {
                    try {
                        screenStreamRef.current.getTracks().forEach((t) => t.stop());
                    } catch (e) {
                        // ignore
                    }
                    screenStreamRef.current = null;
                }
            } catch (err) {
                console.warn('Error during screen recording cleanup', err);
            }
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
                    
                    {screenShareError && (
                        <div className={styles.content}>
                            <section className={styles.section}>
                                <h2 style={{ color: '#ff4444' }}>🚫 Screen Sharing Required</h2>
                                <p className={styles.notice} style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '8px', marginTop: '10px' }}>
                                    <strong>You cannot start the exam without enabling screen sharing.</strong>
                                    <br /><br />
                                    Screen sharing is mandatory for this exam to ensure academic integrity. 
                                    Please click "Try Again" and allow screen sharing permission when prompted.
                                </p>
                                <ul style={{ marginTop: '15px' }}>
                                    <li>Click the "Try Again" button below</li>
                                    <li>Select the screen/window you want to share</li>
                                    <li>Click "Share" in the browser permission dialog</li>
                                    <li>Do not cancel or deny the screen sharing request</li>
                                </ul>
                            </section>
                        </div>
                    )}
                    
                    {!screenShareError && (
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
                    )}

                    <div className={styles.footer}>
                        {screenShareError ? (
                            <button 
                                className={`${styles.proceedButton} button-theme`}
                                onClick={async () => {
                                    setScreenShareError(false);
                                    setRulesAccepted(false);
                                    if(examSettings.screen_sharing_enabled){
                                        startScreenRecording();
                                    }
                                }}
                            >
                                Try Again
                            </button>
                        ) : (
                            <>
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
                                            startScreenRecording();
                                        }
                                    }}
                                >
                                    Accept & Start Exam
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }


    return (
        <>
            {fullscreenAllowed && (
                <ExamPage 
                    screenRecorderMediaRecorderRef={screenRecorderMediaRecorderRef}
                    screenStreamRef={screenStreamRef}
                    pendingScreenChunksRef={pendingScreenChunksRef}
                    pendingFaceChunksRef={pendingFaceChunksRef}
                />
            )}
        </>
    );
}


export default fullscreen