"use client";
import { useEffect, useState } from "react";
import styles from "../styles/PhotoDetect.module.css";
import { useRouter } from "next/router";
import axios from "axios";
import { getExamId, getUserId, hasValidExamId, hasValidUserId } from "@/constants/AuthStore";
import { setExamSettings } from "@/constants/examSettingsConsts";
import { useExamState } from "@/hooks/useExamState";
import ExamStateError from "./ExamStateError";

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
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h1 className={styles.title}>Initializing...</h1>
            <p className={styles.subtitle}>
              Please wait while we prepare your exam session.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.container}>
      <div className={`${styles.content} ${isRetrying ? styles.retrying : ''}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>Device Verification</h1>
          <p className={styles.subtitle}>
            We need to verify your camera and microphone access to ensure proper exam monitoring.
          </p>
        </div>

        <ProgressBar permissions={permissions} />

        <div className={styles.deviceGrid}>
          {permissions.map((permission, index) => (
            <DeviceCard key={index} permission={permission} />
          ))}
        </div>

        <ResultCard isVerified={isVerified} allDone={allDone} />

        {allDone && (
          <div className={styles.actionContainer}>
            <button
              className={`${styles.actionButton} ${isVerified ? styles.primaryButton : styles.secondaryButton}`}
              disabled={!isVerified || isRetrying}
              onClick={handleContinue}
              onKeyDown={(e) => handleKeyPress(e, handleContinue)}
              aria-label={isVerified ? "Continue to next step" : "Cannot continue until all permissions are granted"}
            >
              {isRetrying ? "Checking..." : isVerified ? "Continue to Scan Face" : "Permissions Required"}
            </button>
            
            {!isVerified && (
              <button
                className={styles.refreshButton}
                onClick={handleRetry}
                onKeyDown={(e) => handleKeyPress(e, handleRetry)}
                disabled={isRetrying}
                aria-label="Retry permission check"
              >
                {isRetrying ? "Retrying..." : "Try Again"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
