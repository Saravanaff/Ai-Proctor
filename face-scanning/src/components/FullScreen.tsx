import React, { useEffect, useState, useRef, useCallback } from "react";
import styles from "../styles/ExamPage.module.css";
import FloatingCamera from "./FloatingCamera";
import socket from "./socket";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { getExamId, getUserId, hasValidExamId, hasValidUserId } from "@/constants/AuthStore";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { Brain, FileText, Loader, Upload, CheckCircle } from "lucide-react";
import { useExamState } from "@/hooks/useExamState";
import ExamStateError from "./ExamStateError";

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

  // Fetch exam questions - runs once on mount
  useEffect(() => {
    // Don't fetch if exam state is not valid
    if (!examState.isValid || examState.isLoading) return;
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
          setQuestions(response.data.questions);

          if (response.data.exam && response.data.exam.duration) {
            // Set timer based on duration (in minutes)
            setTimeLeft(response.data.exam.duration * 60);
          }
        }
      } catch (error) {
        console.error("❌ Failed to fetch exam questions:", error);
        toast({
          title: "Error",
          description: "Failed to load exam questions",
          variant: "destructive",
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchExamQuestions();
  }, []); // ✅ FIX: Empty dependency array - run only once on mount

  // ✅ REMOVE: Axios interceptor moved out of component to prevent repeated requests

  // Cleanup all timeouts when component unmounts
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Fetch exam settings - runs once on mount
  useEffect(() => {
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
  }, []); // ✅ FIX: Empty dependency array - run only once on mount

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

  // ✅ Track when user exits exam (browser close, tab close, navigation away)
  useEffect(() => {
    const handleExamExit = async () => {
      // Only track exit if exam has started and not yet submitted
      if (!examStarted || examSubmitted) return;

      const exitTime = new Date();
      console.log("🚪 User exiting exam - marking end time:", exitTime);

      try {
        // ✅ Use sendBeacon for reliable delivery even during page unload
        const exitData = JSON.stringify({
          userId: Number(userId),
          examId: Number(examId),
          endTime: exitTime.toISOString(),
          exitType: "unexpected_exit",
        });

        const beaconSent = navigator.sendBeacon(
          `${baseUrl}/markExamExit`,
          new Blob([exitData], { type: "application/json" })
        );

        if (beaconSent) {
          console.log("✅ Exam exit beacon sent successfully");
        } else {
          console.warn("⚠️ Beacon failed, trying synchronous request");
          // Fallback to synchronous AJAX if beacon fails
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${baseUrl}/markExamExit`, false); // synchronous
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.setRequestHeader("Authorization", `Bearer ${getTokenFromCookie()}`);
          xhr.send(exitData);
        }

        // Also emit socket event as backup
        socket.emit("exam-unexpected-exit", {
          user_id: userId,
          exam_id: examId,
          exit_time: exitTime,
          timestamp: exitTime,
        });
      } catch (error) {
        console.error("❌ Failed to mark exam exit:", error);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      handleExamExit();
      // Show confirmation dialog
      e.preventDefault();
      e.returnValue = ""; // Chrome requires returnValue to be set
    };

    const handleVisibilityChange = () => {
      if (document.hidden && examStarted && !examSubmitted) {
        console.log("⚠️ User switched tab/minimized browser");
        handleExamExit();
      }
    };

    // Listen for page unload events
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleExamExit);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("unload", handleExamExit);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [examStarted, examSubmitted, userId, examId, baseUrl]);

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

    // Wait a moment for the socket event to be processed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Navigate to end page after cleanup
    console.log("✅ Navigating to end page");
    router.push("/end");
  };

  // Fetch exam questions - runs once on mount
  useEffect(() => {
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
          setQuestions(response.data.questions);

          if (response.data.exam && response.data.exam.duration) {
            // Set timer based on duration (in minutes)
            setTimeLeft(response.data.exam.duration * 60);
          }
        }
      } catch (error) {
        console.error("❌ Failed to fetch exam questions:", error);
        toast({
          title: "Error",
          description: "Failed to load exam questions",
          variant: "destructive",
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    fetchExamQuestions();
  }, []); // ✅ FIX: Empty dependency array - run only once on mount

  // ✅ REMOVE: Axios interceptor moved out of component to prevent repeated requests

  // Cleanup all timeouts when component unmounts
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Fetch exam settings - runs once on mount
  useEffect(() => {
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
  }, []); // ✅ FIX: Empty dependency array - run only once on mount

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
      <div className={`${styles.overlay} theme-transition`}>
        <div
          className="theme-transition"
          style={{
            background: "var(--card-bg)",
            color: "var(--text-primary)",
            padding: "48px",
            borderRadius: "16px",
            boxShadow: "0 20px 50px var(--shadow)",
            border: "1px solid var(--border-color)",
            textAlign: "center",
            maxWidth: "450px",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <Upload size={64} color="var(--accent-color)" strokeWidth={1.5} style={{ animation: "pulse 2s ease-in-out infinite" }} />
          </div>
          <h3
            className="theme-transition"
            style={{
              marginBottom: "16px",
              color: "var(--text-primary)",
              fontSize: "24px",
              fontWeight: 700,
              transition: "color 0.3s ease",
            }}
          >
            Submitting Your Exam...
          </h3>
          <p
            className="theme-transition"
            style={{
              color: "var(--text-secondary)",
              fontSize: "16px",
              lineHeight: 1.6,
              margin: "0 0 28px 0",
              transition: "color 0.3s ease",
            }}
          >
            Please wait while we securely upload your exam recordings and save your answers.
            <br />
            <strong>Do not close this window.</strong>
          </p>

          {/* Animated Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "6px",
              background: "var(--border-color)",
              borderRadius: "3px",
              overflow: "hidden",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                width: "70%",
                height: "100%",
                background: "var(--accent-color)",
                borderRadius: "3px",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>

          {/* Info Box */}
          <div
            style={{
              padding: "16px",
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: "8px",
              fontSize: "14px",
              color: "var(--text-secondary)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <Loader size={18} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
            <span>All cameras and screen sharing have been stopped</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingQuestions) {
    return (
      <div className={`${styles.overlay} theme-transition`}>
        <div
          className="theme-transition"
          style={{
            background: "var(--card-bg)",
            color: "var(--text-primary)",
            padding: "32px",
            borderRadius: "16px",
            boxShadow: "0 20px 50px var(--shadow)",
            border: "1px solid var(--border-color)",
            textAlign: "center",
            maxWidth: "400px",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <FileText size={48} color="var(--accent-color)" strokeWidth={1.5} />
          </div>
          <h3
            className="theme-transition"
            style={{
              marginBottom: "12px",
              color: "var(--text-primary)",
              fontSize: "20px",
              fontWeight: 600,
              transition: "color 0.3s ease",
            }}
          >
            Loading Exam Questions...
          </h3>
          <p
            className="theme-transition"
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              lineHeight: 1.5,
              margin: 0,
              transition: "color 0.3s ease",
            }}
          >
            Please wait while we prepare your exam.
          </p>
        </div>
      </div>
    );
  }

  // ✅ Show loading screen while AI models are initializing
  if (!modelsLoaded && (examSettings?.head_direction_enabled || 
      examSettings?.eyeball_detection_enabled || 
      examSettings?.object_detection_enabled || 
      examSettings?.multiple_person_detection_enabled)) {
    return (
      <div className={`${styles.overlay} theme-transition`}>
        <div
          className="theme-transition"
          style={{
            background: "var(--card-bg)",
            color: "var(--text-primary)",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 20px 50px var(--shadow)",
            border: "1px solid var(--border-color)",
            textAlign: "center",
            maxWidth: "450px",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "20px",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            <Brain size={56} color="var(--accent-color)" strokeWidth={1.5} />
          </div>
          <h3
            className="theme-transition"
            style={{
              marginBottom: "16px",
              color: "var(--text-primary)",
              fontSize: "22px",
              fontWeight: 700,
              transition: "color 0.3s ease",
            }}
          >
            Initializing AI Proctoring...
          </h3>
          <p
            className="theme-transition"
            style={{
              color: "var(--text-secondary)",
              fontSize: "15px",
              lineHeight: 1.6,
              margin: "0 0 20px 0",
              transition: "color 0.3s ease",
            }}
          >
            Loading AI models for advanced monitoring.
            <br />
            <strong>This may take a few moments.</strong>
          </p>
          <div
            style={{
              width: "100%",
              height: "4px",
              background: "var(--border-color)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "60%",
                height: "100%",
                background: "var(--accent-color)",
                borderRadius: "2px",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              background: "var(--secondary-bg)",
              borderRadius: "8px",
              fontSize: "13px",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center",
            }}
          >
            <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
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
            examSubmitted={false}
            mediaRecorderRef={frontCameraMediaRecorderRef}
            screenRecorderMediaRecorderRef={screenRecorderMediaRecorderRef}
            onAuthPause={() => {}}
            onAuthResume={() => {}}
            pendingChunksRef={pendingFaceChunksRef}
            onModelsLoaded={handleModelsLoaded}
          />
        </div>
      </div>
    );
  }

  // ✅ Show submitting overlay during exam submission
  if (isSubmitting) {
    return (
      <div className={`${styles.overlay} theme-transition`}>
        <div
          className="theme-transition"
          style={{
            background: "var(--card-bg)",
            color: "var(--text-primary)",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 20px 50px var(--shadow)",
            border: "1px solid var(--border-color)",
            textAlign: "center",
            maxWidth: "450px",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              marginBottom: "20px",
              animation: "pulse 2s ease-in-out infinite",
            }}
          >
            📤
          </div>
          <h3
            className="theme-transition"
            style={{
              marginBottom: "16px",
              color: "var(--text-primary)",
              fontSize: "24px",
              fontWeight: 700,
              transition: "color 0.3s ease",
            }}
          >
            Submitting Your Exam...
          </h3>
          <p
            className="theme-transition"
            style={{
              color: "var(--text-secondary)",
              fontSize: "15px",
              lineHeight: 1.6,
              margin: 0,
              marginBottom: "20px",
              transition: "color 0.3s ease",
            }}
          >
            Please wait while we save your answers securely to the database.
            <br />
            <strong>Do not close this window.</strong>
          </p>
          <div
            style={{
              width: "100%",
              height: "4px",
              background: "var(--border-color)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "70%",
                height: "100%",
                background: "var(--accent-color)",
                borderRadius: "2px",
                animation: "shimmer 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>
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
      <div className={`${styles.overlay} theme-transition`}>
        <div
          className="theme-transition"
          style={{
            background: "var(--card-bg)",
            color: "var(--text-primary)",
            padding: "32px",
            borderRadius: "16px",
            boxShadow: "0 20px 50px var(--shadow)",
            border: "1px solid var(--border-color)",
            textAlign: "center",
            maxWidth: "400px",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <Loader size={48} color="var(--accent-color)" strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />
          </div>
          <h3
            className="theme-transition"
            style={{
              marginBottom: "12px",
              color: "var(--text-primary)",
              fontSize: "20px",
              fontWeight: "600",
              transition: "color 0.3s ease",
            }}
          >
            Validating Exam Session...
          </h3>
          <p
            className="theme-transition"
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              lineHeight: 1.5,
              margin: 0,
              transition: "color 0.3s ease",
            }}
          >
            Please wait while we restore your exam session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.examContainer} theme-transition`}>
      {paused && (
        <div
          className={`${styles.overlay} theme-transition`}
          style={{ zIndex: 2000 }}
        >
          <div
            className="theme-transition"
            style={{
              background: "var(--card-bg)",
              color: "var(--text-primary)",
              padding: "32px",
              borderRadius: "16px",
              boxShadow: "0 20px 50px var(--shadow)",
              border: "1px solid var(--border-color)",
              textAlign: "center",
              maxWidth: "400px",
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "var(--warning-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                color: "white",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              ||
            </div>
            <h3
              className="theme-transition"
              style={{
                marginBottom: "12px",
                color: "var(--text-primary)",
                fontSize: "20px",
                fontWeight: 600,
                transition: "color 0.3s ease",
              }}
            >
              Exam Paused
            </h3>
            <p
              className="theme-transition"
              style={{
                color: "var(--text-secondary)",
                fontSize: "14px",
                lineHeight: 1.5,
                margin: 0,
                transition: "color 0.3s ease",
              }}
            >
              Authenticating your identity… Please look at the camera.
            </p>
          </div>
        </div>
      )}

      <aside className={`${styles.sidebar} theme-transition`}>
        <div
          className="theme-transition"
          style={{
            padding: "20px 0",
            borderBottom: "1px solid var(--border-color)",
            marginBottom: "20px",
            transition: "border-color 0.3s ease",
          }}
        >
          <h3
            className="theme-transition"
            style={{
              color: "var(--text-primary)",
              fontSize: "16px",
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.01em",
              transition: "color 0.3s ease",
            }}
          >
            Questions
          </h3>
        </div>
        <div className={styles.questionNavigation}>
          {questions.map((q) => (
            <div
              key={q.id}
              className={`${styles.questionNavItem} theme-transition ${
                answers[q.id] ? styles.answered : ""
              }`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "8px",
                background: answers[q.id]
                  ? "var(--success-bg)"
                  : "var(--secondary-bg)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <span
                className="theme-transition"
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 500,
                  transition: "color 0.3s ease",
                }}
              >
                Q{q.id}
              </span>
              {answers[q.id] && (
                <span
                  style={{
                    color: "var(--success-color)",
                    fontSize: "14px",
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          className="theme-transition"
          style={{
            marginTop: "20px",
            padding: "16px",
            background: "var(--info-bg)",
            border: "1px solid var(--info-color)",
            borderRadius: "8px",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <span
              className="theme-transition"
              style={{
                color: "var(--text-primary)",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                transition: "color 0.3s ease",
              }}
            >
              Progress
            </span>
          </div>
          <div
            className="theme-transition"
            style={{
              color: "var(--text-secondary)",
              fontSize: "12px",
              transition: "color 0.3s ease",
            }}
          >
            {Object.keys(answers).length} of {questions.length} answered
          </div>
          <div
            style={{
              width: "100%",
              height: "4px",
              background: "var(--border-color)",
              borderRadius: "2px",
              marginTop: "8px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${
                  (Object.keys(answers).length / questions.length) * 100
                }%`,
                height: "100%",
                background: "var(--success-color)",
                borderRadius: "2px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </aside>

      <main className={`${styles.mainContent} theme-transition`}>
        <div
          className="theme-transition"
          style={{
            marginBottom: "30px",
            padding: "24px",
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            boxShadow: "0 2px 8px var(--shadow)",
            transition: "all 0.3s ease",
          }}
        >
          <div
            className="theme-transition"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "32px",
              padding: "20px",
              background: "var(--card-bg)",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div>
              <h1
                className="theme-transition"
                style={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  margin: 0,
                  marginBottom: "8px",
                  letterSpacing: "-0.5px",
                }}
              >
                Final Examination
              </h1>
              <p
                className="theme-transition"
                style={{
                  fontSize: "15px",
                  color: "var(--text-secondary)",
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                Read each question carefully and select the best answer. This
                session is proctored for academic integrity.
              </p>
            </div>

            {timeLeft !== null && (
              <div
                className="theme-transition"
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  background:
                    timeLeft < 300 ? "var(--error-bg)" : "var(--secondary-bg)",
                  border: `2px solid ${
                    timeLeft < 300
                      ? "var(--error-color)"
                      : "var(--border-color)"
                  }`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: "120px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color:
                      timeLeft < 300
                        ? "var(--error-color)"
                        : "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "4px",
                  }}
                >
                  Time Left
                </span>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color:
                      timeLeft < 300
                        ? "var(--error-color)"
                        : "var(--text-primary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
          </div>
        </div>

        {questions.map((q) => (
          <div
            key={q.id}
            className={`${styles.questionBlock} theme-transition`}
          >
            <div
              className="theme-transition"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                className="theme-transition"
                style={{
                  background: answers[q.id]
                    ? "var(--success-color)"
                    : "var(--secondary-bg)",
                  color: answers[q.id] ? "white" : "var(--text-primary)",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                  flexShrink: 0,
                  border: `2px solid ${
                    answers[q.id]
                      ? "var(--success-color)"
                      : "var(--border-color)"
                  }`,
                  transition: "all 0.3s ease",
                }}
              >
                {answers[q.id] ? "✓" : q.id}
              </div>
              <h4
                className="theme-transition"
                style={{
                  color: "var(--text-primary)",
                  fontSize: "18px",
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.4,
                  transition: "color 0.3s ease",
                }}
              >
                {q.question_text}
              </h4>
            </div>
            <div className={styles.options}>
              {q.options &&
                q.options.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`${styles.optionLabel} theme-transition ${
                      answers[q.id]?.option_id === opt.id ? styles.selected : ""
                    }`}
                    style={{
                      background:
                        answers[q.id]?.option_id === opt.id
                          ? "var(--accent-color)"
                          : "var(--secondary-bg)",
                      color:
                        answers[q.id]?.option_id === opt.id
                          ? "white"
                          : "var(--text-primary)",
                      border: `2px solid ${
                        answers[q.id]?.option_id === opt.id
                          ? "var(--accent-color)"
                          : "var(--border-color)"
                      }`,
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.id}
                      checked={answers[q.id]?.option_id === opt.id}
                      onChange={() =>
                        handleChange(q.id, opt.id, opt.option_text)
                      }
                      style={{ display: "none" }}
                    />
                    <div
                      className="theme-transition"
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: "2px solid",
                        borderColor:
                          answers[q.id]?.option_id === opt.id
                            ? "white"
                            : "var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {answers[q.id]?.option_id === opt.id && (
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "white",
                          }}
                        />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: 500,
                      }}
                    >
                      {opt.option_text}
                    </span>
                  </label>
                ))}
            </div>
          </div>
        ))}

        <div
          className="theme-transition"
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "40px",
            padding: "20px 0",
          }}
        >
          <button
            className={`${styles.submitButton} theme-transition`}
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              background: isSubmitting
                ? "linear-gradient(135deg, #94a3b8 0%, #64748b 100%)"
                : "linear-gradient(135deg, var(--accent-color) 0%, #0284c7 100%)",
              border: "none",
              color: "white",
              padding: "16px 48px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(14, 165, 233, 0.25)",
              transition: "all 0.3s ease",
              minWidth: "200px",
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(14, 165, 233, 0.35)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(14, 165, 233, 0.25)";
              }
            }}
          >
            {isSubmitting ? "⏳ Submitting..." : "🚀 Submit Exam"}
          </button>
        </div>
      </main>

      {/* ✅ Keep FloatingCamera mounted even after submission - just hide it */}
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
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--warning-color) 0%, #f59e0b 100%)",
            border: "1px solid var(--warning-color)",
            boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>👀</span>
            <span style={{ fontWeight: 600 }}>
              Please stay focused on the screen! You are turning {lookDirection}
            </span>
          </div>
        </div>
      )}

      {object && (
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--error-color) 0%, #dc2626 100%)",
            border: "1px solid var(--error-color)",
            boxShadow: "0 8px 25px rgba(239, 68, 68, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>📱</span>
            <span style={{ fontWeight: 600 }}>
              Unauthorized device detected (e.g., mobile phone)
            </span>
          </div>
        </div>
      )}

      {num && (
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--info-color) 0%, #2563eb 100%)",
            border: "1px solid var(--info-color)",
            boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>👥</span>
            <span style={{ fontWeight: 600 }}>{face} faces detected</span>
          </div>
        </div>
      )}

      {authFaceMissing && (
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--warning-color) 0%, #f59e0b 100%)",
            border: "1px solid var(--warning-color)",
            boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <span style={{ fontWeight: 600 }}>
              Authenticated face not detected. Please ensure you are in front of
              the camera.
            </span>
          </div>
        </div>
      )}

      {headDirection && (
        <div
          className={`${styles.alertBox} theme-transition`}
          style={{
            background:
              "linear-gradient(135deg, var(--warning-color) 0%, #f59e0b 100%)",
            border: "1px solid var(--warning-color)",
            boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
            transition: "all 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🧭</span>
            <span style={{ fontWeight: 600 }}>
              Please keep your head facing forward
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPage;
