"use client";
import { useEffect, useState } from "react";
import styles from "../styles/PhotoDetect.module.css";
import { useRouter } from "next/router";
import axios from "axios";
import { getExamId, getUserId, hasValidExamId, hasValidUserId } from "@/constants/AuthStore";
import { setExamSettings } from "@/constants/examSettingsConsts";
import { useExamState } from "@/hooks/useExamState";
import ExamStateError from "./ExamStateError";
import { Moon, Sun } from "lucide-react";

type Status = "pending" | "checking" | "success" | "denied";

interface DevicePermission {
  type: "camera" | "microphone";
  label: string;
  status: Status;
  description: string;
}

const StatusIcon = ({ status }: { status: Status }) => {
  const iconMap = {
    pending: (
      <div className={styles.statusIcon}>
        <div className={styles.pendingDot}></div>
      </div>
    ),
    checking: (
      <div className={styles.statusIcon}>
        <div className={styles.spinner}></div>
      </div>
    ),
    success: (
      <div className={styles.statusIcon}>
        <svg className={styles.successIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="20,6 9,17 4,12"></polyline>
        </svg>
      </div>
    ),
    denied: (
      <div className={styles.statusIcon}>
        <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    ),
  };
  
  return iconMap[status];
};

const DeviceCard = ({ permission }: { permission: DevicePermission }) => {
  const getCardClass = () => {
    const baseClass = styles.deviceCard;
    switch (permission.status) {
      case "success": return `${baseClass} ${styles.success}`;
      case "denied": return `${baseClass} ${styles.denied}`;
      case "checking": return `${baseClass} ${styles.checking}`;
      default: return baseClass;
    }
  };

  const getStatusText = () => {
    switch (permission.status) {
      case "pending": return "Waiting";
      case "checking": return "Checking...";
      case "success": return "Granted";
      case "denied": return "Denied";
    }
  };

  return (
    <div className={getCardClass()}>
      <div className={styles.cardHeader}>
        <div className={styles.deviceInfo}>
          <div className={styles.deviceIcon}>
            {permission.type === "camera" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            )}
          </div>
          <div className={styles.deviceDetails}>
            <h3 className={styles.deviceTitle}>{permission.label}</h3>
            <p className={styles.deviceDescription}>{permission.description}</p>
          </div>
        </div>
        <div className={styles.statusContainer}>
          <StatusIcon status={permission.status} />
          <span className={styles.statusText}>{getStatusText()}</span>
        </div>
      </div>
    </div>
  );
};

const ProgressBar = ({ permissions }: { permissions: DevicePermission[] }) => {
  const totalSteps = permissions.length;
  const completedSteps = permissions.filter(p => p.status === "success").length;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressHeader}>
        <span className={styles.progressText}>Verification Progress</span>
        <span className={styles.progressCount}>{completedSteps}/{totalSteps}</span>
      </div>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

const ResultCard = ({ isVerified, allDone }: { isVerified: boolean; allDone: boolean }) => {
  if (!allDone) return null;

  return (
    <div className={`${styles.resultCard} ${isVerified ? styles.resultSuccess : styles.resultError}`}>
      <div className={styles.resultIcon}>
        {isVerified ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22,4 12,14.01 9,11.01"></polyline>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        )}
      </div>
      <div className={styles.resultContent}>
        <h3 className={styles.resultTitle}>
          {isVerified ? "Verification Successful" : "Verification Failed"}
        </h3>
        <p className={styles.resultMessage}>
          {isVerified 
            ? "All device permissions have been granted. You can proceed to the next step."
            : "Some permissions were denied. Please refresh the page and allow all permissions to continue."
          }
        </p>
      </div>
    </div>
  );
};

export default function PhotoDetect() {
  // ✅ Use exam state hook for validation and error handling
  const examState = useExamState();
  const router = useRouter();
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // ✅ Load theme preference from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark');
    }
  }, []);

  // ✅ Save theme preference to localStorage when changed
  const handleThemeToggle = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };
  
  const [permissions, setPermissions] = useState<DevicePermission[]>([
    {
      type: "camera",
      label: "Camera Access",
      status: "pending",
      description: "Required for video monitoring during the exam"
    },
    {
      type: "microphone",
      label: "Microphone Access", 
      status: "pending",
      description: "Required for audio monitoring during the exam"
    }
  ]);
  const [allDone, setAllDone] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const checkPermissions = async (retryAttempt = false) => {
    if (retryAttempt) {
      setIsRetrying(true);
      setAllDone(false);
      setPermissions(prev => prev.map(p => ({ ...p, status: "pending" as Status })));
      await new Promise(r => setTimeout(r, 1500));
    }

    setPermissions(prev => prev.map(p => 
      p.type === "camera" ? { ...p, status: "checking" } : p
    ));

    await new Promise(r => setTimeout(r, 500));

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: "user"
        } ,
        audio:false
      });
      videoStream.getTracks().forEach(track => track.stop());
      setPermissions(prev => prev.map(p => 
        p.type === "camera" ? { ...p, status: "success" } : p
      ));
    } catch (error) {
      console.warn("Camera access denied:", error);
      setPermissions(prev => prev.map(p => 
        p.type === "camera" ? { ...p, status: "denied" } : p
      ));
    }

    setPermissions(prev => prev.map(p => 
      p.type === "microphone" ? { ...p, status: "checking" } : p
    ));
    
    await new Promise(r => setTimeout(r, 500));
    
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video:false
      });
      audioStream.getTracks().forEach(track => track.stop());
      setPermissions(prev => prev.map(p => 
        p.type === "microphone" ? { ...p, status: "success" } : p
      ));
    } catch (error) {
      console.warn("Microphone access denied:", error);
      setPermissions(prev => prev.map(p => 
        p.type === "microphone" ? { ...p, status: "denied" } : p
      ));
    }

    setAllDone(true);
    setIsRetrying(false);
  };

  useEffect(() => {
    // Only check permissions if exam state is valid
    if (examState.isValid && !examState.isLoading) {
      checkPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examState.isValid, examState.isLoading]);

  const isVerified = permissions.every(p => p.status === "success");

  const handleRetry = () => {
    checkPermissions(true);
  };

  const handleContinue = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const userId = examState.userId; // ✅ Use from exam state
      const examId = examState.examId; // ✅ Use from exam state

      // ✅ Validate before proceeding
      if (!userId || !examId) {
        console.error('Missing userId or examId');
        examState.validateExamState();
        return;
      }

      const response = await axios.get(`${baseUrl}/getExamSettings`, {
        params: {
          userId: Number(userId),
          examId: Number(examId),
        },
      });

      if (response.data) {
        setExamSettings(response.data);
        
        if (!response.data.face_authentication_enabled) {
          console.log("Face authentication is disabled, skipping to exam setup");
          if (!response.data.third_eye_enabled) {
            router.push("/fullscreen");
          } else {
            router.push("/SetupThirdEye");
          }
        } else {
          console.log("Face authentication is enabled, proceeding to face scanning");
          router.push('/video');
        }
      }
    } catch (error) {
      console.error("Error fetching exam settings:", error);
      // ✅ Fallback to video page if settings fetch fails
      router.push('/video');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  // Theme configurations - Professional High-Tech Black Theme
  const themes = {
    dark: {
      background: "linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #111111 100%)",
      containerBg: "rgba(10, 10, 10, 0.95)",
      containerBorder: "rgba(0, 255, 255, 0.15)",
      cardBg: "rgba(15, 15, 15, 0.98)",
      cardBorder: "rgba(0, 255, 255, 0.2)",
      textPrimary: "#ffffff",
      textSecondary: "#a0aec0",
      textMuted: "#718096",
      accentPrimary: "#00ffff",
      accentSecondary: "#00d9ff",
      successBg: "rgba(0, 255, 157, 0.08)",
      successBorder: "rgba(0, 255, 157, 0.4)",
      successText: "#00ff9d",
      errorBg: "rgba(255, 51, 102, 0.08)",
      errorBorder: "rgba(255, 51, 102, 0.4)",
      errorText: "#ff3366",
      progressBg: "rgba(20, 20, 20, 0.8)",
      progressFill: "linear-gradient(90deg, #00ffff 0%, #0099ff 100%)",
      buttonPrimaryBg: "linear-gradient(135deg, #00ffff 0%, #0099ff 100%)",
      buttonPrimaryShadow: "0 0 30px rgba(0, 255, 255, 0.5), 0 10px 40px rgba(0, 153, 255, 0.3)",
      buttonSecondaryBg: "rgba(20, 20, 20, 0.9)",
      iconSuccess: "#00ff9d",
      iconError: "#ff3366",
      iconPending: "#718096",
      iconChecking: "#00ffff",
    },
    light: {
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
      containerBg: "rgba(255, 255, 255, 0.9)",
      containerBorder: "rgba(226, 232, 240, 0.8)",
      cardBg: "rgba(255, 255, 255, 0.95)",
      cardBorder: "rgba(226, 232, 240, 0.9)",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#64748b",
      accentPrimary: "#3b82f6",
      accentSecondary: "#2563eb",
      successBg: "rgba(34, 197, 94, 0.1)",
      successBorder: "rgba(34, 197, 94, 0.3)",
      successText: "#16a34a",
      errorBg: "rgba(239, 68, 68, 0.1)",
      errorBorder: "rgba(239, 68, 68, 0.3)",
      errorText: "#dc2626",
      progressBg: "rgba(226, 232, 240, 0.6)",
      progressFill: "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)",
      buttonPrimaryBg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      buttonPrimaryShadow: "0 10px 30px rgba(59, 130, 246, 0.4)",
      buttonSecondaryBg: "rgba(226, 232, 240, 0.8)",
      iconSuccess: "#16a34a",
      iconError: "#dc2626",
      iconPending: "#64748b",
      iconChecking: "#3b82f6",
    }
  };

  const theme = isDarkTheme ? themes.dark : themes.light;

  // ✅ Show error screen if exam state is invalid (AFTER all hooks)
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

  // ✅ Show loading while validating (AFTER all hooks)
  if (examState.isLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: theme.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.3s ease",
      }}>
        <div style={{
          background: theme.containerBg,
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          padding: "48px",
          border: `1px solid ${theme.containerBorder}`,
          maxWidth: "500px",
          textAlign: "center",
          transition: "all 0.3s ease",
        }}>
          <h1 style={{
            fontSize: "28px",
            fontWeight: "700",
            color: theme.textPrimary,
            marginBottom: "12px",
            transition: "color 0.3s ease",
          }}>Initializing...</h1>
          <p style={{
            fontSize: "16px",
            color: theme.textSecondary,
            transition: "color 0.3s ease",
          }}>
            Please wait while we prepare your exam session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden",
      transition: "background 0.3s ease",
    }}>
      {/* Animated Background Orbs - Cyan Glow */}
      <div style={{
        position: "absolute",
        top: "-10%",
        right: "-5%",
        width: "600px",
        height: "600px",
        background: isDarkTheme 
          ? "radial-gradient(circle, rgba(0, 255, 255, 0.12) 0%, rgba(0, 153, 255, 0.06) 40%, transparent 70%)"
          : "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "float 8s ease-in-out infinite, pulse 4s ease-in-out infinite",
        transition: "background 0.3s ease",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        left: "-5%",
        width: "500px",
        height: "500px",
        background: isDarkTheme
          ? "radial-gradient(circle, rgba(0, 153, 255, 0.15) 0%, rgba(0, 255, 255, 0.08) 40%, transparent 70%)"
          : "radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "float 10s ease-in-out infinite reverse, pulse 6s ease-in-out infinite",
        transition: "background 0.3s ease",
      }} />

      <div style={{
        width: "100%",
        maxWidth: "900px",
        background: theme.containerBg,
        backdropFilter: "blur(40px)",
        borderRadius: "32px",
        padding: "48px",
        border: `1px solid ${theme.containerBorder}`,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
        position: "relative",
        zIndex: 10,
        transition: "all 0.3s ease",
      }}>
        {/* Header */}
        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "24px",
            background: isDarkTheme 
              ? "linear-gradient(135deg, #00ffff 0%, #0099ff 100%)"
              : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: isDarkTheme
              ? "0 0 40px rgba(0, 255, 255, 0.5), 0 15px 50px rgba(0, 153, 255, 0.4)"
              : "0 12px 40px rgba(59, 130, 246, 0.4)",
            animation: "iconFloat 3s ease-in-out infinite",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <h1 style={{
            fontSize: "32px",
            fontWeight: "800",
            color: theme.textPrimary,
            marginBottom: "12px",
            letterSpacing: "-0.02em",
            transition: "color 0.3s ease",
          }}>Device Verification</h1>
          <p style={{
            fontSize: "16px",
            color: theme.textSecondary,
            lineHeight: "1.6",
            maxWidth: "600px",
            margin: "0 auto",
            transition: "color 0.3s ease",
          }}>
            We need to verify your camera and microphone access to ensure proper exam monitoring.
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}>
            <span style={{
              fontSize: "14px",
              fontWeight: "600",
              color: theme.textSecondary,
              transition: "color 0.3s ease",
            }}>Verification Progress</span>
            <span style={{
              fontSize: "14px",
              fontWeight: "700",
              color: theme.accentPrimary,
            }}>
              {permissions.filter(p => p.status === "success").length}/{permissions.length}
            </span>
          </div>
          <div style={{
            width: "100%",
            height: "8px",
            background: theme.progressBg,
            borderRadius: "100px",
            overflow: "hidden",
            transition: "background 0.3s ease",
          }}>
            <div style={{
              width: `${(permissions.filter(p => p.status === "success").length / permissions.length) * 100}%`,
              height: "100%",
              background: theme.progressFill,
              borderRadius: "100px",
              transition: "width 0.5s ease, background 0.3s ease",
            }} />
          </div>
        </div>

        {/* Device Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "32px",
        }}>
          {permissions.map((permission, index) => {
            const getStatusColor = () => {
              switch (permission.status) {
                case "success": return theme.successText;
                case "denied": return theme.errorText;
                case "checking": return theme.iconChecking;
                default: return theme.iconPending;
              }
            };

            const getCardBorder = () => {
              switch (permission.status) {
                case "success": return theme.successBorder;
                case "denied": return theme.errorBorder;
                default: return theme.cardBorder;
              }
            };

            return (
              <div key={index} style={{
                background: theme.cardBg,
                backdropFilter: "blur(20px)",
                borderRadius: "20px",
                padding: "24px",
                border: `2px solid ${getCardBorder()}`,
                transition: "all 0.3s ease",
              }}>
                <div style={{ display: "flex", alignItems: "start", gap: "16px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: `${getStatusColor()}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {permission.type === "camera" ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={getStatusColor()} strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={getStatusColor()} strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: "16px",
                      fontWeight: "700",
                      color: theme.textPrimary,
                      marginBottom: "4px",
                      transition: "color 0.3s ease",
                    }}>{permission.label}</h3>
                    <p style={{
                      fontSize: "13px",
                      color: theme.textMuted,
                      marginBottom: "12px",
                      lineHeight: "1.5",
                      transition: "color 0.3s ease",
                    }}>{permission.description}</p>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}>
                      {permission.status === "checking" && (
                        <div style={{
                          width: "16px",
                          height: "16px",
                          border: `2px solid ${theme.iconChecking}40`,
                          borderTopColor: theme.iconChecking,
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }} />
                      )}
                      {permission.status === "success" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.successText} strokeWidth="3">
                          <polyline points="20,6 9,17 4,12" />
                        </svg>
                      )}
                      {permission.status === "denied" && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.errorText} strokeWidth="3">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                      <span style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: getStatusColor(),
                      }}>
                        {permission.status === "pending" && "Waiting"}
                        {permission.status === "checking" && "Checking..."}
                        {permission.status === "success" && "Granted"}
                        {permission.status === "denied" && "Denied"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Result Card */}
        {allDone && (
          <div style={{
            padding: "24px",
            borderRadius: "20px",
            background: isVerified ? theme.successBg : theme.errorBg,
            border: `2px solid ${isVerified ? theme.successBorder : theme.errorBorder}`,
            marginBottom: "32px",
            display: "flex",
            alignItems: "start",
            gap: "16px",
            animation: "slideDown 0.4s ease",
            transition: "all 0.3s ease",
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: isVerified ? theme.successText : theme.errorText,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              {isVerified ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
            </div>
            <div>
              <h3 style={{
                fontSize: "18px",
                fontWeight: "700",
                color: theme.textPrimary,
                marginBottom: "8px",
                transition: "color 0.3s ease",
              }}>
                {isVerified ? "Verification Successful" : "Verification Failed"}
              </h3>
              <p style={{
                fontSize: "14px",
                color: theme.textSecondary,
                lineHeight: "1.6",
                transition: "color 0.3s ease",
              }}>
                {isVerified 
                  ? "All device permissions have been granted. You can proceed to the next step."
                  : "Some permissions were denied. Please refresh the page and allow all permissions to continue."
                }
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {allDone && (
          <div style={{
            display: "flex",
            gap: "16px",
            flexDirection: "column",
          }}>
            <button
              disabled={!isVerified || isRetrying}
              onClick={handleContinue}
              style={{
                width: "100%",
                padding: "16px 32px",
                borderRadius: "16px",
                border: "none",
                background: !isVerified || isRetrying ? theme.buttonSecondaryBg : theme.buttonPrimaryBg,
                color: "white",
                fontSize: "16px",
                fontWeight: "700",
                cursor: !isVerified || isRetrying ? "not-allowed" : "pointer",
                boxShadow: !isVerified || isRetrying ? "none" : theme.buttonPrimaryShadow,
                transition: "all 0.3s ease",
                opacity: !isVerified || isRetrying ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (isVerified && !isRetrying) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 15px 40px rgba(59, 130, 246, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = theme.buttonPrimaryShadow;
              }}
            >
              {isRetrying ? "Checking..." : isVerified ? "Continue to Scan Face" : "Permissions Required"}
            </button>
            
            {!isVerified && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                style={{
                  width: "100%",
                  padding: "16px 32px",
                  borderRadius: "16px",
                  border: `2px solid ${theme.cardBorder}`,
                  background: "transparent",
                  color: theme.textPrimary,
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: isRetrying ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  opacity: isRetrying ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isRetrying) {
                    e.currentTarget.style.background = theme.cardBg;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {isRetrying ? "Retrying..." : "Try Again"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Theme Toggle Switch */}
      <div style={{
        position: "fixed",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
      }}>
        <button
          onClick={() => setIsDarkTheme(!isDarkTheme)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 24px",
            borderRadius: "100px",
            background: theme.containerBg,
            backdropFilter: "blur(20px)",
            border: `2px solid ${theme.containerBorder}`,
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
          <div style={{
            width: "50px",
            height: "26px",
            borderRadius: "100px",
            background: isDarkTheme 
              ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
              : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            position: "relative",
            transition: "all 0.3s ease",
            boxShadow: isDarkTheme
              ? "0 4px 12px rgba(59, 130, 246, 0.4) inset"
              : "0 4px 12px rgba(251, 191, 36, 0.4) inset",
          }}>
            <div style={{
              position: "absolute",
              top: "3px",
              left: isDarkTheme ? "3px" : "27px",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "white",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {isDarkTheme ? (
                <Moon size={12} color="#3b82f6" strokeWidth={2.5} />
              ) : (
                <Sun size={12} color="#f59e0b" strokeWidth={2.5} />
              )}
            </div>
          </div>
          <span style={{
            fontSize: "14px",
            fontWeight: "600",
            color: theme.textPrimary,
            transition: "color 0.3s ease",
          }}>
            {isDarkTheme ? "Dark" : "Light"} Theme
          </span>
        </button>
      </div>

      {/* Advanced Professional Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(5deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes iconFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
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

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 153, 255, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 153, 255, 0.3);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
      `}</style>
    </div>
  );
}
