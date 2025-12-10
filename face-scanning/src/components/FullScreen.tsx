import React, { useEffect, useState, useRef, useCallback } from "react";
import styles from "../styles/ExamPage.module.css";
import FloatingCamera from "./FloatingCamera";
import socket from "./socket";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { getExamId, getUserId, hasValidExamId, hasValidUserId } from "@/constants/AuthStore";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { Brain, FileText, Loader, Upload, CheckCircle, Clock, AlertTriangle, Moon, Sun } from "lucide-react";
import { useExamState } from "@/hooks/useExamState";
import ExamStateError from "./ExamStateError";
import { getNumberOfMicrophones, getTabSwitchViolations } from "@/constants/violationConsts";

// const questions = Array.from({ length: 10 }, (_, i) => ({
//   id: i + 1,
//   question: `Sample Question ${i + 1}?`,
//   options: ["Option A", "Option B", "Option C", "Option D"],
// }));f

type ExamSettings = {
  face_authentication_enabled?: boolean;
  third_eye_enabled?: boolean;
  multiple_person_detection_enabled?: boolean;
  eyeball_detection_enabled?: boolean;
  object_detection_enabled?: boolean;
  head_direction_enabled?: boolean;
  flag_notifications_enabled?: boolean;
};

type Question = {
  id: number;
  question_text: string;
  options?: Array<{ id: number; question_id: number; option_text: string }>;
};

type Answer = {
  question_id: number;
  option_id: number;
  option_text: string;
};

const ExamPage = ({
  screenRecorderMediaRecorderRef,
  onBeforeSubmit,
  screenStreamRef,
  pendingScreenChunksRef,
  pendingFaceChunksRef,
}: any) => {
  // ✅ Use exam state hook for validation and error handling
  const examState = useExamState();
  
  // ✅ Fixed to light theme only
  const isDarkTheme = false;
  
  const [answers, setAnswers] = useState<{ [key: number]: Answer }>({});
  const [blocked, setBlocked] = useState(false);
  const [lookAlert, setlookAlert] = useState(false);
  const [lookDirection, setLookDirection] = useState<any>(null);
  const [object, setObject] = useState(false);
  const [num, setNum] = useState(false);
  const [authFaceMissing, setAuthFaceMissing] = useState(false);
  const [paused, setPaused] = useState(false);
  const { toast } = useToast();
  const [face, setFace] = useState(0);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [headDirection, setHeadDirection] = useState(false);
  const [examSettings, setExamSettings] = useState<ExamSettings>({});
  const [faceAuthenticationComplete, setFaceAuthenticationComplete] =
    useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoadingError, setModelsLoadingError] = useState(false);
  const [isUploadingChunks, setIsUploadingChunks] = useState(false);

  // ✅ Professional High-Tech Black Theme Configuration
  const themes = {
    dark: {
      background: "linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #0f0f0f 100%)",
      cardBg: "rgba(12, 12, 12, 0.95)",
      cardBorder: "rgba(0, 255, 255, 0.15)",
      textPrimary: "#ffffff",
      textSecondary: "#a0aec0",
      textMuted: "#718096",
      accentPrimary: "#00ffff",
      accentSecondary: "#00d9ff",
      sidebarBg: "rgba(8, 8, 8, 0.98)",
      questionNavBg: "rgba(15, 15, 15, 0.8)",
      questionAnsweredBg: "rgba(0, 255, 157, 0.12)",
      questionNavBorder: "rgba(0, 255, 255, 0.2)",
      questionNumberBg: "rgba(18, 18, 18, 0.9)",
      optionBg: "rgba(15, 15, 15, 0.8)",
      optionHoverBg: "rgba(20, 20, 20, 0.9)",
      buttonPrimaryBg: "linear-gradient(135deg, #00ffff 0%, #0099ff 100%)",
      buttonPrimaryShadow: "0 0 30px rgba(0, 255, 255, 0.5), 0 10px 40px rgba(0, 153, 255, 0.3)",
      timerBg: "rgba(15, 15, 15, 0.95)",
      alertBg: "rgba(255, 51, 102, 0.08)",
      alertBorder: "rgba(255, 51, 102, 0.5)",
      warningColor: "#ffaa00",
      successBg: "rgba(0, 255, 157, 0.12)",
    },
    light: {
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
      cardBg: "rgba(255, 255, 255, 0.9)",
      cardBorder: "rgba(203, 213, 225, 0.6)",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#64748b",
      accentPrimary: "#3b82f6",
      accentSecondary: "#60a5fa",
      sidebarBg: "rgba(248, 250, 252, 0.95)",
      questionNavBg: "rgba(241, 245, 249, 0.8)",
      questionAnsweredBg: "rgba(34, 197, 94, 0.1)",
      questionNavBorder: "rgba(203, 213, 225, 0.7)",
      questionNumberBg: "rgba(226, 232, 240, 0.8)",
      optionBg: "rgba(248, 250, 252, 0.9)",
      optionHoverBg: "rgba(226, 232, 240, 0.9)",
      buttonPrimaryBg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
      buttonPrimaryShadow: "0 10px 30px rgba(59, 130, 246, 0.3)",
      timerBg: "rgba(255, 255, 255, 0.95)",
      alertBg: "rgba(239, 68, 68, 0.1)",
      alertBorder: "rgba(239, 68, 68, 0.3)",
      warningColor: "#ea580c",
      successBg: "rgba(34, 197, 94, 0.1)",
    }
  };

  const currentTheme = themes.light; // Always use light theme

  useEffect(() => {
    console.log("📊 Exam State Debug:", {
      isValid: examState.isValid,
      isLoading: examState.isLoading,
      error: examState.error,
      questionsCount: questions.length,
      isLoadingQuestions,
      examSettings: Object.keys(examSettings).length
    });
  }, [examState.isValid, examState.isLoading, questions.length, isLoadingQuestions, examSettings]);

  // ✅ REMOVED: lastAlertRef - No longer needed (throttling handled in FloatingCamera)
  // ✅ REMOVED: ALERT_THROTTLE_MS - No longer needed (throttling handled in FloatingCamera)

  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const frontCameraMediaRecorderRef = useRef<MediaRecorder>(null);

  const router = useRouter();

  // ✅ Get validated exam data
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const userId = examState.userId || "unknown";
  const examId = examState.examId;

  // 🔥 CRITICAL: Move all hooks BEFORE conditional returns to comply with Rules of Hooks
  // Handle models loaded callback from FloatingCamera
  const handleModelsLoaded = useCallback((success: boolean) => {
    console.log("🤖 AI Models loading result:", success ? "Success" : "Failed");
    setModelsLoaded(true);
    if (!success) {
      setModelsLoadingError(true);
      toast({
        title: "Warning",
        description: "AI proctoring models failed to load. Exam will proceed with basic monitoring.",
        variant: "default",
      });
    }
  }, [toast]);

  // Fetch exam questions - runs once exam state is valid
  useEffect(() => {
    // Wait for exam state to be valid before fetching
    if (!examState.isValid || examState.isLoading) {
      console.log("⏳ Waiting for exam state validation...", { isValid: examState.isValid, isLoading: examState.isLoading });
      return;
    }
    
    const fetchExamQuestions = async () => {
      try {
        setIsLoadingQuestions(true);
        const examId = getExamId();

        if (!examId) {
          console.error("No exam ID found");
          setIsLoadingQuestions(false);
          return;
        }

        console.log("📚 Fetching questions for exam:", examId);

        // ✅ FIX: Use path parameter instead of query parameter
        const response = await axios.get(
          `${baseUrl}/getExamQuestions/${examId}`,
          {
            headers: {
              Authorization: `Bearer ${getTokenFromCookie()}`,
            },
          }
        );

        console.log("✅ Questions fetched:", response.data);

        if (response.data.success && response.data.questions) {
          console.log("✅ Setting questions:", response.data.questions.length, "questions");
          setQuestions(response.data.questions);

          if (response.data.exam && response.data.exam.duration) {
            // Set timer based on duration (in minutes)
            console.log("⏰ Setting timer:", response.data.exam.duration, "minutes");
            setTimeLeft(response.data.exam.duration * 60);
          }
        } else {
          console.warn("⚠️ No questions in response or success=false:", response.data);
        }
      } catch (error) {
        console.error("❌ Failed to fetch exam questions:", error);
        toast({
          title: "Error",
          description: "Failed to load exam questions",
          variant: "destructive",
        });
      } finally {
        console.log("✅ Setting isLoadingQuestions to FALSE");
        setIsLoadingQuestions(false);
      }
    };

    fetchExamQuestions();
  }, [examState.isValid, examState.isLoading]); // ✅ Run when exam state becomes valid

  // ✅ REMOVE: Axios interceptor moved out of component to prevent repeated requests

  // Cleanup all timeouts when component unmounts
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Fetch exam settings - runs once exam state is valid
  useEffect(() => {
    // Wait for exam state to be valid before fetching
    if (!examState.isValid || examState.isLoading) {
      console.log("⏳ Waiting for exam state validation before fetching settings...");
      return;
    }
    
    const fetchExamSettings = async () => {
      try {
        const examId = getExamId();

        if (!examId) {
          console.error("No exam ID found");
          return;
        }

        console.log("⚙️ Fetching exam settings for exam:", examId);

        const response = await axios.get(`${baseUrl}/getExamSettings`, {
          params: { userId: Number(userId), examId: Number(examId) },
          headers: {
            Authorization: `Bearer ${getTokenFromCookie()}`,
          },
        });

        console.log("✅ Exam settings fetched:", response.data);
        setExamSettings(response.data);
      } catch (error) {
        console.error("❌ Failed to fetch exam settings:", error);
      }
    };

    fetchExamSettings();
  }, [examState.isValid, examState.isLoading]); // ✅ Run when exam state becomes valid

  // Start exam automatically if face authentication is disabled
  useEffect(() => {
    if (!examSettings || Object.keys(examSettings).length === 0) return;

    if (!examSettings.face_authentication_enabled && !examStarted) {
      console.log(
        "✅ Face authentication disabled - Starting exam immediately"
      );

      socket.emit("start-exam", {
        user_id: userId,
        exam_id: examId,
        timestamp: new Date(),
        status: "success",
        message: "Exam Started successfully (no face auth required)",
      });

      socket.emit("stream-listener-on", {
        user_id: userId,
        exam_id: examId,
        category: "face_camera",
        timestamp: new Date(),
      });

      socket.emit("stream-listener-on", {
        user_id: userId,
        exam_id: examId,
        category: "screen_recording",
        timestamp: new Date(),
      });

      setExamStarted(true);
      setFaceAuthenticationComplete(true);
    }
  }, [examSettings, examStarted]);

  // Cleanup all timeouts when component unmounts
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const detectObject = () => {
    console.log("Object detected - showing notification");
    setObject(true);

    // ✅ REMOVED: Duplicate API logging (already handled in FloatingCamera.tsx)
    // ✅ REMOVED: Time throttling check (already handled in FloatingCamera.tsx)
    // Violation is logged in FloatingCamera after 4 seconds of continuous detection

    // Clear existing timeout before setting new one
    if (timeoutRefs.current.object) {
      clearTimeout(timeoutRefs.current.object);
    }
    timeoutRefs.current.object = setTimeout(() => setObject(false), 3000);
  };

  const number = (a: number) => {
    console.log("Multiple persons detected - showing notification");
    setFace(a);
    setNum(true);

    // ✅ REMOVED: Duplicate API logging (already handled in FloatingCamera.tsx)
    // ✅ REMOVED: Time throttling check (already handled in FloatingCamera.tsx)
    // Violation is logged in FloatingCamera after 4 seconds of continuous detection

    // Clear existing timeout before setting new one
    if (timeoutRefs.current.num) {
      clearTimeout(timeoutRefs.current.num);
    }
    timeoutRefs.current.num = setTimeout(() => {
      setNum(false);
    }, 2000);
  };

  // Handle face authentication success - start exam on first successful auth
  const handleAuthResume = () => {
    console.log("✅ Face authenticated - User detected");

    if (examSettings.face_authentication_enabled) {
      if (!faceAuthenticationComplete && !examStarted && modelsLoaded) { // ✅ Check modelsLoaded
        console.log(
          "✅ First face authentication detected - Starting exam now"
        );
        const userId = getUserId() || "unknown";

        // ✅ ONLY EMIT ONCE
        socket.emit("start-exam", {
          user_id: userId,
          exam_id: examId,
          timestamp: new Date(),
          status: "success",
          message: "Exam Started successfully",
        });

        socket.emit("stream-listener-on", {
          user_id: userId,
          exam_id: examId,
          category: "face_camera",
          timestamp: new Date(),
        });

        socket.emit("stream-listener-on", {
          user_id: userId,
          exam_id: examId,
          category: "screen_recording",
          timestamp: new Date(),
        });

        setFaceAuthenticationComplete(true);
        setExamStarted(true);
      }

      setPaused(false);
    }
  };

  const handleAuthPause = () => {
    console.log("⚠️ Face lost - User not detected");

    if (examSettings.face_authentication_enabled && examStarted) {
      setPaused(true);
    }
  };

  useEffect(() => {
    try {
      const preventActions: any = (e: any) => {
        if (
          e instanceof KeyboardEvent &&
          ["F12", "Control", "Meta", "Alt", "Tab"].includes(e.key)
        ) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (e instanceof MouseEvent && e.button === 2) {
          e.preventDefault();
        }
      };

      const blurHandler = () => {
        setBlocked(true);
      };

      const focusHandler = () => {
        setBlocked(true);
      };

      const userId = getUserId() || "unknown";

      if (!examSettings || Object.keys(examSettings).length === 0) {
        console.log("⏳ Waiting for exam settings to load...");
        return;
      }

      const fullscreenChangeHandler = () => {
        if (!document.fullscreenElement) {
          setBlocked(true);
        }
      };

      const sizeHandler = () => {
        const widthDiff = Math.abs(window.innerWidth - window.screen.width);
        const heightDiff = Math.abs(window.innerHeight - window.screen.height);
        if (widthDiff > 10 || heightDiff > 10) {
          setBlocked(true);
        }
      };

      return () => {
        window.removeEventListener("blur", blurHandler);
        window.removeEventListener("focus", focusHandler);
        document.removeEventListener(
          "fullscreenchange",
          fullscreenChangeHandler
        );
        window.removeEventListener("keydown", preventActions);
        window.removeEventListener("contextmenu", preventActions);
        window.removeEventListener("copy", preventActions);
        window.removeEventListener("cut", preventActions);
        window.removeEventListener("paste", preventActions);
        window.removeEventListener("resize", sizeHandler);
      };
    } catch (e) {
      console.log("Error in useEffect");
    }
  }, [examSettings.face_authentication_enabled, examStarted]);
  let s: any;
  const lookingAlert = (side: any) => {
    console.log("Looking away detected - showing notification");
    setLookDirection(side);
    setlookAlert(true);

    // ✅ REMOVED: Duplicate API logging (already handled in FloatingCamera.tsx)
    // ✅ REMOVED: Time throttling check (already handled in FloatingCamera.tsx)
    // Violation is logged in FloatingCamera after 4 seconds of continuous detection

    // Clear existing timeout before setting new one
    if (timeoutRefs.current.lookAlert) {
      clearTimeout(timeoutRefs.current.lookAlert);
    }
    timeoutRefs.current.lookAlert = setTimeout(() => setlookAlert(false), 3000);
  };

  const handleAuthFaceMissing = () => {
    console.log("Auth face missing - showing notification");
    setAuthFaceMissing(true);

    // ✅ REMOVED: Duplicate API logging (already handled in FloatingCamera.tsx)
    // ✅ REMOVED: Time throttling check (already handled in FloatingCamera.tsx)
    // Violation is logged in FloatingCamera after 4 seconds of continuous detection

    // Clear existing timeout before setting new one
    if (timeoutRefs.current.authFaceMissing) {
      clearTimeout(timeoutRefs.current.authFaceMissing);
    }
    timeoutRefs.current.authFaceMissing = setTimeout(
      () => setAuthFaceMissing(false),
      3000
    );
  };

  const handleHeadDirection = (direction: string) => {
    console.log("Head direction changed - showing notification:", direction);
    setHeadDirection(true);

    // ✅ REMOVED: Duplicate API logging (already handled in FloatingCamera.tsx)
    // ✅ REMOVED: Time throttling check (already handled in FloatingCamera.tsx)
    // Violation is logged in FloatingCamera after 4 seconds of continuous detection

    // Clear existing timeout before setting new one
    if (timeoutRefs.current.headDirection) {
      clearTimeout(timeoutRefs.current.headDirection);
    }
    timeoutRefs.current.headDirection = setTimeout(
      () => setHeadDirection(false),
      3000
    );
  };

  const handleChange = (qId: number, optionId: number, optionText: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        question_id: qId,
        option_id: optionId,
        option_text: optionText,
      },
    }));
  };

  const getAnswersForSubmission = () => {
    return Object.values(answers);
  };

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || examSubmitted) return;

    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, examSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSubmit = async () => {
    console.log("🚀 Submit button clicked - initiating exam submission");
    console.log(`📊 Current examSubmitted state: ${examSubmitted}`);

    // Prevent double submission
    if (isSubmitting) {
      console.log("⏳ Submission already in progress - ignoring duplicate click");
      return;
    }

    setIsSubmitting(true);
    setIsUploadingChunks(true); // ✅ Show upload loading screen

    // ✅ STOP ALL MEDIA STREAMS AND RECORDINGS IMMEDIATELY
    console.log("🛑 Stopping all media streams and recordings...");

    // 1. Stop screen stream tracks
    if (screenStreamRef && screenStreamRef.current) {
      try {
        console.log("🖥️ Stopping screen stream tracks...");
        screenStreamRef.current
          .getTracks()
          .forEach((track: MediaStreamTrack) => {
            console.log(
              `  Stopping screen track: ${track.kind}, state: ${track.readyState}`
            );
            track.stop();
          });
        screenStreamRef.current = null;
        console.log("✅ Screen sharing stopped");
      } catch (err) {
        console.error("Error stopping screen stream tracks:", err);
      }
    }

    // 2. Stop screen recording MediaRecorder
    if (
      screenRecorderMediaRecorderRef &&
      screenRecorderMediaRecorderRef.current
    ) {
      try {
        if (screenRecorderMediaRecorderRef.current.state !== "inactive") {
          console.log("📹 Stopping screen MediaRecorder...");
          screenRecorderMediaRecorderRef.current.stop();
          console.log("✅ Screen MediaRecorder stopped");
        }
        // ✅ Clear event handlers to prevent memory leaks
        screenRecorderMediaRecorderRef.current.ondataavailable = null;
        screenRecorderMediaRecorderRef.current.onstop = null;
        screenRecorderMediaRecorderRef.current.onerror = null;
      } catch (err) {
        console.error("Error stopping screen recorder:", err);
      }
    }

    // 3. Stop face camera recording MediaRecorder
    if (
      frontCameraMediaRecorderRef &&
      frontCameraMediaRecorderRef.current
    ) {
      try {
        if (frontCameraMediaRecorderRef.current.state !== "inactive") {
          console.log("📹 Stopping face camera MediaRecorder...");
          frontCameraMediaRecorderRef.current.stop();
          console.log("✅ Face camera MediaRecorder stopped");
        }
        // ✅ Clear event handlers to prevent memory leaks
        frontCameraMediaRecorderRef.current.ondataavailable = null;
        frontCameraMediaRecorderRef.current.onstop = null;
        frontCameraMediaRecorderRef.current.onerror = null;
      } catch (err) {
        console.error("Error stopping face camera recorder:", err);
      }
    }

    console.log("🎯 Setting examSubmitted to TRUE");
    setExamSubmitted(true);
    console.log("✅ examSubmitted state updated - this will trigger FloatingCamera to stop camera/mic");

    // ✅ Wait for ALL pending chunks from BOTH recorders to complete
    const waitForAllChunks = async () => {
      const maxWaitTime = 30000; // 30 seconds max
      const startTime = Date.now();

      console.log("⏳ Waiting for all chunks to complete...");

      while (Date.now() - startTime < maxWaitTime) {
        const screenPending = pendingScreenChunksRef?.current?.size || 0;
        const facePending = pendingFaceChunksRef?.current?.size || 0;
        const totalPending = screenPending + facePending;

        if (totalPending === 0) {
          console.log("✅ All chunks completed!");
          return;
        }

        console.log(
          `📊 Pending chunks - Screen: ${screenPending}, Face: ${facePending}, Total: ${totalPending}`
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      console.warn("⚠️ Timeout waiting for chunks - proceeding anyway");
    };

    await waitForAllChunks();

    // Additional safety delay
    console.log("⏳ Additional 1 second safety delay...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsUploadingChunks(false); // ✅ Hide upload loading screen

    console.log(
      "✅ All recordings stopped and events emitted from onstop handlers"
    );

    const submissionAnswers = getAnswersForSubmission();
    console.log("📝 Submitting answers:", submissionAnswers);
    console.log("Answers structure:", {
      totalQuestions: questions.length,
      answeredQuestions: submissionAnswers.length,
      answers: submissionAnswers,
    });

    // ✅ CRITICAL: Save user answers to database with retry logic
    let answersSaved = false;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`💾 Saving user answers to database (Attempt ${attempt}/${maxRetries})...`);
        
        // Validate answers before submission
        const validatedAnswers = submissionAnswers.map(answer => ({
          question_id: Number(answer.question_id),
          option_id: Number(answer.option_id),
          option_text: String(answer.option_text || ''),
        }));

        console.log("Validated answers:", validatedAnswers);
        
        const response = await axios.post(
          `${baseUrl}/saveUserAnswers`,
          {
            exam_id: Number(examId),
            answers: validatedAnswers,
          },
          {
            headers: {
              Authorization: `Bearer ${getTokenFromCookie()}`,
            },
            timeout: 10000, // 10 second timeout
          }
        );
        
        if (response.data.success) {
          console.log("✅ Answers saved successfully:", response.data);
          console.log(`✅ Total answers saved: ${response.data.data?.totalAnswers || validatedAnswers.length}`);
          answersSaved = true;
          
          toast({
            title: "Success",
            description: `Exam submitted! ${validatedAnswers.length} answers saved.`,
            variant: "default",
          });
          break; // Success - exit retry loop
        } else {
          throw new Error(response.data.message || "Failed to save answers");
        }
      } catch (error: any) {
        console.error(
          `❌ Error saving answers (Attempt ${attempt}/${maxRetries}):`,
          error.response?.data || error.message
        );
        
        // If this is the last attempt, show error to user
        if (attempt === maxRetries) {
          toast({
            title: "Error",
            description:
              "Failed to save your answers after multiple attempts. Please contact your examiner immediately with your exam ID.",
            variant: "destructive",
          });
        } else {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Log final status
    if (answersSaved) {
      console.log("✅ ANSWERS SUCCESSFULLY SAVED TO DATABASE");
    } else {
      console.error("❌ CRITICAL: ANSWERS NOT SAVED - Manual intervention required");
      console.error("Exam ID:", examId);
      console.error("User ID:", userId);
      console.error("Answers that failed to save:", submissionAnswers);
      
      // ✅ Reset all submission states so user can retry
      setIsSubmitting(false);
      setIsUploadingChunks(false);
      setExamSubmitted(false);
      
      // ✅ DO NOT PROCEED if answers failed to save
      // Keep user on exam page and show blocking modal
      return;
    }

    try {
      if (onBeforeSubmit) await onBeforeSubmit();
    } catch (err) {
      console.error("Error in onBeforeSubmit:", err);
    }

    // ✅ Emit end-exam socket event to update endTime in database
    console.log("📤 Emitting end-exam event to server");
    socket.emit("end-exam", {
      user_id: userId,
      exam_id: examId,
      timestamp: new Date(),
      status: "success",
      message: "Exam ended successfully",
    });
    console.log("✅ end-exam event emitted");

    // ✅ Wait for socket event to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ✅ CRITICAL: Calculate and save score BEFORE navigation
    let scoreSaved = false;
    const scoreMaxRetries = 3;
    
    for (let attempt = 1; attempt <= scoreMaxRetries; attempt++) {
      try {
        console.log(`💾 Calculating and saving exam score (Attempt ${attempt}/${scoreMaxRetries})...`);
        
        const scoreResponse = await axios.post(
          `${baseUrl}/saveScore`,
          {
            status: "completed",
            userId: Number(userId),
            examId: Number(examId),
            numberOfMicrophones: getNumberOfMicrophones() || 0,
            tabSwitchViolations: getTabSwitchViolations() || 0,
          },
          {
            headers: {
              Authorization: `Bearer ${getTokenFromCookie()}`,
            },
            timeout: 15000, // 15 second timeout for score calculation
          }
        );
        
        console.log("✅ Score calculated and saved:", scoreResponse.data);
        scoreSaved = true;
        break; // Success - exit retry loop
      } catch (error: any) {
        console.error(
          `❌ Error saving score (Attempt ${attempt}/${scoreMaxRetries}):`,
          error.response?.data || error.message
        );
        
        if (attempt < scoreMaxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!scoreSaved) {
      console.warn("⚠️ Score save failed after retries - will show on end page");
      // Continue to end page anyway - backend might have saved it
    }

    // Navigate to end page after all operations complete
    console.log("✅ All data saved - Navigating to end page");
    router.push("/end");
  };

  // ✅ REMOVED: Duplicate useEffect blocks (already exist at top of component)

  if (blocked) {
    return (
      <div className={`${styles.overlay} theme-transition`}>
        <div className={`${styles.blockScreen} theme-transition`}>
          <div
            className="theme-transition"
            style={{
              background: "var(--card-bg)",
              padding: "40px",
              borderRadius: "16px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 20px 50px var(--shadow)",
              textAlign: "center",
              maxWidth: "500px",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                fontSize: "64px",
                marginBottom: "20px",
                color: "var(--error-color)",
              }}
            >
              🚫
            </div>
            <h1
              className="theme-transition"
              style={{
                color: "var(--text-primary)",
                fontSize: "28px",
                fontWeight: 700,
                marginBottom: "16px",
                transition: "color 0.3s ease",
              }}
            >
              Exam Access Blocked
            </h1>
            <p
              className="theme-transition"
              style={{
                color: "var(--text-secondary)",
                fontSize: "16px",
                lineHeight: 1.6,
                margin: 0,
                transition: "color 0.3s ease",
              }}
            >
              Suspicious activity detected. Please contact your examiner for
              assistance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Show upload loading screen while chunks are being uploaded
  if (isUploadingChunks) {
    return (
      <div style={{
        minHeight: "100vh",
        background: currentTheme.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          background: isDarkTheme 
            ? "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
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
          background: isDarkTheme
            ? "radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 10s ease-in-out infinite reverse",
          transition: "background 0.3s ease",
        }} />

        <div style={{
          background: currentTheme.cardBg,
          backdropFilter: "blur(40px)",
          padding: "48px",
          borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          border: `1px solid ${currentTheme.cardBorder}`,
          textAlign: "center",
          maxWidth: "480px",
          position: "relative",
          zIndex: 10,
          transition: "all 0.3s ease",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "28px",
            animation: "pulse 2s ease-in-out infinite",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 40px rgba(59, 130, 246, 0.4)",
            }}>
              <Upload size={40} color="white" strokeWidth={2} />
            </div>
          </div>
          <h3 style={{
            marginBottom: "16px",
            color: currentTheme.textPrimary,
            fontSize: "28px",
            fontWeight: "800",
            letterSpacing: "-0.02em",
            transition: "color 0.3s ease",
          }}>
            Submitting Your Exam...
          </h3>
          <p style={{
            color: currentTheme.textSecondary,
            fontSize: "16px",
            lineHeight: 1.6,
            margin: "0 0 32px 0",
            transition: "color 0.3s ease",
          }}>
            Please wait while we securely upload your exam recordings and save your answers.
            <br />
            <strong style={{ color: currentTheme.textPrimary }}>Do not close this window.</strong>
          </p>

          {/* Animated Progress Bar */}
          <div style={{
            width: "100%",
            height: "8px",
            background: isDarkTheme ? "rgba(30, 41, 59, 0.6)" : "rgba(203, 213, 225, 0.6)",
            borderRadius: "100px",
            overflow: "hidden",
            marginBottom: "28px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1) inset",
          }}>
            <div style={{
              width: "70%",
              height: "100%",
              background: "linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #3b82f6 100%)",
              backgroundSize: "200% 100%",
              borderRadius: "100px",
              animation: "shimmer 1.5s ease-in-out infinite",
              boxShadow: "0 0 12px rgba(59, 130, 246, 0.6)",
            }} />
          </div>

          {/* Info Box */}
          <div style={{
            padding: "16px 20px",
            background: isDarkTheme ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.08)",
            borderRadius: "12px",
            fontSize: "14px",
            color: currentTheme.textSecondary,
            border: `1px solid ${isDarkTheme ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)"}`,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            justifyContent: "center",
            transition: "all 0.3s ease",
          }}>
            <div style={{
              width: "20px",
              height: "20px",
              border: `3px solid ${currentTheme.accentPrimary}`,
              borderTop: `3px solid transparent`,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <span>All cameras and screen sharing have been stopped</span>
          </div>
        </div>

        {/* Animations */}
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.9; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (isLoadingQuestions) {
    return (
      <div style={{
        minHeight: "100vh",
        background: currentTheme.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.3s ease",
      }}>
        <div style={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: "450px",
          height: "450px",
          background: isDarkTheme 
            ? "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 10s ease-in-out infinite",
        }} />

        <div style={{
          background: currentTheme.cardBg,
          backdropFilter: "blur(40px)",
          padding: "40px",
          borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          border: `1px solid ${currentTheme.cardBorder}`,
          textAlign: "center",
          maxWidth: "420px",
          position: "relative",
          zIndex: 10,
          transition: "all 0.3s ease",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(59, 130, 246, 0.4)",
              animation: "pulse 2s ease-in-out infinite",
            }}>
              <FileText size={32} color="white" strokeWidth={2} />
            </div>
          </div>
          <h3 style={{
            marginBottom: "12px",
            color: currentTheme.textPrimary,
            fontSize: "24px",
            fontWeight: "700",
            letterSpacing: "-0.01em",
            transition: "color 0.3s ease",
          }}>
            Loading Exam Questions...
          </h3>
          <p style={{
            color: currentTheme.textSecondary,
            fontSize: "15px",
            lineHeight: 1.6,
            margin: 0,
            transition: "color 0.3s ease",
          }}>
            Please wait while we prepare your exam.
          </p>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.9; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  // ✅ Show loading screen while AI models are initializing
  if (!modelsLoaded && (examSettings?.head_direction_enabled || 
      examSettings?.eyeball_detection_enabled || 
      examSettings?.object_detection_enabled || 
      examSettings?.multiple_person_detection_enabled)) {
    return (
      <div style={{
        minHeight: "100vh",
        background: currentTheme.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.3s ease",
      }}>
        <div style={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: "450px",
          height: "450px",
          background: isDarkTheme
            ? "radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 10s ease-in-out infinite reverse",
        }} />
        <div style={{
          background: currentTheme.cardBg,
          backdropFilter: "blur(40px)",
          padding: "48px",
          borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          border: `1px solid ${currentTheme.cardBorder}`,
          textAlign: "center",
          maxWidth: "480px",
          position: "relative",
          zIndex: 10,
          transition: "all 0.3s ease",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "24px",
            animation: "pulse 2s ease-in-out infinite",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 40px rgba(139, 92, 246, 0.4)",
            }}>
              <Brain size={44} color="white" strokeWidth={2} />
            </div>
          </div>
          <h3 style={{
            marginBottom: "16px",
            color: currentTheme.textPrimary,
            fontSize: "26px",
            fontWeight: "800",
            letterSpacing: "-0.02em",
            transition: "color 0.3s ease",
          }}>
            Initializing AI Proctoring...
          </h3>
          <p style={{
            color: currentTheme.textSecondary,
            fontSize: "15px",
            lineHeight: 1.6,
            margin: "0 0 24px 0",
            transition: "color 0.3s ease",
          }}>
            Loading AI models for advanced monitoring.
            <br />
            <strong style={{ color: currentTheme.textPrimary }}>This may take a few moments.</strong>
          </p>
          <div style={{
            width: "100%",
            height: "6px",
            background: isDarkTheme ? "rgba(30, 41, 59, 0.6)" : "rgba(203, 213, 225, 0.6)",
            borderRadius: "100px",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1) inset",
          }}>
            <div style={{
              width: "60%",
              height: "100%",
              background: "linear-gradient(90deg, #8b5cf6 0%, #7c3aed 50%, #8b5cf6 100%)",
              backgroundSize: "200% 100%",
              borderRadius: "100px",
              animation: "shimmer 1.5s ease-in-out infinite",
              boxShadow: "0 0 12px rgba(139, 92, 246, 0.6)",
            }} />
          </div>
          <div style={{
            marginTop: "24px",
            padding: "14px 18px",
            background: isDarkTheme ? "rgba(139, 92, 246, 0.1)" : "rgba(139, 92, 246, 0.08)",
            borderRadius: "12px",
            fontSize: "13px",
            color: currentTheme.textSecondary,
            border: `1px solid ${isDarkTheme ? "rgba(139, 92, 246, 0.3)" : "rgba(139, 92, 246, 0.2)"}`,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            justifyContent: "center",
            transition: "all 0.3s ease",
          }}>
            <div style={{
              width: "18px",
              height: "18px",
              border: `3px solid ${currentTheme.accentPrimary}`,
              borderTop: "3px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
            <span>Please ensure your camera is enabled and you&apos;re in a well-lit area</span>
          </div>
        </div>
        
        {/* Hidden FloatingCamera to trigger model loading */}
        <div style={{ display: "none" }}>
          <FloatingCamera
            settings={examSettings}
            socket={socket}
            onLookingAway={() => {}}
            detect={() => {}}
            number={() => {}}
            onAuthFaceMissing={() => {}}
            onHeadDirection={() => {}}
            examSubmitted={examSubmitted}
            mediaRecorderRef={frontCameraMediaRecorderRef}
            screenRecorderMediaRecorderRef={screenRecorderMediaRecorderRef}
            onAuthPause={() => {}}
            onAuthResume={() => {}}
            pendingChunksRef={pendingFaceChunksRef}
            onModelsLoaded={handleModelsLoaded}
          />
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.9; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ✅ Show submitting overlay during exam submission
  if (isSubmitting) {
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
          backdropFilter: "blur(40px)",
          padding: "48px",
          borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          border: `1px solid ${currentTheme.cardBorder}`,
          textAlign: "center",
          maxWidth: "480px",
          transition: "all 0.3s ease",
        }}>
          <div style={{
            fontSize: "64px",
            marginBottom: "24px",
            animation: "pulse 2s ease-in-out infinite",
          }}>
            📤
          </div>
          <h3 style={{
            marginBottom: "16px",
            color: currentTheme.textPrimary,
            fontSize: "28px",
            fontWeight: "800",
            letterSpacing: "-0.02em",
            transition: "color 0.3s ease",
          }}>
            Submitting Your Exam...
          </h3>
          <p style={{
            color: currentTheme.textSecondary,
            fontSize: "16px",
            lineHeight: 1.6,
            margin: "0 0 24px 0",
            transition: "color 0.3s ease",
          }}>
            Please wait while we save your answers securely to the database.
            <br />
            <strong style={{ color: currentTheme.textPrimary }}>Do not close this window.</strong>
          </p>
          <div style={{
            width: "100%",
            height: "6px",
            background: isDarkTheme ? "rgba(30, 41, 59, 0.6)" : "rgba(203, 213, 225, 0.6)",
            borderRadius: "100px",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1) inset",
          }}>
            <div style={{
              width: "70%",
              height: "100%",
              background: "linear-gradient(90deg, #3b82f6 0%, #2563eb 50%, #3b82f6 100%)",
              backgroundSize: "200% 100%",
              borderRadius: "100px",
              animation: "shimmer 1.5s ease-in-out infinite",
              boxShadow: "0 0 12px rgba(59, 130, 246, 0.6)",
            }} />
          </div>
        </div>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.9; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // 🔥 CRITICAL: Check for error/loading INSIDE the return, not before hooks
  // This ensures all hooks are called in the same order every render
  
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
          backdropFilter: "blur(40px)",
          padding: "40px",
          borderRadius: "24px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          border: `1px solid ${currentTheme.cardBorder}`,
          textAlign: "center",
          maxWidth: "420px",
          transition: "all 0.3s ease",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              border: `4px solid ${currentTheme.accentPrimary}`,
              borderTop: "4px solid transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
          </div>
          <h3 style={{
            marginBottom: "12px",
            color: currentTheme.textPrimary,
            fontSize: "22px",
            fontWeight: "700",
            letterSpacing: "-0.01em",
            transition: "color 0.3s ease",
          }}>
            Validating Exam Session...
          </h3>
          <p style={{
            color: currentTheme.textSecondary,
            fontSize: "15px",
            lineHeight: 1.5,
            margin: 0,
            transition: "color 0.3s ease",
          }}>
            Please wait while we restore your exam session.
          </p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: currentTheme.background,
      display: "flex",
      position: "relative",
      transition: "background 0.3s ease",
    }}>
      {paused && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          animation: "fadeIn 0.3s ease",
        }}>
          <div style={{
            background: currentTheme.cardBg,
            backdropFilter: "blur(40px)",
            padding: "40px",
            borderRadius: "24px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            border: `1px solid ${currentTheme.cardBorder}`,
            textAlign: "center",
            maxWidth: "420px",
            transition: "all 0.3s ease",
            animation: "scaleIn 0.3s ease",
          }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: currentTheme.warningColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "white",
              fontSize: "28px",
              fontWeight: "bold",
              boxShadow: `0 8px 24px ${isDarkTheme ? 'rgba(245, 158, 11, 0.4)' : 'rgba(234, 88, 12, 0.4)'}`,
            }}>
              ||
            </div>
            <h3 style={{
              marginBottom: "12px",
              color: currentTheme.textPrimary,
              fontSize: "24px",
              fontWeight: "700",
              letterSpacing: "-0.01em",
              transition: "color 0.3s ease",
            }}>
              Exam Paused
            </h3>
            <p style={{
              color: currentTheme.textSecondary,
              fontSize: "15px",
              lineHeight: 1.6,
              margin: 0,
              transition: "color 0.3s ease",
            }}>
              Authenticating your identity… Please look at the camera.
            </p>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <aside style={{
        width: "280px",
        background: currentTheme.sidebarBg,
        backdropFilter: "blur(20px)",
        padding: "24px 20px",
        borderRight: `1px solid ${currentTheme.cardBorder}`,
        overflowY: "auto",
        transition: "all 0.3s ease",
      }}>
        <div style={{
          padding: "0 0 20px 0",
          borderBottom: `1px solid ${currentTheme.cardBorder}`,
          marginBottom: "20px",
          transition: "border-color 0.3s ease",
        }}>
          <h3 style={{
            color: currentTheme.textPrimary,
            fontSize: "18px",
            fontWeight: "700",
            margin: 0,
            letterSpacing: "-0.02em",
            transition: "color 0.3s ease",
          }}>
            Questions
          </h3>
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}>
          {questions.map((q) => (
            <div
              key={q.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: "12px",
                background: answers[q.id]
                  ? currentTheme.questionAnsweredBg
                  : currentTheme.questionNavBg,
                border: `1px solid ${currentTheme.questionNavBorder}`,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(4px)";
                e.currentTarget.style.boxShadow = `0 4px 12px ${isDarkTheme ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)'}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={{
                color: currentTheme.textPrimary,
                fontSize: "14px",
                fontWeight: "600",
                transition: "color 0.3s ease",
              }}>
                Q{q.id}
              </span>
              {answers[q.id] && (
                <CheckCircle size={18} color="#22c55e" strokeWidth={2.5} />
              )}
            </div>
          ))}
        </div>
      </aside>

      <main style={{
        flex: 1,
        padding: "32px",
        overflowY: "auto",
        transition: "all 0.3s ease",
      }}>
        <div style={{
          marginBottom: "32px",
          padding: "28px 32px",
          background: currentTheme.cardBg,
          backdropFilter: "blur(20px)",
          border: `1px solid ${currentTheme.cardBorder}`,
          borderRadius: "20px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <h1 style={{
                fontSize: "32px",
                fontWeight: "800",
                color: currentTheme.textPrimary,
                margin: 0,
                marginBottom: "8px",
                letterSpacing: "-0.02em",
                transition: "color 0.3s ease",
              }}>
                Final Examination
              </h1>
              <p style={{
                fontSize: "15px",
                color: currentTheme.textSecondary,
                margin: 0,
                fontWeight: "500",
                lineHeight: 1.6,
                transition: "color 0.3s ease",
              }}>
                Read each question carefully and select the best answer. This
                session is proctored for academic integrity.
              </p>
            </div>

            {timeLeft !== null && (
              <div style={{
                padding: "16px 28px",
                borderRadius: "16px",
                background: timeLeft < 300
                  ? (isDarkTheme ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)")
                  : currentTheme.timerBg,
                backdropFilter: "blur(10px)",
                border: `2px solid ${timeLeft < 300
                  ? (isDarkTheme ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.3)")
                  : currentTheme.cardBorder}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: "140px",
                boxShadow: timeLeft < 300
                  ? "0 8px 24px rgba(239, 68, 68, 0.2)"
                  : "0 4px 12px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                }}>
                  <Clock size={16} color={timeLeft < 300 ? "#ef4444" : currentTheme.accentPrimary} strokeWidth={2.5} />
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: timeLeft < 300 ? "#ef4444" : currentTheme.textSecondary,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    transition: "color 0.3s ease",
                  }}>
                    Time Left
                  </span>
                </div>
                <span style={{
                  fontSize: "28px",
                  fontWeight: "800",
                  color: timeLeft < 300 ? "#ef4444" : currentTheme.textPrimary,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                  animation: timeLeft < 300 ? "pulse 2s ease-in-out infinite" : "none",
                  transition: "color 0.3s ease",
                }}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
            )}
          </div>
        </div>

        {questions.map((q, index) => (
          <div key={q.id} style={{
            marginBottom: "32px",
            padding: "36px",
            background: currentTheme.cardBg,
            backdropFilter: "blur(30px)",
            border: `2px solid ${currentTheme.cardBorder}`,
            borderRadius: "24px",
            boxShadow: isDarkTheme 
              ? "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 255, 255, 0.05) inset"
              : "0 4px 20px rgba(0,0,0,0.1)",
            transition: "all 0.3s ease",
          }}>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              marginBottom: "20px",
            }}>
              <div style={{
                background: answers[q.id] 
                  ? (isDarkTheme ? "linear-gradient(135deg, #00ff9d 0%, #00d4aa 100%)" : "#22c55e")
                  : currentTheme.questionNumberBg,
                color: answers[q.id] ? "#000000" : currentTheme.textPrimary,
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: "800",
                flexShrink: 0,
                border: `2px solid ${answers[q.id] 
                  ? (isDarkTheme ? "rgba(0, 255, 157, 0.4)" : "#22c55e")
                  : currentTheme.cardBorder}`,
                transition: "all 0.3s ease",
                boxShadow: answers[q.id] 
                  ? (isDarkTheme 
                    ? "0 0 25px rgba(0, 255, 157, 0.5), 0 4px 15px rgba(0, 255, 157, 0.3)"
                    : "0 4px 12px rgba(34, 197, 94, 0.3)")
                  : "none",
              }}>
                {answers[q.id] ? "✓" : q.id}
              </div>
              <h4 style={{
                color: currentTheme.textPrimary,
                fontSize: "19px",
                fontWeight: "700",
                margin: 0,
                lineHeight: 1.6,
                letterSpacing: "-0.02em",
                transition: "color 0.3s ease",
              }}>
                {q.question_text}
              </h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {q.options && q.options.map((opt, idx) => {
                const isSelected = answers[q.id]?.option_id === opt.id;
                return (
                  <label
                    key={idx}
                    style={{
                      padding: "20px 26px",
                      borderRadius: "16px",
                      background: isSelected
                        ? (isDarkTheme 
                          ? "rgba(0, 255, 255, 0.08)" 
                          : "rgba(59, 130, 246, 0.15)")
                        : currentTheme.optionBg,
                      color: isSelected 
                        ? (isDarkTheme ? "#00ffff" : currentTheme.accentPrimary)
                        : currentTheme.textPrimary,
                      border: `2px solid ${isSelected 
                        ? (isDarkTheme ? "rgba(0, 255, 255, 0.5)" : currentTheme.accentPrimary)
                        : currentTheme.cardBorder}`,
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                      fontWeight: isSelected ? "700" : "500",
                      fontSize: "16px",
                      boxShadow: isSelected 
                        ? (isDarkTheme 
                          ? "0 0 25px rgba(0, 255, 255, 0.25), 0 4px 20px rgba(0, 255, 255, 0.15)"
                          : "0 4px 16px rgba(59, 130, 246, 0.2)")
                        : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = currentTheme.optionHoverBg;
                        e.currentTarget.style.borderColor = isDarkTheme 
                          ? "rgba(0, 255, 255, 0.3)" 
                          : currentTheme.accentSecondary;
                        e.currentTarget.style.boxShadow = isDarkTheme
                          ? "0 0 20px rgba(0, 255, 255, 0.15)"
                          : "0 2px 12px rgba(59, 130, 246, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = currentTheme.optionBg;
                        e.currentTarget.style.borderColor = currentTheme.cardBorder;
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => handleChange(q.id, opt.id, opt.option_text)}
                      style={{ display: "none" }}
                    />
                    <div style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: `2.5px solid ${isSelected 
                        ? (isDarkTheme ? "#00ffff" : currentTheme.accentPrimary)
                        : currentTheme.cardBorder}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s ease",
                      flexShrink: 0,
                      boxShadow: isSelected && isDarkTheme
                        ? "0 0 15px rgba(0, 255, 255, 0.4)"
                        : "none",
                    }}>
                      {isSelected && (
                        <div style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: isDarkTheme ? "#00ffff" : currentTheme.accentPrimary,
                          boxShadow: isDarkTheme
                            ? "0 0 10px rgba(0, 255, 255, 0.6)"
                            : "none",
                        }} />
                      )}
                    </div>
                    <span style={{ flex: 1, lineHeight: 1.5, transition: "color 0.3s ease" }}>
                      {opt.option_text}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{
          marginTop: "48px",
          padding: "32px",
          background: currentTheme.cardBg,
          backdropFilter: "blur(20px)",
          border: `1px solid ${currentTheme.cardBorder}`,
          borderRadius: "20px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease",
        }}>
          <div style={{
            fontSize: "15px",
            color: currentTheme.textSecondary,
            marginBottom: "20px",
            fontWeight: "500",
            transition: "color 0.3s ease",
          }}>
            Answered {Object.keys(answers).length} of {questions.length} questions
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: "16px 48px",
              fontSize: "16px",
              fontWeight: "700",
              color: "#ffffff",
              background: isSubmitting
                ? (isDarkTheme ? "rgba(100, 116, 139, 0.5)" : "rgba(148, 163, 184, 0.5)")
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              border: "none",
              borderRadius: "14px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              boxShadow: isSubmitting ? "none" : "0 4px 16px rgba(59, 130, 246, 0.4)",
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(59, 130, 246, 0.5)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(59, 130, 246, 0.4)";
              }
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>
      </main>

      {/* FloatingCamera Component */}
      <div style={{ display: examSubmitted ? "none" : "block" }}>
        <FloatingCamera
          settings={examSettings}
          socket={socket}
          onLookingAway={lookingAlert}
          detect={detectObject}
          number={number}
          onAuthFaceMissing={handleAuthFaceMissing}
          onHeadDirection={handleHeadDirection}
          examSubmitted={examSubmitted}
          mediaRecorderRef={frontCameraMediaRecorderRef}
          screenRecorderMediaRecorderRef={screenRecorderMediaRecorderRef}
          onAuthPause={handleAuthPause}
          onAuthResume={handleAuthResume}
          pendingChunksRef={pendingFaceChunksRef}
          onModelsLoaded={handleModelsLoaded}
        />
      </div>

      {/* Conditionally render alerts based on exam settings */}
      {lookAlert && (
        <div style={{
          position: "fixed",
          bottom: "100px",
          right: "30px",
          padding: "18px 26px",
          borderRadius: "18px",
          background: isDarkTheme 
            ? "rgba(255, 170, 0, 0.1)"
            : "rgba(234, 88, 12, 0.95)",
          backdropFilter: "blur(25px)",
          border: `3px solid ${isDarkTheme ? "rgba(255, 170, 0, 0.6)" : "rgba(194, 65, 12, 0.8)"}`,
          boxShadow: isDarkTheme
            ? "0 0 30px rgba(255, 170, 0, 0.4), 0 10px 40px rgba(255, 170, 0, 0.2)"
            : "0 0 30px rgba(234, 88, 12, 0.5), 0 15px 50px rgba(0, 0, 0, 0.3)",
          zIndex: 1000,
          animation: "slideIn 0.3s ease, glowPulse 2s ease-in-out infinite",
          maxWidth: "400px",
          transition: "all 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: currentTheme.warningColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "20px" }}>👀</span>
            </div>
            <span style={{ fontWeight: "700", color: isDarkTheme ? currentTheme.textPrimary : "#ffffff", fontSize: "15px", transition: "color 0.3s ease", textShadow: isDarkTheme ? "none" : "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
              Please stay focused on the screen! You are turning {lookDirection}
            </span>
          </div>
        </div>
      )}

      {object && (
        <div style={{
          position: "fixed",
          bottom: "100px",
          right: "30px",
          padding: "18px 26px",
          borderRadius: "18px",
          background: isDarkTheme 
            ? "rgba(255, 51, 102, 0.1)"
            : "rgba(239, 68, 68, 0.95)",
          backdropFilter: "blur(25px)",
          border: `3px solid ${isDarkTheme ? "rgba(255, 51, 102, 0.6)" : "rgba(185, 28, 28, 0.9)"}`,
          boxShadow: isDarkTheme
            ? "0 0 30px rgba(255, 51, 102, 0.5), 0 10px 40px rgba(255, 51, 102, 0.3)"
            : "0 0 35px rgba(239, 68, 68, 0.6), 0 15px 50px rgba(0, 0, 0, 0.4)",
          zIndex: 1000,
          animation: "slideIn 0.3s ease, glowPulse 2s ease-in-out infinite",
          maxWidth: "400px",
          transition: "all 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "20px" }}>📱</span>
            </div>
            <span style={{ fontWeight: "700", color: isDarkTheme ? currentTheme.textPrimary : "#ffffff", fontSize: "15px", transition: "color 0.3s ease", textShadow: isDarkTheme ? "none" : "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
              Unauthorized device detected (e.g., mobile phone)
            </span>
          </div>
        </div>
      )}

      {num && (
        <div style={{
          position: "fixed",
          bottom: "100px",
          right: "30px",
          padding: "18px 26px",
          borderRadius: "18px",
          background: isDarkTheme 
            ? "rgba(0, 153, 255, 0.1)" 
            : "rgba(59, 130, 246, 0.95)",
          backdropFilter: "blur(25px)",
          border: `3px solid ${isDarkTheme ? "rgba(0, 153, 255, 0.5)" : "rgba(37, 99, 235, 0.9)"}`,
          boxShadow: isDarkTheme 
            ? "0 0 30px rgba(0, 153, 255, 0.4), 0 10px 40px rgba(0, 153, 255, 0.2)"
            : "0 0 30px rgba(59, 130, 246, 0.5), 0 15px 50px rgba(0, 0, 0, 0.3)",
          zIndex: 1000,
          animation: "slideIn 0.3s ease, glowPulse 2s ease-in-out infinite",
          maxWidth: "400px",
          transition: "all 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: currentTheme.accentPrimary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "20px" }}>👥</span>
            </div>
            <span style={{ fontWeight: "700", color: isDarkTheme ? currentTheme.textPrimary : "#ffffff", fontSize: "15px", transition: "color 0.3s ease", textShadow: isDarkTheme ? "none" : "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
              {face} faces detected
            </span>
          </div>
        </div>
      )}

      {authFaceMissing && (
        <div style={{
          position: "fixed",
          bottom: "100px",
          right: "30px",
          padding: "18px 26px",
          borderRadius: "18px",
          background: isDarkTheme 
            ? "rgba(255, 170, 0, 0.1)" 
            : "rgba(234, 88, 12, 0.95)",
          backdropFilter: "blur(25px)",
          border: `3px solid ${isDarkTheme ? "rgba(255, 170, 0, 0.6)" : "rgba(194, 65, 12, 0.8)"}`,
          boxShadow: isDarkTheme
            ? "0 0 30px rgba(255, 170, 0, 0.4), 0 10px 40px rgba(255, 170, 0, 0.2)"
            : "0 0 30px rgba(234, 88, 12, 0.5), 0 15px 50px rgba(0, 0, 0, 0.3)",
          zIndex: 1000,
          animation: "slideIn 0.3s ease, glowPulse 2s ease-in-out infinite",
          maxWidth: "400px",
          transition: "all 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: currentTheme.warningColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <AlertTriangle size={20} color="white" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: "700", color: isDarkTheme ? currentTheme.textPrimary : "#ffffff", fontSize: "15px", transition: "color 0.3s ease", textShadow: isDarkTheme ? "none" : "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
              Authenticated face not detected. Please ensure you are in front of
              the camera.
            </span>
          </div>
        </div>
      )}

      {headDirection && (
        <div style={{
          position: "fixed",
          bottom: "100px",
          right: "30px",
          padding: "18px 26px",
          borderRadius: "18px",
          background: isDarkTheme 
            ? "rgba(255, 170, 0, 0.1)" 
            : "rgba(234, 88, 12, 0.95)",
          backdropFilter: "blur(25px)",
          border: `3px solid ${isDarkTheme ? "rgba(255, 170, 0, 0.6)" : "rgba(194, 65, 12, 0.8)"}`,
          boxShadow: isDarkTheme
            ? "0 0 30px rgba(255, 170, 0, 0.4), 0 10px 40px rgba(255, 170, 0, 0.2)"
            : "0 0 30px rgba(234, 88, 12, 0.5), 0 15px 50px rgba(0, 0, 0, 0.3)",
          zIndex: 1000,
          animation: "slideIn 0.3s ease, glowPulse 2s ease-in-out infinite",
          maxWidth: "400px",
          transition: "all 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: currentTheme.warningColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: "20px" }}>🧭</span>
            </div>
            <span style={{ fontWeight: "700", color: isDarkTheme ? currentTheme.textPrimary : "#ffffff", fontSize: "15px", transition: "color 0.3s ease", textShadow: isDarkTheme ? "none" : "0 2px 4px rgba(0, 0, 0, 0.3)" }}>
              Please keep your head facing forward
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          33% {
            transform: translate(30px, -30px);
          }
          66% {
            transform: translate(-20px, 20px);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.9;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
        @keyframes glowPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 170, 0, 0.3), 0 0 40px rgba(255, 170, 0, 0.15);
          }
          50% {
            box-shadow: 0 0 35px rgba(255, 170, 0, 0.5), 0 0 60px rgba(255, 170, 0, 0.25);
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
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ExamPage;
