import React, { useEffect, useState, useRef } from "react";
import styles from "../styles/ExamPage.module.css";
import FloatingCamera from "./FloatingCamera";
import socket from "./socket";
import { useRouter } from "next/router";
import { useToast } from "@/hooks/use-toast";
import { getExamId, getUserId } from "@/constants/AuthStore";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";

// const questions = Array.from({ length: 10 }, (_, i) => ({
//   id: i + 1,
//   question: `Sample Question ${i + 1}?`,
//   options: ["Option A", "Option B", "Option C", "Option D"],
// }));f


const examId = getExamId();

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const userId = getUserId() || "unknown";

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
  const [headDirection, setHeadDirection] = useState(false);
  const [examSettings, setExamSettings] = useState<ExamSettings>({});
  const [faceAuthenticationComplete, setFaceAuthenticationComplete] =
    useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // ✅ REMOVED: lastAlertRef - No longer needed (throttling handled in FloatingCamera)
  // ✅ REMOVED: ALERT_THROTTLE_MS - No longer needed (throttling handled in FloatingCamera)

  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout }>({});

  const frontCameraMediaRecorderRef = useRef<MediaRecorder>(null);

  const router = useRouter();

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
      if (!faceAuthenticationComplete && !examStarted) {
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
        console.log("✅ Screen sharing turned OFF");
      } catch (err) {
        console.error("Error stopping screen stream tracks:", err);
      }
    }

    // ✅ STOP SCREEN RECORDING MEDIARECORDER
    if (
      screenRecorderMediaRecorderRef &&
      screenRecorderMediaRecorderRef.current
    ) {
      try {
        if (screenRecorderMediaRecorderRef.current.state !== "inactive") {
          console.log("📹 Stopping screen MediaRecorder...");
          screenRecorderMediaRecorderRef.current.stop();
        }
      } catch (err) {
        console.error("Error stopping screen recorder:", err);
      }
    }

    console.log("🎯 Setting examSubmitted to TRUE");
    setExamSubmitted(true);
    console.log("✅ examSubmitted state updated");

    // ✅ Wait for ALL pending chunks from BOTH recorders to complete
    const waitForAllChunks = async () => {
      const maxWaitTime = 10000; // 10 seconds max
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
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.warn("⚠️ Timeout waiting for chunks - proceeding anyway");
    };

    await waitForAllChunks();

    // Additional safety delay
    console.log("⏳ Additional 1 second safety delay...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

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

    // Save user answers to database
    try {
      console.log("💾 Saving user answers to database...");
      const response = await axios.post(
        `${baseUrl}/saveUserAnswers`,
        {
          exam_id: Number(examId),
          answers: submissionAnswers,
        },
        {
          headers: {
            Authorization: `Bearer ${getTokenFromCookie()}`,
          },
        }
      );
      console.log("✅ Answers saved successfully:", response.data);
    } catch (error: any) {
      console.error(
        "❌ Error saving answers:",
        error.response?.data || error.message
      );
      toast({
        title: "Warning",
        description:
          "Failed to save some answers. Your exam will still be submitted.",
        variant: "destructive",
      });
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
      if (!faceAuthenticationComplete && !examStarted) {
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
              fontSize: "48px",
              marginBottom: "16px",
            }}
          >
            📝
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
                  background: timeLeft < 300 ? "var(--error-bg)" : "var(--secondary-bg)",
                  border: `2px solid ${timeLeft < 300 ? "var(--error-color)" : "var(--border-color)"}`,
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
                    color: timeLeft < 300 ? "var(--error-color)" : "var(--text-secondary)",
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
                    color: timeLeft < 300 ? "var(--error-color)" : "var(--text-primary)",
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
            style={{
              background:
                "linear-gradient(135deg, var(--accent-color) 0%, #0284c7 100%)",
              border: "none",
              color: "white",
              padding: "16px 48px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(14, 165, 233, 0.25)",
              transition: "all 0.3s ease",
              minWidth: "200px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(14, 165, 233, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 14px rgba(14, 165, 233, 0.25)";
            }}
          >
            🚀 Submit Exam
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
