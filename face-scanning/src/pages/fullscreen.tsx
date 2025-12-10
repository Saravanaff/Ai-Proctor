import React, { useEffect, useState, useRef } from 'react';
import ExamPage from "@/components/FullScreen";
import styles from "../styles/ExamPage.module.css";
import { sleep } from '@/utils/delay';
import { getExamId, getUserId, hasValidExamId, hasValidUserId } from '@/constants/AuthStore';
import socket from "@/components/socket";
import { useTheme } from "@/contexts/ThemeContext";
import useMicrophoneDevices from '@/hooks/useMicrophoneDevices';
import axios from 'axios';
import { getExamSettings } from '@/constants/examSettingsConsts';
import { setNumberOfMicrophones } from '@/constants/violationConsts';
import { useExamState } from '@/hooks/useExamState';
import ExamStateError from '@/components/ExamStateError';
import { 
  CheckCircle, 
  Monitor, 
  AlertTriangle, 
  Shield, 
  Eye, 
  Camera,
  Volume2,
  MousePointer
} from 'lucide-react';


const fullscreen = () => {
    // 1️⃣ Call ALL hooks first - before any conditional returns
    const examState = useExamState();
    
    const [fullscreenAllowed, setFullscreenAllowed] = useState(false);
    const [rulesAccepted, setRulesAccepted] = useState(false);
    const [screenShareError, setScreenShareError] = useState(false);
  
    const { theme } = useTheme();
    const { getMicrophoneCount } = useMicrophoneDevices();

    // ✅ Save theme preference to localStorage when changed
  

    // All useRef hooks must be called before any conditional returns
    const screenRecorderMediaRecorderRef = useRef<MediaRecorder>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const pendingScreenChunksRef = useRef<Set<number>>(new Set());
    const screenChunkCounterRef = useRef<number>(0);
    const pendingFaceChunksRef = useRef<Set<number>>(new Set());

    // ✅ Get validated data from exam state
    const userId = examState.userId || "unknown";
    const examId = examState.examId;
    const examSettings = examState.examSettings || getExamSettings();

    console.log("User ID:", userId);
    console.log("Exam ID:", examId);

    // 🔥 CRITICAL: ALL useEffect hooks MUST be called before ANY conditional returns
    // useEffect #1: Get microphone count and load theme
    useEffect(() => {
        const getCount = async() => {
            let cnt = await getMicrophoneCount();
            return cnt;
        }
        getCount().then(cnt => {
            setNumberOfMicrophones(cnt);
        });
        
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])

    // useEffect #2: Track fullscreen state changes
    useEffect(() => {
        const onFsChange = () => {
            const active = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).msFullscreenElement
            );
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

    // useEffect #3: Cleanup screen recording and tracks when this page unmounts
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

    // Professional High-Tech Black Theme Configuration
    const themes = {
        dark: {
            background: "#0f172a",
            cardBg: "rgba(30, 41, 59, 0.98)",
            cardBorder: "rgba(71, 85, 105, 0.5)",
            textPrimary: "#ffffff",
            textSecondary: "#e2e8f0",
            textMuted: "#94a3b8",
            accentPrimary: "#3b82f6",
            ruleBg: "rgba(30, 41, 59, 0.8)",
            ruleBorder: "rgba(71, 85, 105, 0.5)",
            iconBg: "rgba(59, 130, 246, 0.12)",
            iconColor: "#3b82f6",
            buttonPrimaryBg: "#3b82f6",
            buttonPrimaryShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
            errorBg: "rgba(239, 68, 68, 0.08)",
            errorBorder: "rgba(239, 68, 68, 0.5)",
            errorText: "#ef4444",
        },
        light: {
            background: "#f8fafc",
            cardBg: "rgba(255, 255, 255, 0.95)",
            cardBorder: "rgba(226, 232, 240, 0.9)",
            textPrimary: "#0f172a",
            textSecondary: "#475569",
            textMuted: "#64748b",
            accentPrimary: "#3b82f6",
            ruleBg: "rgba(255, 255, 255, 0.7)",
            ruleBorder: "rgba(226, 232, 240, 0.8)",
            iconBg: "rgba(59, 130, 246, 0.1)",
            iconColor: "#3b82f6",
            buttonPrimaryBg: "#3b82f6",
            buttonPrimaryShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            errorBg: "rgba(239, 68, 68, 0.1)",
            errorBorder: "rgba(239, 68, 68, 0.3)",
            errorText: "#dc2626",
        }
    };

    const currentTheme = themes.light;

    // 2️⃣ NOW conditional returns are safe - after ALL hooks
    // ✅ Show error screen if exam state is invalid
    if (examState.error) {
        return (
            <ExamStateError
                type={examState.error.type}
                message={examState.error.message}
                recoverable={examState.error.recoverable}
                onRetry={examState.retry}
            />
        );
    }

    // ✅ Show loading while validating
    if (examState.isLoading) {
        return (
            <div style={{
                minHeight: "100vh",
                background: currentTheme.background,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.3s ease",
            }}>
                <div style={{
                    background: currentTheme.cardBg,
                    backdropFilter: "blur(20px)",
                    borderRadius: "24px",
                    padding: "48px",
                    border: `1px solid ${currentTheme.cardBorder}`,
                    maxWidth: "500px",
                    textAlign: "center",
                    transition: "all 0.3s ease",
                }}>
                    <h1 style={{
                        fontSize: "28px",
                        fontWeight: "700",
                        color: currentTheme.textPrimary,
                        marginBottom: "12px",
                        transition: "color 0.3s ease",
                    }}>Initializing Exam...</h1>
                    <p style={{
                        fontSize: "16px",
                        color: currentTheme.textSecondary,
                        transition: "color 0.3s ease",
                    }}>Please wait while we prepare your exam session</p>
                </div>
            </div>
        );
    }

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
        if (!examSettings.screen_sharing_enabled) {
            // If screen sharing is not required, allow navigation to ExamPage
            setFullscreenAllowed(true);
            return;
        }
        try {
            socket.emit("start-exam", {
                user_id: userId,
                exam_id: examId,
                category: "screen_recording",
                timestamp: new Date(),
            });

            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            const videoTrack = screenStream.getVideoTracks()[0];
            console.log(videoTrack.label.toLowerCase());
            if (!videoTrack.label.toLowerCase().includes("primary monitor")) {
                alert("You must share your entire screen to attend the exam.");
                screenStream.getTracks().forEach(track => track.stop());
                setScreenShareError(true);
                setFullscreenAllowed(false);
                return;
            }
            console.log("screenStream : ", screenStream);

            if (!screenStream) {
                throw new Error("No screen stream obtained");
            }

            screenStreamRef.current = screenStream;

            const mimeType = "video/webm; codecs=vp8";
            const options: any = { videoBitsPerSecond: 250000 };
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
                        const blob = e.data; // Store blob reference
                        
                        // ✅ Track this chunk as pending
                        pendingScreenChunksRef.current.add(chunkNum);
                        
                        blob.arrayBuffer().then((buffer: ArrayBuffer) => {
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
                            
                            // ✅ CRITICAL: Clear buffer reference to allow garbage collection
                            // @ts-ignore
                            chunkData.chunk = null;
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
                
                // ✅ Stop screen stream tracks NOW (after recorder stopped)
                if (screenStreamRef.current) {
                    try {
                        console.log("🖥️ Stopping screen stream tracks...");
                        screenStreamRef.current.getTracks().forEach((t) => {
                            console.log(`  Stopping screen track: ${t.kind}, state: ${t.readyState}`);
                            t.stop();
                        });
                        screenStreamRef.current = null;
                        console.log("✅ Screen stream tracks stopped");
                    } catch (e) {
                        console.warn("Error stopping screen stream tracks:", e);
                    }
                }
                
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
                console.log("Starting screen recorder with 2 second chunks");
                screenRecorderMediaRecorderRef.current.start(2000); // ✅ Changed from 1000ms to 2000ms to reduce memory overhead
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


    // ✅ Conditional return: Show guidelines if screen sharing not yet allowed
    if (!fullscreenAllowed) {
        const guidelinesSections = [
            {
                icon: Shield,
                title: "Important Requirements",
                items: [
                    "Ensure you have a stable internet connection",
                    "Use a desktop or laptop computer",
                    "Close all unnecessary applications and browser tabs",
                    "Charge your device or keep it plugged in",
                    "Have a backup internet connection ready if possible"
                ]
            },
            {
                icon: Camera,
                title: "Camera & Audio Setup",
                items: [
                    "Position your camera to show your face and shoulders clearly",
                    "Ensure good lighting - avoid backlighting",
                    "Test your microphone and camera before starting",
                    "Keep your camera on throughout the entire exam",
                    "Do not cover or disable your camera during the exam"
                ]
            },
            {
                icon: Eye,
                title: "Environment Guidelines",
                items: [
                    "Choose a quiet, well-lit room with minimal distractions",
                    "Sit at a clean desk with only permitted materials",
                    "Inform others not to disturb you during the exam",
                    "Remove or cover any notes, books, or electronic devices",
                    "Keep your workspace organized and clutter-free"
                ]
            },
            {
                icon: MousePointer,
                title: "During the Exam",
                items: [
                    "Do not switch tabs or minimize the exam window",
                    "Do not use external monitors or devices",
                    "Keep your eyes on the screen at all times",
                    "Answer all questions honestly and independently",
                    "Raise concerns through the proper channels if needed"
                ]
            }
        ];

        return (
            <div style={{
                minHeight: "100vh",
                background: currentTheme.background,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
                position: "relative",
                overflow: "hidden",
                transition: "background 0.3s ease",
            }}>
                {/* Animated Background Orbs */}
                <div style={{
                    position: "absolute",
                    top: "-10%",
                    right: "-5%",
                    width: "500px",
                    height: "500px",
                    background: "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(60px)",
                    animation: "float 8s ease-in-out infinite",
                    transition: "background 0.3s ease",
                }} />
                <div style={{
                    position: "absolute",
                    bottom: "-10%",
                    left: "-5%",
                    width: "400px",
                    height: "400px",
                    background: "radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(60px)",
                    animation: "float 10s ease-in-out infinite reverse",
                    transition: "background 0.3s ease",
                }} />

                <div style={{
                    width: "100%",
                    maxWidth: "900px",
                    background: currentTheme.cardBg,
                    backdropFilter: "blur(40px)",
                    borderRadius: "32px",
                    padding: "48px",
                    border: `1px solid ${currentTheme.cardBorder}`,
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                    position: "relative",
                    zIndex: 10,
                    maxHeight: "90vh",
                    overflowY: "auto",
                    transition: "all 0.3s ease",
                }}>
                    {/* Header */}
                    <div style={{ marginBottom: "40px", textAlign: "center" }}>
                        <div style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "20px",
                            background: "#3b82f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 24px",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        }}>
                            <Monitor size={32} color="white" strokeWidth={2} />
                        </div>
                        <h1 style={{
                            fontSize: "32px",
                            fontWeight: "800",
                            color: currentTheme.textPrimary,
                            marginBottom: "12px",
                            letterSpacing: "-0.02em",
                            transition: "color 0.3s ease",
                        }}>Online Exam Guidelines</h1>
                        <p style={{
                            fontSize: "16px",
                            color: currentTheme.textSecondary,
                            lineHeight: "1.6",
                            transition: "color 0.3s ease",
                        }}>Please read carefully and follow all instructions</p>
                    </div>

                    {/* Screen Share Error */}
                    {screenShareError && (
                        <div style={{
                            padding: "24px",
                            borderRadius: "20px",
                            background: currentTheme.errorBg,
                            border: `2px solid ${currentTheme.errorBorder}`,
                            marginBottom: "32px",
                            animation: "slideDown 0.4s ease",
                            transition: "all 0.3s ease",
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "start",
                                gap: "16px",
                                marginBottom: "16px",
                            }}>
                                <div style={{
                                    width: "48px",
                                    height: "48px",
                                    borderRadius: "50%",
                                    background: currentTheme.errorText,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}>
                                    <AlertTriangle size={24} color="white" strokeWidth={2} />
                                </div>
                                <div>
                                    <h3 style={{
                                        fontSize: "18px",
                                        fontWeight: "700",
                                        color: currentTheme.textPrimary,
                                        marginBottom: "8px",
                                        transition: "color 0.3s ease",
                                    }}>Screen Sharing Required</h3>
                                    <p style={{
                                        fontSize: "14px",
                                        color: currentTheme.textSecondary,
                                        lineHeight: "1.6",
                                        marginBottom: "12px",
                                        transition: "color 0.3s ease",
                                    }}>
                                        <strong>You cannot start the exam without enabling screen sharing.</strong>
                                        <br /><br />
                                        Screen sharing is mandatory for this exam to ensure academic integrity. 
                                        Please click "Try Again" and allow screen sharing permission when prompted.
                                    </p>
                                </div>
                            </div>
                            <ul style={{
                                listStyle: "none",
                                padding: 0,
                                margin: "16px 0 0 0",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                            }}>
                                {[
                                    "Click the \"Try Again\" button below",
                                    "Select the screen/window you want to share",
                                    "Click \"Share\" in the browser permission dialog",
                                    "Do not cancel or deny the screen sharing request"
                                ].map((item, index) => (
                                    <li key={index} style={{
                                        display: "flex",
                                        alignItems: "start",
                                        gap: "10px",
                                        fontSize: "13px",
                                        color: currentTheme.textSecondary,
                                        lineHeight: "1.5",
                                        transition: "color 0.3s ease",
                                    }}>
                                        <CheckCircle size={16} color={currentTheme.accentPrimary} style={{ flexShrink: 0, marginTop: "2px" }} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Guidelines Sections */}
                    {!screenShareError && (
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr",
                            gap: "20px",
                            marginBottom: "32px",
                        }}>
                            {guidelinesSections.map((section, index) => (
                                <div key={index} style={{
                                    background: currentTheme.ruleBg,
                                    backdropFilter: "blur(10px)",
                                    borderRadius: "20px",
                                    padding: "24px",
                                    border: `1px solid ${currentTheme.ruleBorder}`,
                                    transition: "all 0.3s ease",
                                }}>
                                    <div style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        marginBottom: "16px",
                                    }}>
                                        <div style={{
                                            width: "40px",
                                            height: "40px",
                                            borderRadius: "12px",
                                            background: currentTheme.iconBg,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}>
                                            <section.icon size={20} color={currentTheme.iconColor} strokeWidth={2} />
                                        </div>
                                        <h3 style={{
                                            fontSize: "18px",
                                            fontWeight: "700",
                                            color: currentTheme.textPrimary,
                                            transition: "color 0.3s ease",
                                        }}>{section.title}</h3>
                                    </div>
                                    <ul style={{
                                        listStyle: "none",
                                        padding: 0,
                                        margin: 0,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "10px",
                                    }}>
                                        {section.items.map((item, itemIndex) => (
                                            <li key={itemIndex} style={{
                                                display: "flex",
                                                alignItems: "start",
                                                gap: "10px",
                                                fontSize: "14px",
                                                color: currentTheme.textSecondary,
                                                lineHeight: "1.6",
                                                transition: "color 0.3s ease",
                                            }}>
                                                <div style={{
                                                    width: "6px",
                                                    height: "6px",
                                                    borderRadius: "50%",
                                                    background: currentTheme.accentPrimary,
                                                    marginTop: "8px",
                                                    flexShrink: 0,
                                                }} />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                        paddingTop: "24px",
                        borderTop: `1px solid ${currentTheme.cardBorder}`,
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "16px",
                            borderRadius: "16px",
                            background: "rgba(226, 232, 240, 0.5)",
                            border: `1px solid ${currentTheme.cardBorder}`,
                            transition: "all 0.3s ease",
                        }}>
                            <input
                                type="checkbox"
                                id="rulesAccept"
                                checked={rulesAccepted}
                                onChange={(e) => setRulesAccepted(e.target.checked)}
                                style={{
                                    width: "20px",
                                    height: "20px",
                                    cursor: "pointer",
                                    accentColor: currentTheme.accentPrimary,
                                }}
                            />
                            <label htmlFor="rulesAccept" style={{
                                fontSize: "14px",
                                color: currentTheme.textPrimary,
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "color 0.3s ease",
                            }}>
                                I have read and agree to follow all examination guidelines
                            </label>
                        </div>

                        <button
                            onClick={screenShareError ? startScreenRecording : startScreenRecording}
                            disabled={!rulesAccepted && !screenShareError}
                            style={{
                                width: "100%",
                                padding: "16px 32px",
                                borderRadius: "16px",
                                border: "none",
                                background: (!rulesAccepted && !screenShareError) ? currentTheme.ruleBg : currentTheme.buttonPrimaryBg,
                                color: "white",
                                fontSize: "16px",
                                fontWeight: "700",
                                cursor: (!rulesAccepted && !screenShareError) ? "not-allowed" : "pointer",
                                boxShadow: (!rulesAccepted && !screenShareError) ? "none" : currentTheme.buttonPrimaryShadow,
                                transition: "all 0.3s ease",
                                opacity: (!rulesAccepted && !screenShareError) ? 0.5 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (rulesAccepted || screenShareError) {
                                    e.currentTarget.style.transform = "translateY(-2px)";
                                    e.currentTarget.style.boxShadow = "0 15px 40px rgba(59, 130, 246, 0.5)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "translateY(0)";
                                e.currentTarget.style.boxShadow = currentTheme.buttonPrimaryShadow;
                            }}
                        >
                            {screenShareError ? "Try Again" : "Start Screen Sharing & Begin Exam"}
                        </button>
                    </div>
                </div>

                {/* Theme Toggle Switch */}
                <div style={{
                    position: "fixed",
                    bottom: "30px",
                    right: "30px",
                    zIndex: 1000,
                }}>
                    <button
                        
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 24px",
                            borderRadius: "100px",
                            background: currentTheme.cardBg,
                            backdropFilter: "blur(20px)",
                            border: `2px solid ${currentTheme.cardBorder}`,
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-3px)";
                            e.currentTarget.style.boxShadow = "0 15px 50px rgba(0, 0, 0, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 10px 40px rgba(0, 0, 0, 0.2)";
                        }}
                    >
                    </button>
                </div>

                {/* Animations */}
                <style jsx>{`
                    @keyframes float {
                        0%, 100% {
                            transform: translateY(0) rotate(0deg);
                        }
                        50% {
                            transform: translateY(-20px) rotate(5deg);
                        }
                    }

                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            transform: translateY(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                `}</style>
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