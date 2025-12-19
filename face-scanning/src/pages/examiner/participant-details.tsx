import React, { useState, useEffect, useRef } from "react";
import { generateParticipantPdf } from "../../components/ParticipantPdfReport";
import { useRouter } from "next/router";
import axios from "axios";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "../../styles/ParticipantDetailsRedesign.module.css";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { createAuthenticatedAxiosInstance } from "@/utils/axiosConfig";
import VideoPlayer from "../../components/VideoPlayer";
import { ExaminerGuard } from "@/components/guards";
import { LoadingScreen } from "@/components/PageTransition";

const PDF_CONSTANTS = {
  SUPER_PROCTOR_FEED: 0,
  RESTRICTED_OBJECT: 0,
  DATA_CAPTURE_INTERVAL: 5,
  PAUSE_EXAM_REQUEST: 0,
  INDIVIDUAL_TEST_TAKER_SETTINGS: 0,
  AUTO_TEST_ABORT: 0,
};

interface User {
  id: number;
  name: string;
  email: string;
  dept: string;
  dob: string;
  reg: string;
}

interface ExamDetails {
  id: number;
  exam_name: string;
  key: number;
  createdAt: string;
  updatedAt: string;
}

interface ScoreDetails {
  success: boolean;
  data: number;

  scoreBreakdown?: {
    no_of_person_flagged: number;
    no_person_flagged: number;
    auth_face_flagged: number;
    head_position_flagged: number;
    eyes_flagged: number;
    object_detected_flagged: number;
    sound_flagged: number;
    tab_switch_violation: number;
    number_of_microphone: number;
    screen_sharing: boolean;
    safe_browser: boolean;
    control_desktop_apps: number;
    blank_feed: number;
    total_score: number;
  };
}

interface ViolationEvent {
  id: string;
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  timestamp: string;
  details?: string;
}

interface TimelineEvent {
  timestamp: string;
  score: number;
  violations: string[];
}

interface ViolationLogResponse {
  success: boolean;
  data: {
    id: number;
    user_id: number;
    exam_id: number;
    violation_name: string;
    violation_timestamp: string;
  }[];
  count: number;
  summary: { [key: string]: number };
}

const ParticipantDetailsPage: React.FC = () => {
  // Enforce light theme
  useEffect(() => {
    document.body.style.background = "#f8fafc";
    document.body.style.minHeight = "100vh";
    return () => {
      document.body.style.background = "";
      document.body.style.minHeight = "";
    };
  }, []);

  const router = useRouter();
  const { examId, userId } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Store IDs in localStorage when they're available from router
  useEffect(() => {
    if (examId && userId) {
      if (typeof window !== "undefined") {
        localStorage.setItem("currentExamId", examId as string);
        localStorage.setItem("currentUserId", userId as string);
      }
    }
  }, [examId, userId]);

  // Get IDs from localStorage if router query is empty (on refresh)
  const getExamId = () => {
    if (examId) return examId as string;
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentExamId");
    }
    return null;
  };

  const getUserId = () => {
    if (userId) return userId as string;
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentUserId");
    }
    return null;
  };

  const handleGeneratePDF = async () => {
    if (!user || !examDetails) {
      alert("User or exam details not loaded. Please wait and try again.");
      return;
    }

    // ✅ FIX: Get userId with fallback to localStorage
    const currentUserId = getUserId();
    if (!currentUserId) {
      console.error("User ID not available");
      alert("Unable to identify student. Please refresh the page and try again.");
      return;
    }

    let results = examResults;
    if (!results) {
      try {
        setExamResultsLoading(true);
        
        const token = getTokenFromCookie();
        if (!token) {
          throw new Error("Authentication token not found. Please login again.");
        }

        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const currentExamId = getExamId();

        if (!currentExamId) {
          throw new Error("Exam ID not available");
        }

        console.log("📄 PDF Generation - Fetching data:", { currentUserId, currentExamId });

        // ✅ FIX: Use the same endpoint as fetchExamResults
        const questionsRes = await axios.get(`${base}/getExamQuestions/${currentExamId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          validateStatus: (status) => status < 500,
        });

        const questions = questionsRes.data.questions || [];
        
        // ✅ FIX: Use getUserId() helper (student's ID), not user.id (admin's ID)
        const answersRes = await axios.get(
          `${base}/exam/${currentExamId}/student/${currentUserId}/answers`,
          { 
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
            validateStatus: (status) => status < 500,
          }
        );

        console.log("📄 PDF - Answers Response:", answersRes.data);

        // Check if the request failed
        if (answersRes.status === 404) {
          throw new Error("Student answers not found. The student may not have submitted any answers.");
        }

        if (!answersRes.data.success) {
          throw new Error(answersRes.data.message || "Failed to fetch student answers");
        }

        // ✅ FIX: API returns answers directly in data.answers
        const rawUserAnswers = answersRes.data.data?.answers || [];
        
        console.log("📄 PDF - Processing answers:", {
          totalQuestions: questions.length,
          totalAnswers: rawUserAnswers.length
        });

        const detailedAnswers = questions.map((question: any) => {
          const userAnswer = rawUserAnswers.find(
            (ans: any) => ans.question_id === question.id
          );
          
          const questionOptions = Array.isArray(question.QuestionOptions)
            ? question.QuestionOptions
            : [];

          // Find the correct option for this question
          const correctOption = questionOptions.find(
            (opt: any) => opt.is_correct === true || opt.is_correct === 1 || opt.is_correct === "1"
          );
          
          // ✅ Get user's selected option
          // First try to get it from the JOIN (selected_option from backend)
          let selectedOption = userAnswer?.selected_option;
          
          // If not available, find it from question options using option_id
          if (!selectedOption && userAnswer?.option_id) {
            selectedOption = questionOptions.find(
              (opt: any) => Number(opt.id) === Number(userAnswer.option_id)
            );
          }
          
          // ✅ SIMPLIFIED: Use is_correct directly from selected_option (no need for ID comparison)
          const isCorrect = selectedOption?.is_correct === true || 
                           selectedOption?.is_correct === 1 || 
                           selectedOption?.is_correct === "1" ||
                           selectedOption?.is_correct === "true";

          return {
            question,
            userAnswer,
            selectedOption,
            correctOption,
            isCorrect,
          };
        });

        // Calculate score based on marks
        const totalMarks = questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);
        const obtainedMarks = detailedAnswers.reduce((sum: number, a: any) => {
          return sum + (a.isCorrect ? (a.question.marks || 0) : 0);
        }, 0);

        const stats = {
          totalQuestions: questions.length,
          answered: rawUserAnswers.length,
          correct: detailedAnswers.filter((a: any) => a.isCorrect).length,
          wrong: detailedAnswers.filter((a: any) => a.userAnswer && !a.isCorrect).length,
          unanswered: questions.length - rawUserAnswers.length,
          score: `${obtainedMarks}/${totalMarks}`,
        };

        results = { answers: detailedAnswers, stats };
        setExamResults(results);
      } catch (err: any) {
        console.error("Error fetching exam results for PDF:", err);
        
        // ✅ User-friendly error message
        const errorMessage = err.response?.data?.message || err.message || "Unknown error occurred";
        alert(`Failed to generate PDF: ${errorMessage}. Please try again or contact support.`);
        
        return; // Don't proceed with PDF generation if data fetch failed
      } finally {
        setExamResultsLoading(false);
      }
    }

    generateParticipantPdf({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      exam: {
        id: examDetails.id,
        name: examDetails.exam_name,
        date: new Date(examDetails.createdAt).toLocaleDateString(),
      },
      score: scoreDetails?.success
        ? {
            value: scoreDetails.data,
            breakdown: {
              ...scoreDetails.scoreBreakdown,
              super_proctor_feed: PDF_CONSTANTS.SUPER_PROCTOR_FEED,
              restricted_object: PDF_CONSTANTS.RESTRICTED_OBJECT,
              data_capture_interval: PDF_CONSTANTS.DATA_CAPTURE_INTERVAL,
              pause_exam_request: PDF_CONSTANTS.PAUSE_EXAM_REQUEST,
              individual_test_taker_settings:
                PDF_CONSTANTS.INDIVIDUAL_TEST_TAKER_SETTINGS,
              auto_test_abort: PDF_CONSTANTS.AUTO_TEST_ABORT,
            },
          }
        : undefined,
      examResults: results ? {
        stats: results.stats,
      } : undefined,
    });
  };

  // Function to calculate total exam duration
  const calculateExamDuration = (): string => {
    if (!attendance) {
      return "Duration not available";
    }

    try {
      // Use startTime and endTime from attendance if available
      if (attendance.startTime) {
        const startTime = new Date(attendance.startTime);
        const endTime = attendance.endTime
          ? new Date(attendance.endTime)
          : new Date();
        const durationMs = endTime.getTime() - startTime.getTime();

        if (durationMs <= 0) {
          return "Just started";
        }

        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor(
          (durationMs % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

        if (hours > 0) {
          return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds}s`;
        } else {
          return `${seconds}s`;
        }
      }

      // Fallback to createdAt if startTime is not available
      if (attendance.createdAt) {
        const startTime = new Date(attendance.createdAt);
        const endTime = new Date();
        const durationMs = endTime.getTime() - startTime.getTime();

        if (durationMs <= 0) {
          return "Just joined";
        }

        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor(
          (durationMs % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

        if (hours > 0) {
          return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          return `${minutes}m ${seconds}s`;
        } else {
          return `${seconds}s`;
        }
      }

      return "Duration not available";
    } catch (error) {
      console.error("Error calculating duration:", error);
      return "Duration not available";
    }
  };
  const [scoreDetails, setScoreDetails] = useState<ScoreDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "review" | "examResults"
  >("overview");

  // Exam Results states
  const [examResultsLoading, setExamResultsLoading] = useState(false);
  const [examResults, setExamResults] = useState<{
    answers: {
      question: any;
      userAnswer: any;
      selectedOption: any;
      correctOption: any;
      isCorrect: boolean;
    }[];
    stats: {
      totalQuestions: number;
      answered: number;
      correct: number;
      wrong: number;
      unanswered: number;
      score: string;
    };
  } | null>(null);

  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [selectedVideoCategory, setSelectedVideoCategory] =
    useState<string>("face_camera");
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videosAvailability, setVideosAvailability] = useState<{
    [key: string]: boolean;
  }>({});
  const [checkingVideoAvailability, setCheckingVideoAvailability] =
    useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Modal and tooltip state
  const [modalImage, setModalImage] = useState<{
    src: string;
    alt: string;
    timestamp: string;
    violationType: string;
  } | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    content: string;
    title: string;
    severity: string;
    x: number;
    y: number;
  }>({
    visible: false,
    content: "",
    title: "",
    severity: "",
    x: 0,
    y: 0,
  });

  // Use authenticated axios instance for this component
  const axiosInstance = createAuthenticatedAxiosInstance();

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  console.log("Base URL for video streaming:", baseUrl);

  // Debug function to test video URLs manually
  const testVideoUrl = async (category: string) => {
    if (!user || !examDetails) {
      console.log("Cannot test - missing user or exam details");
      return;
    }

    const testUrl = `${baseUrl}/api/video/stream/${user.id}/${examDetails.id}/${category}`;
    console.log(`Testing URL: ${testUrl}`);

    try {
      const response = await fetch(testUrl, {
        method: "HEAD",
      });
      if (response.status === 404) {
        console.log(
          `Test result for ${category}: Video not found (404) - this is normal if video wasn't recorded`
        );
      } else {
        console.log(
          `Test result for ${category}: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      console.error(`Test failed for ${category}:`, error);
    }
  };

  // Expose test function to window for debugging
  if (typeof window !== "undefined") {
    (window as any).testVideoUrl = testVideoUrl;
    (window as any).checkVideoAvailability = () => checkAllVideosAvailability();
    (window as any).debugVideoState = () => {
      console.log("=== VIDEO DEBUG INFO ===");
      console.log("User:", user);
      console.log("Exam Details:", examDetails);
      console.log("Videos Availability:", videosAvailability);
      console.log("Selected Category:", selectedVideoCategory);
      console.log("Checking:", checkingVideoAvailability);
      console.log("=======================");
    };
    (window as any).debugVideoStreaming = () => {
      console.log("=== Video Streaming Debug Info ===");
      console.log("Base URL:", baseUrl);
      console.log("User:", user);
      console.log("Exam Details:", examDetails);
      console.log("Videos Availability:", videosAvailability);
      console.log("Selected Video Category:", selectedVideoCategory);
      console.log("Video Loading:", videoLoading);
      console.log("Video Error:", videoError);
      console.log("==================================");
    };
  }

  // Function to check if video is available
  const checkVideoAvailability = async (category: string): Promise<boolean> => {
    if (!user || !examDetails) {
      console.log(
        `Cannot check video availability: user=${!!user}, examDetails=${!!examDetails}`
      );
      return false;
    }

    // Only check video availability on client side
    if (typeof window === "undefined") {
      return false;
    }

    try {
      // Use the video controller endpoint for checking availability
      const videoUrl = `${baseUrl}/api/video/stream/${user.id}/${examDetails.id}/${category}`;
      console.log(`Checking video availability for: ${videoUrl}`);

      const response = await axios.head(videoUrl, {
        timeout: 5000, // 5 second timeout
        validateStatus: (status) => status < 500, // Don't throw on 404
      });
      
      console.log(
        `Video availability check for ${category}: ${response.status}`
      );
      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          console.log(
            `Video not found for category ${category} (404) - this is normal if video wasn't recorded`
          );
          return false;
        }
        console.error(
          `Video availability check failed for ${category}: Status ${error.response?.status}, Message: ${error.message}`
        );
      } else {
        console.error(
          `Video availability check error for category ${category}:`,
          error
        );
      }
      return false;
    }
  };

  // Function to check all videos availability
  const checkAllVideosAvailability = async () => {
    if (!user || !examDetails) {
      console.log(
        `Cannot check videos: user=${!!user}, examDetails=${!!examDetails}`
      );
      return;
    }

    console.log(
      `Checking video availability for user ${user.id} and exam ${examDetails.id}`
    );
    setCheckingVideoAvailability(true);
    const categories = ["face_camera", "screen_recording", "third_eye"];
    const availability: { [key: string]: boolean } = {};

    for (const category of categories) {
      availability[category] = await checkVideoAvailability(category);
      console.log(`${category}: ${availability[category]}`);
    }

    console.log("Final video availability:", availability);
    console.log("✅ Video Availability Summary:");
    console.log(`  - face_camera: ${availability.face_camera}`);
    console.log(`  - screen_recording: ${availability.screen_recording}`);
    console.log(`  - third_eye: ${availability.third_eye}`);
    setVideosAvailability(availability);
    setCheckingVideoAvailability(false);

    // Auto-select first available video
    const firstAvailable = categories.find((cat) => availability[cat]);
    if (firstAvailable) {
      console.log(`Auto-selecting first available video: ${firstAvailable}`);
      setSelectedVideoCategory(firstAvailable);
    } else {
      console.log("No videos available for auto-selection");
    }
  };

  const fetchScore = async (payload: any) => {
    try {
      const token = getTokenFromCookie();
      const response = await axios.get(`${baseUrl}/getScore`, {
        params: payload,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status < 500,
      });
      return response.data;
    } catch (err) {
      console.log("Error fetching score in participant-details.tsx: ", err);
      return null;
    }
  };

  const fetchLogs = async (examId: number, attendanceData?: any) => {
    try {
      setLogsLoading(true);
      const token = getTokenFromCookie();
      const response = await axios.get<ViolationLogResponse>(
        `${baseUrl}/getLogs`,
        {
          params: { examId, userId },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 10000, // 10 second timeout
          validateStatus: (status) => status < 500,
        }
      );

      if (response.data.success) {
        const logs = response.data.data;
        console.log(logs);

        const transformedViolations: ViolationEvent[] = logs.map(
          (log, index: number) => ({
            id: log.id.toString(),
            type: log.violation_name,
            severity: getSeverityFromViolation(log.violation_name),
            description: getDescriptionFromViolation(log.violation_name),
            timestamp: log.violation_timestamp,
            details: `Violation detected at ${new Date(
              log.violation_timestamp
            ).toLocaleString()}`,
          })
        );

        const timelineEvents = createTimelineFromLogs(logs);

        setViolations(transformedViolations);
        setTimelineEvents(timelineEvents);

        const attendanceToUse = attendanceData || attendance;
        
        if (attendanceToUse?.startTime) {
          const examStartFromAttendance = new Date(attendanceToUse.startTime);
          console.log(
            "Setting exam start time from attendance.startTime (fetchLogs):",
            examStartFromAttendance.toISOString()
          );
          setExamStartTime(examStartFromAttendance);
        } else if (examDetails?.createdAt) {
          const examStartFromCreation = new Date(examDetails.createdAt);
          console.log(
            "Setting exam start time from examDetails.createdAt (fallback):",
            examStartFromCreation.toISOString()
          );
          setExamStartTime(examStartFromCreation);
        } else if (logs.length > 0) {
          const firstViolationTime = new Date(logs[0].violation_timestamp);
          console.log(
            "Setting exam start time from first violation (last resort fallback):",
            firstViolationTime.toISOString()
          );
          setExamStartTime(firstViolationTime);
        }
      }
    } catch (err) {
      console.log("Error fetching logs in participant-details.tsx: ", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchExamResults = async () => {
    if (!user || !examDetails) return;

    try {
      setExamResultsLoading(true);
      const token = getTokenFromCookie();
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;

      const questionsRes = await axios.get(
        `${base}/getExamQuestions/${examDetails.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          validateStatus: (status) => status < 500,
        }
      );

      // ✅ FIX: Use userId from router query (student's ID), not user.id (admin's ID)
      const answersRes = await axios.get(
        `${base}/exam/${examDetails.id}/student/${userId}/answers`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          validateStatus: (status) => status < 500,
        }
      );

      console.log("🔍 RAW API Response:", answersRes.data);
      console.log("🔍 answersRes.data.data:", answersRes.data.data);
      console.log("🔍 answersRes.data.data?.answers:", answersRes.data.data?.answers);

      const questions = questionsRes.data.questions || [];
      // ✅ FIX: The API returns answers directly in data.answers (from ExamAdminController.getStudentAnswers)
      const rawUserAnswers = answersRes.data.data?.answers || [];

      console.log("📊 Exam Results Debug:", {
        totalQuestions: questions.length,
        totalUserAnswers: rawUserAnswers.length,
        sampleQuestion: questions[0],
        sampleRawUserAnswer: rawUserAnswers[0]
      });

      console.log("🔍 All Questions with Options:");
      questions.forEach((q: any, idx: number) => {
        console.log(`Q${idx + 1} (ID: ${q.id}):`, {
          text: q.question_text,
          marks: q.marks,
          optionsCount: q.QuestionOptions?.length || 0,
          options: q.QuestionOptions?.map((opt: any) => ({
            id: opt.id,
            text: opt.option_text,
            is_correct: opt.is_correct,
            is_correct_type: typeof opt.is_correct,
            is_correct_raw: JSON.stringify(opt.is_correct)
          }))
        });
      });

      console.log("🔍 Raw User Answers from Database:");
      rawUserAnswers.forEach((ans: any, idx: number) => {
        console.log(`Answer ${idx + 1}:`, {
          id: ans.id,
          question_id: ans.question_id,
          option_id: ans.option_id,
          written_answer: ans.written_answer,
          selected_option: ans.selected_option,
          selected_option_details: ans.selected_option ? {
            id: ans.selected_option.id,
            text: ans.selected_option.option_text,
            is_correct: ans.selected_option.is_correct,
            is_correct_type: typeof ans.selected_option.is_correct
          } : null
        });
      });

      const detailedAnswers = questions.map((question: any) => {
        const questionOptions = Array.isArray(question.QuestionOptions)
          ? question.QuestionOptions
          : [];

        // ✅ Find the user's answer from the raw database response
        const userAnswer = rawUserAnswers.find(
          (ans: any) => ans.question_id === question.id
        );
        
        // Find the correct option for this question (where is_correct = true)
        // IMPORTANT: MySQL boolean stored as tinyint(1) - can be 1, "1", true, or "true"
        const correctOption = questionOptions.find(
          (opt: any) => {
            const isCorrectValue = opt.is_correct;
            return isCorrectValue === true || 
                   isCorrectValue === 1 || 
                   isCorrectValue === "1" || 
                   isCorrectValue === "true" ||
                   String(isCorrectValue).toLowerCase() === "true";
          }
        );
        
        console.log(`📋 Question ${question.id} - ALL Options:`, {
          questionText: question.question_text,
          totalOptions: questionOptions.length,
          allOptions: questionOptions.map((opt: any) => ({
            id: opt.id,
            text: opt.option_text?.substring(0, 40) + "...",
            is_correct: opt.is_correct,
            is_correct_type: typeof opt.is_correct,
            is_correct_value: JSON.stringify(opt.is_correct),
            is_correct_raw: opt.is_correct,
            // Test all possible truthy checks
            checks: {
              "=== true": opt.is_correct === true,
              "=== 1": opt.is_correct === 1,
              "=== '1'": opt.is_correct === "1",
              "== true": opt.is_correct == true,
              "Boolean()": Boolean(opt.is_correct)
            }
          })),
          correctOptionFound: !!correctOption,
          correctOption: correctOption ? {
            id: correctOption.id,
            text: correctOption.option_text,
            is_correct: correctOption.is_correct
          } : null
        });
        
        // ✅ CRITICAL FIX: Use option_id from UserAnswer table (not selected_option_id)
        const userSelectedOptionId = userAnswer?.option_id;  // ← Direct field from UserAnswer table!
        
        console.log(`🔍 Question ${question.id} - Finding selected option:`, {
          questionId: question.id,
          userSelectedOptionId: userSelectedOptionId,
          availableOptionIds: questionOptions.map((opt: any) => opt.id),
          userAnswerObject: userAnswer,
          hasSelectedOptionFromJoin: !!userAnswer?.selected_option
        });
        
        // Try to find the option in the question's options
        let selectedOption = userSelectedOptionId
          ? questionOptions.find(
              (opt: any) => Number(opt.id) === Number(userSelectedOptionId)
            )
          : null;
        
        // ✅ FALLBACK: If not found but we have selected_option from the backend JOIN, use it
        if (!selectedOption && userAnswer?.selected_option) {
          console.warn(`⚠️ Using selected_option from backend JOIN for Question ${question.id}`);
          selectedOption = userAnswer.selected_option;
        }
        
        console.log(`🔍 Question ${question.id} - Selected option result:`, {
          selectedOption: selectedOption,
          selectedOptionFound: !!selectedOption,
          selectedOptionText: selectedOption?.option_text,
          selectedOptionIsCorrect: selectedOption?.is_correct
        });
        
        // ⚠️ WARNING: If selectedOption is null but user has an answer, there's a data mismatch!
        if (userAnswer && userSelectedOptionId && !selectedOption) {
          console.error(`❌ DATA MISMATCH for Question ${question.id}:`, {
            error: "User selected an option that doesn't exist in this question's options",
            userSelectedOptionId: userSelectedOptionId,
            availableOptions: questionOptions.map((opt: any) => ({ id: opt.id, text: opt.option_text })),
            possibleCauses: [
              "Option was deleted after user answered",
              "Wrong option_id was saved to UserAnswers table",
              "Question's options were changed/replaced"
            ]
          });
        }
        
        // ✅ SIMPLIFIED FIX: Use is_correct directly from selected_option (already included via JOIN in backend)
        // The backend returns selected_option with is_correct, so we can directly use it
        const isCorrect = selectedOption?.is_correct === true || 
                         selectedOption?.is_correct === 1 || 
                         selectedOption?.is_correct === "1" ||
                         selectedOption?.is_correct === "true";
        
        console.log(`✅ Question ${question.id} Evaluation:`, {
          questionText: question.question_text?.substring(0, 60) + "...",
          marks: question.marks,
          userSelectedOptionId: userSelectedOptionId,
          selectedOptionText: selectedOption?.option_text?.substring(0, 60),
          selectedOption_is_correct: selectedOption?.is_correct,
          selectedOption_is_correct_type: typeof selectedOption?.is_correct,
          correctOptionText: correctOption?.option_text?.substring(0, 60),
          FINAL_isCorrect: isCorrect,
          verdict: isCorrect ? "✅ CORRECT" : "❌ WRONG"
        });

        return {
          question: {
            ...question,
            QuestionOptions: questionOptions,
          },
          userAnswer: userAnswer || null,
          selectedOption,
          correctOption,
          isCorrect,
        };
      });

      // Calculate score based on marks
      const totalMarks = questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);
      const obtainedMarks = detailedAnswers.reduce((sum: number, a: any) => {
        return sum + (a.isCorrect ? (a.question.marks || 0) : 0);
      }, 0);

      const stats = {
        totalQuestions: questions.length,
        answered: rawUserAnswers.length,
        correct: detailedAnswers.filter((a: any) => a.isCorrect).length,
        wrong: detailedAnswers.filter((a: any) => a.userAnswer && !a.isCorrect)
          .length,
        unanswered: questions.length - rawUserAnswers.length,
        score: `${obtainedMarks}/${totalMarks}`,
      };

      console.log("📊 Final Stats:", stats);
      console.log("📊 Score Details:", {
        obtainedMarks,
        totalMarks,
        scoreString: stats.score,
        percentage: totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0
      });

      setExamResults({
        answers: detailedAnswers,
        stats,
      });
    } catch (err: any) {
      console.error("Error fetching exam results:", err);
    } finally {
      setExamResultsLoading(false);
    }
  };

  // Helper function to determine severity based on violation type
  const getSeverityFromViolation = (
    violationType: string
  ): "low" | "medium" | "high" => {
    const highSeverityViolations = [
      "Multiple Persons Detected",
      "Tab Switch",
      "Unauthorized Person",
      3,
    ];
    const mediumSeverityViolations = [
      "Eye Movement Violation",
      "Head Position Violation",
      "Sound Violation",
      "Object Detected",
    ];

    if (
      highSeverityViolations.some((v) =>
        violationType.toLowerCase().includes(v.toString().toLowerCase())
      )
    ) {
      return "high";
    }
    if (
      mediumSeverityViolations.some((v) =>
        violationType.toLowerCase().includes(v.toString().toLowerCase())
      )
    ) {
      return "medium";
    }
    return "low";
  };

  const getDescriptionFromViolation = (violationType: string): string => {
    const descriptions: { [key: string]: string } = {
      "Multiple Persons Detected":
        "More than one person detected in the camera feed",
      "Eye Movement Violation": "Suspicious eye movement patterns detected",
      "Tab Switch": "Student switched to another browser tab",
      "Head Position Violation": "Improper head positioning detected",
      "Sound Violation": "Unauthorized sound detected",
      "Object Detected": "Unauthorized object detected in frame",
      "Unauthorized Person": "Unauthorized person detected in the frame",
      "Screen Sharing": "Screen sharing activity detected",
    };

    const matchingKey = Object.keys(descriptions).find((key) =>
      violationType.toLowerCase().includes(key.toLowerCase())
    );

    return matchingKey
      ? descriptions[matchingKey]
      : `${violationType} detected`;
  };

  const createTimelineFromLogs = (
    logs: ViolationLogResponse["data"]
  ): TimelineEvent[] => {
    if (logs.length === 0) return [];

    // Sort logs by timestamp
    const sortedLogs = logs.sort(
      (a, b) =>
        new Date(a.violation_timestamp).getTime() -
        new Date(b.violation_timestamp).getTime()
    );

    // Create timeline events with exact timestamps
    const timelineEvents: TimelineEvent[] = [];
    let currentScore = 100; // Start with perfect score

    // Create an event for each violation with exact timestamp
    sortedLogs.forEach((log) => {
      const violationTime = new Date(log.violation_timestamp);

      // Reduce score for this violation
      currentScore = Math.max(0, currentScore - 5); // 5 points per violation

      timelineEvents.push({
        timestamp: violationTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        score: currentScore,
        violations: [log.violation_name],
      });
    });

    return timelineEvents;
  };

  useEffect(() => {
    const fetchParticipantDetails = async () => {
      const currentExamId = getExamId();
      const currentUserId = getUserId();
      
      if (!currentExamId || !currentUserId) {
        console.log("Waiting for exam/user IDs...", { examId: currentExamId, userId: currentUserId });
        return;
      }

      try {
        setLoading(true);
        setFetchError(null);
        
        console.log("Fetching participant details for:", { examId: currentExamId, userId: currentUserId });

        // Get authentication token
        const token = getTokenFromCookie();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch exam details
        const examResponse = await axios.get(`${baseUrl}/exam/${currentExamId}`, {
          headers,
          timeout: 10000,
          validateStatus: (status) => status < 500,
        });
        
        console.log("Exam response:", examResponse.data);
        
        if (!examResponse.data || !examResponse.data.exam) {
          console.error("Invalid exam response:", examResponse);
          setFetchError("Failed to load exam details");
          return;
        }
        
        setExamDetails(examResponse.data.exam);

        // Find the specific user from exam attendances
        // Try both user.id and user_id to handle different response formats
        const attendance = examResponse.data.exam.attendances?.find(
          (att: any) => {
            const matchById = att.user?.id === parseInt(currentUserId);
            const matchByUserId = att.user_id === parseInt(currentUserId);
            console.log(`Checking attendance:`, {
              attUserId: att.user?.id,
              attUserIdField: att.user_id,
              searchingFor: currentUserId,
              searchingForParsed: parseInt(currentUserId),
              matchById,
              matchByUserId,
              userName: att.user?.name
            });
            return matchById || matchByUserId;
          }
        );

        console.log("Found attendance:", attendance);
        console.log("All attendances:", examResponse.data.exam.attendances);

        if (!attendance) {
          console.error(`Attendance not found for userId: ${currentUserId} in exam ${currentExamId}`);
          console.log("Available attendances:", examResponse.data.exam.attendances?.map((a: any) => ({ 
            userId: a.user?.id, 
            user_id: a.user_id,
            userName: a.user?.name 
          })));
          setFetchError(`Participant with ID ${currentUserId} not found in this exam`);
          setLoading(false);
          return;
        }

        if (attendance) {
          setUser(attendance.user);
          setAttendance(attendance);

          // Set exam start time from attendance startTime (when user actually started)
          if (attendance.startTime) {
            const examStartFromAttendance = new Date(attendance.startTime);
            console.log(
              "Setting exam start time from attendance startTime:",
              examStartFromAttendance.toISOString()
            );
            setExamStartTime(examStartFromAttendance);
          } else if (examResponse.data.exam.createdAt) {
            // Fallback to exam creation time if attendance startTime not available
            const examStartFromCreation = new Date(
              examResponse.data.exam.createdAt
            );
            console.log(
              "Setting exam start time from exam creation (fallback):",
              examStartFromCreation.toISOString()
            );
            setExamStartTime(examStartFromCreation);
          }

          // Fetch score details
          const scoreData = await fetchScore({
            userId: attendance.user.id,
            examId: examResponse.data.exam.id,
          });
          setScoreDetails(scoreData);

          // Fetch violation logs - pass attendance data for accurate exam start time
          await fetchLogs(examResponse.data.exam.id, attendance);

          // ✅ Fetch exam results immediately on page load
          console.log("🎓 Fetching exam results on page load...");
          try {
            setExamResultsLoading(true);
            const base = process.env.NEXT_PUBLIC_BACKEND_URL;

            const questionsRes = await axios.get(
              `${base}/getExamQuestions/${examResponse.data.exam.id}`,
              {
                headers,
                timeout: 10000,
                validateStatus: (status) => status < 500,
              }
            );

            const answersRes = await axios.get(
              `${base}/exam/${examResponse.data.exam.id}/student/${attendance.user.id}/answers`,
              {
                headers,
                timeout: 10000,
                validateStatus: (status) => status < 500,
              }
            );

            const questions = questionsRes.data.questions || [];
            const rawUserAnswers = answersRes.data.data?.answers || [];

            const detailedAnswers = questions.map((question: any) => {
              const questionOptions = Array.isArray(question.QuestionOptions)
                ? question.QuestionOptions
                : [];

              const userAnswer = rawUserAnswers.find(
                (ans: any) => ans.question_id === question.id
              );
              
              const correctOption = questionOptions.find(
                (opt: any) => {
                  const isCorrectValue = opt.is_correct;
                  return isCorrectValue === true || 
                         isCorrectValue === 1 || 
                         isCorrectValue === "1" || 
                         isCorrectValue === "true" ||
                         String(isCorrectValue).toLowerCase() === "true";
                }
              );
              
              const userSelectedOptionId = userAnswer?.option_id;
              
              let selectedOption = userSelectedOptionId
                ? questionOptions.find(
                    (opt: any) => Number(opt.id) === Number(userSelectedOptionId)
                  )
                : null;
              
              if (!selectedOption && userAnswer?.selected_option) {
                selectedOption = userAnswer.selected_option;
              }
              
              const isCorrect = selectedOption?.is_correct === true || 
                               selectedOption?.is_correct === 1 || 
                               selectedOption?.is_correct === "1" ||
                               selectedOption?.is_correct === "true";

              return {
                question: {
                  ...question,
                  QuestionOptions: questionOptions,
                },
                userAnswer: userAnswer || null,
                selectedOption,
                correctOption,
                isCorrect,
              };
            });

            const totalMarks = questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);
            const obtainedMarks = detailedAnswers.reduce((sum: number, a: any) => {
              return sum + (a.isCorrect ? (a.question.marks || 0) : 0);
            }, 0);

            const stats = {
              totalQuestions: questions.length,
              answered: rawUserAnswers.length,
              correct: detailedAnswers.filter((a: any) => a.isCorrect).length,
              wrong: detailedAnswers.filter((a: any) => a.userAnswer && !a.isCorrect).length,
              unanswered: questions.length - rawUserAnswers.length,
              score: `${obtainedMarks}/${totalMarks}`,
            };

            console.log("🎓 Exam results loaded on page load:", stats);

            setExamResults({
              answers: detailedAnswers,
              stats,
            });
          } catch (examErr) {
            console.error("Error fetching exam results on page load:", examErr);
          } finally {
            setExamResultsLoading(false);
          }

          // Check video availability after user and exam details are set
          console.log("About to check video availability...");
          console.log(
            "User:",
            attendance.user.id,
            "Exam:",
            examResponse.data.exam.id
          );

          // Call video availability check directly with the user data we just set
          const checkVideosWithUserData = async () => {
            console.log(
              `Checking video availability for user ${attendance.user.id} and exam ${examResponse.data.exam.id}`
            );
            setCheckingVideoAvailability(true);
            const categories = ["face_camera", "screen_recording", "third_eye"];
            const availability: { [key: string]: boolean } = {};

            for (const category of categories) {
              const videoUrl = `${baseUrl}/stream-video/${attendance.user.id}/${examResponse.data.exam.id}/${category}`;
              console.log(`Checking video availability for: ${videoUrl}`);

              try {
                const response = await axios.head(videoUrl);
                console.log(
                  `Video availability check for ${category}: ${response.status}`
                );
                availability[category] = response.status === 200;
              } catch (error) {
                if (axios.isAxiosError(error)) {
                  if (error.response?.status === 404) {
                    console.log(
                      `Video not found for category ${category} (404) - this is normal if video wasn't recorded`
                    );
                    availability[category] = false;
                  } else {
                    console.error(
                      `Video availability check failed for ${category}: Status ${error.response?.status}, Message: ${error.message}`
                    );
                    availability[category] = false;
                  }
                } else {
                  console.error(
                    `Video availability check error for category ${category}:`,
                    error
                  );
                  availability[category] = false;
                }
              }
              console.log(`${category}: ${availability[category]}`);
            }

            console.log("Final video availability:", availability);
            setVideosAvailability(availability);
            setCheckingVideoAvailability(false);

            // Auto-select first available video
            const firstAvailable = categories.find((cat) => availability[cat]);
            if (firstAvailable) {
              console.log(
                `Auto-selecting first available video: ${firstAvailable}`
              );
              setSelectedVideoCategory(firstAvailable);
            } else {
              console.log("No videos available for auto-selection");
            }
          };

          setTimeout(() => {
            console.log("Triggering video availability check...");
            checkVideosWithUserData();
          }, 500);
        }
      } catch (error) {
        console.error("Error fetching participant details:", error);
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
            }
            router.push("/Login");
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantDetails();
  }, [examId, userId, router, baseUrl]);

  // Additional useEffect to check video availability when user and examDetails are both available
  useEffect(() => {
    if (
      user &&
      examDetails &&
      !checkingVideoAvailability &&
      Object.keys(videosAvailability).length === 0
    ) {
      console.log("Fallback video availability check triggered");
      console.log("User ID:", user.id, "Exam ID:", examDetails.id);
      checkAllVideosAvailability();
    }
  }, [user, examDetails]);

  // Keyboard event handling for modal
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalImage) {
          closeImageModal();
        }
        if (tooltip.visible) {
          hideTooltip();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [modalImage, tooltip.visible]);

  // Fetch exam results when exam results tab is activated
  useEffect(() => {
    if (activeTab === "examResults" && !examResults && user && examDetails) {
      fetchExamResults();
    }
  }, [activeTab, user, examDetails]);

  // Calculate total violations (count only violation types that occurred, not the sum)
  const getTotalViolations = () => {
    if (!scoreDetails?.scoreBreakdown) return 0;

    const breakdown = scoreDetails.scoreBreakdown;
    let count = 0;
    
    // Only count actual violations (not settings or informational fields)
    if (breakdown.no_of_person_flagged > 0) count++;
    if (breakdown.no_person_flagged > 0) count++;
    if (breakdown.auth_face_flagged > 0) count++;
    if (breakdown.head_position_flagged > 0) count++;
    if (breakdown.eyes_flagged > 0) count++;
    if (breakdown.sound_flagged > 0) count++;
    if (breakdown.object_detected_flagged > 0) count++;
    if (breakdown.tab_switch_violation > 0) count++;
    if (breakdown.blank_feed > 0) count++;
    
    return count;
  };

  const getSeverityColor = (severity: "low" | "medium" | "high" | string) => {
    switch (severity.toLowerCase()) {
      case "low":
        return "#28a745"; // Green
      case "medium":
        return "#fd7e14"; // Orange
      case "high":
        return "#dc3545"; // Red
      default:
        return "#6c757d"; // Gray
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 30) return "var(--success-color)";
    if (score <= 60) return "var(--warning-color)";
    return "var(--error-color)";
  };

  const getScoreLabel = (score: number) => {
    if (score <= 30) return "Low Risk";
    if (score <= 60) return "Medium Risk";
    return "High Risk";
  };

  // Violation explanation data
  const getViolationExplanation = (violationType: string) => {
    const explanations: {
      [key: string]: { title: string; description: string; severity: string };
    } = {
      no_person_detected: {
        title: "No Person Detected",
        description:
          "The system could not detect a person in the camera feed. This may indicate the participant left their seat or moved out of view.",
        severity: "high",
      },
      multiple_persons: {
        title: "Multiple Persons Detected",
        description:
          "More than one person was detected in the camera feed. Only the registered participant should be visible during the exam.",
        severity: "high",
      },
      unauthorized_face: {
        title: "Unauthorized Person",
        description:
          "A face that doesn't match the registered participant was detected. This could indicate identity fraud or assistance from another person.",
        severity: "high",
      },
      suspicious_head_movement: {
        title: "Suspicious Head Movement",
        description:
          "Unusual head movements detected that may indicate looking at unauthorized materials or receiving assistance.",
        severity: "medium",
      },
      eyes_not_on_screen: {
        title: "Eyes Not on Screen",
        description:
          "The participant's gaze was directed away from the screen for an extended period, possibly looking at unauthorized materials.",
        severity: "medium",
      },
      prohibited_object: {
        title: "Prohibited Object Detected",
        description:
          "An unauthorized object such as a phone, book, or notes was detected in the exam environment.",
        severity: "high",
      },
      audio_violation: {
        title: "Audio Violation",
        description:
          "Unauthorized audio was detected, which may indicate communication with another person or use of prohibited assistance.",
        severity: "medium",
      },
      tab_switching: {
        title: "Tab Switching",
        description:
          "The participant switched to a different browser tab or application, which is prohibited during the exam.",
        severity: "high",
      },
      screen_sharing: {
        title: "Screen Sharing Detected",
        description:
          "Screen sharing software was detected, which could be used to share exam content with unauthorized persons.",
        severity: "high",
      },
      microphone_violation: {
        title: "Microphone Issue",
        description:
          "Multiple microphones detected or microphone tampering observed, which may indicate unauthorized communication.",
        severity: "medium",
      },
      browser_violation: {
        title: "Browser Security Violation",
        description:
          "The exam was not taken in the required secure browser or browser security features were bypassed.",
        severity: "high",
      },
    };

    return (
      explanations[violationType] || {
        title: "Unknown Violation",
        description:
          "An unspecified violation was detected during the exam session.",
        severity: "low",
      }
    );
  };

  // Modal and tooltip handlers
  const openImageModal = (
    imageSrc: string,
    alt: string,
    timestamp: string,
    violationType: string
  ) => {
    setModalImage({ src: imageSrc, alt, timestamp, violationType });
  };

  const closeImageModal = () => {
    setModalImage(null);
  };

  const showTooltip = (e: React.MouseEvent, violationType: string) => {
    const explanation = getViolationExplanation(violationType);
    const rect = e.currentTarget.getBoundingClientRect();

    console.log("Tooltip triggered:", {
      violationType,
      explanation,
      rect,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      windowScroll: { x: window.scrollX, y: window.scrollY },
    });

    setTooltip({
      visible: true,
      content: explanation.description,
      title: explanation.title,
      severity: explanation.severity,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const hideTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return date.toLocaleString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  const handleVideoDownload = async (category: string) => {
    if (!user || !examDetails) return;

    try {
      const token = getTokenFromCookie();
      // Use the video controller download endpoint
      const downloadUrl = `${baseUrl}/api/video/download/${user.id}/${examDetails.id}/${category}`;

      // Create a temporary link to trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute(
        "download",
        `video_${user.name}_${examDetails.exam_name}_${category}.mp4`
      );

      // Add authorization header by creating a fetch request instead
      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error("Failed to download video:", response.status);
        alert("Failed to download video. Please try again.");
      }
    } catch (error) {
      console.error("Error downloading video:", error);
      alert("Error downloading video. Please try again.");
    }
  };

  // Helper function to get relative time from exam start
  const getRelativeTimeFromExamStart = (timestamp: string): string => {
    if (!examStartTime) return "Unknown";

    try {
      const violationTime = new Date(timestamp);
      const diffInSeconds =
        (violationTime.getTime() - examStartTime.getTime()) / 1000;

      console.log("Timeline calculation:", {
        timestamp,
        violationTime: violationTime.toISOString(),
        examStartTime: examStartTime.toISOString(),
        diffInSeconds,
      });

      if (diffInSeconds < 0) return "Before exam start";

      const hours = Math.floor(diffInSeconds / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      const seconds = Math.floor(diffInSeconds % 60);

      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    } catch (error) {
      return "Unknown";
    }
  };

  // Function to seek video to specific timestamp
  const seekToTimestamp = (violationTimestamp: string) => {
    if (!examStartTime) {
      alert("Exam start time not available. Cannot seek to timestamp.");
      return;
    }

    // Check if any video is available
    const hasAvailableVideos = Object.values(videosAvailability).some(
      (available) => available
    );
    if (!hasAvailableVideos) {
      alert("No video data available for timestamp seeking.");
      return;
    }

    // Switch to review tab if not already there
    if (activeTab !== "review") {
      setActiveTab("review");
    }

    // Check if currently selected video is available
    if (!videosAvailability[selectedVideoCategory]) {
      // Find first available video and select it
      const firstAvailable = Object.keys(videosAvailability).find(
        (cat) => videosAvailability[cat]
      );
      if (firstAvailable) {
        setSelectedVideoCategory(firstAvailable);
        // Give more time for video to load before seeking
        setTimeout(() => seekToTimestamp(violationTimestamp), 2000);
        return;
      }
    }

    // Show seeking feedback
    setVideoLoading(true);
    setVideoError(null);

    try {
      const violationTime = new Date(violationTimestamp);
      const timeDifferenceInSeconds =
        (violationTime.getTime() - examStartTime.getTime()) / 1000;

      console.log("Seek Time Calculation:", {
        violationTimestamp,
        violationTime: violationTime.toISOString(),
        examStartTime: examStartTime.toISOString(),
        timeDifferenceInSeconds,
        timeDifferenceFormatted: `${Math.floor(
          timeDifferenceInSeconds / 60
        )}:${Math.floor(timeDifferenceInSeconds % 60)
          .toString()
          .padStart(2, "0")}`,
      });

      if (timeDifferenceInSeconds >= 0) {
        // Enhanced video seeking with better error handling
        const attemptSeek = (attempts = 0) => {
          if (attempts > 10) {
            setVideoLoading(false);
            alert(
              "Video not ready for seeking. Please wait for the video to load and try again."
            );
            return;
          }

          if (videoRef.current) {
            const video = videoRef.current;

            // Check if video is loaded enough to seek and has duration
            if (
              video.readyState >= 2 &&
              video.duration &&
              !isNaN(video.duration)
            ) {
              // Check if seeking to valid time within video duration
              const seekTime = Math.min(
                timeDifferenceInSeconds,
                video.duration - 1
              );

              if (seekTime >= 0) {
                video.currentTime = seekTime;
                setVideoLoading(false);

                // Scroll video into view
                const videoContainer =
                  video.closest(".videoContainer") || video;
                videoContainer.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });

                // Highlight the video briefly to indicate seeking
                video.style.border = "3px solid #3b82f6";
                setTimeout(() => {
                  video.style.border = "none";
                }, 2000);

                console.log(
                  `Successfully seeked to ${seekTime} seconds (${timeDifferenceInSeconds} requested)`,
                  {
                    seekTime,
                    seekTimeFormatted: `${Math.floor(
                      seekTime / 60
                    )}:${Math.floor(seekTime % 60)
                      .toString()
                      .padStart(2, "0")}`,
                    videoDuration: video.duration,
                    videoDurationFormatted: `${Math.floor(
                      video.duration / 60
                    )}:${Math.floor(video.duration % 60)
                      .toString()
                      .padStart(2, "0")}`,
                  }
                );
              } else {
                setVideoLoading(false);
                alert("Invalid timestamp for seeking.");
              }
            } else {
              // Video not ready, wait a bit and try again
              console.log(
                `Video not ready for seeking (attempt ${
                  attempts + 1
                }), readyState: ${video.readyState}, duration: ${
                  video.duration
                }`
              );
              setTimeout(() => attemptSeek(attempts + 1), 800);
            }
          } else {
            console.log(`Video ref not available (attempt ${attempts + 1})`);
            // Video reference not available, wait and try again
            setTimeout(() => attemptSeek(attempts + 1), 800);
          }
        };

        // Start seeking attempt after a short delay to ensure video is initialized
        setTimeout(() => attemptSeek(), 500);
      } else {
        setVideoLoading(false);
        alert("This violation occurred before the exam started.");
      }
    } catch (error) {
      console.error("Error seeking to timestamp:", error);
      setVideoLoading(false);
      alert("Error seeking to timestamp. Please try again.");
    }
  };

  // Show loading if still loading
  if (loading || logsLoading) {
    return <LoadingScreen message="Loading participant details..." />;
  }

  // Show error if we tried to fetch but failed
  if (fetchError || (!user && !loading)) {
    return (
      <ExaminerGuard>
        <div className={styles.errorContainer}>
          <h2>Participant not found</h2>
          <p style={{ color: "#64748b", marginBottom: "20px" }}>
            {fetchError || "Unable to load participant information. The participant may not exist or you may not have access."}
          </p>
          <button onClick={() => router.back()} className={styles.backButton}>
            Go Back
          </button>
        </div>
      </ExaminerGuard>
    );
  }

  if (!user || !examDetails) {
    return <LoadingScreen message="Loading participant details..." />;
  }

  return (
    <ExaminerGuard>
    <div className={styles.container}>
      <div className={styles.layoutGrid}>
        {/* LEFT SIDEBAR - Profile & Meta */}
        <aside className={styles.sidebar}>
          {/* Profile Card */}
          <div className={styles.profileCard}>
            <div className={styles.avatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h2 className={styles.userName}>{user.name}</h2>
            <p className={styles.userEmail}>{user.email}</p>
            
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>User ID</span>
                <span className={styles.metaValue}>{user.id}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Dept</span>
                <span className={styles.metaValue}>{user.dept || "N/A"}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Reg No</span>
                <span className={styles.metaValue}>{user.reg || "N/A"}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>DOB</span>
                <span className={styles.metaValue}>{user.dob || "N/A"}</span>
              </div>
            </div>

            <div style={{ marginTop: '24px', width: '100%' }}>
              <button
                onClick={handleGeneratePDF}
                className={styles.generatePdfBtn}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14,2 14,8 20,8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10,9 9,9 8,9" />
                </svg>
                Generate Report
              </button>
            </div>
          </div>

          {/* Session Timeline Card */}
          <div className={styles.examInfoCard}>
            <div className={styles.sectionHeader}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Session Timeline
            </div>
            <div className={styles.metaGrid}>
                {attendance?.createdAt && (
                  <div className={styles.metaItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span className={styles.metaLabel}>Session Joined</span>
                    <span className={styles.metaValue} style={{ fontSize: '0.85rem' }}>
                      {new Date(attendance.createdAt).toLocaleDateString()}
                    </span>
                    <span className={styles.metaValue} style={{ fontSize: '0.85rem', color: 'var(--primary-600)' }}>
                      {new Date(attendance.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {attendance?.startTime && (
                  <div className={styles.metaItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span className={styles.metaLabel}>Exam Started</span>
                    <span className={styles.metaValue} style={{ fontSize: '0.85rem' }}>
                      {new Date(attendance.startTime).toLocaleDateString()}
                    </span>
                    <span className={styles.metaValue} style={{ fontSize: '0.85rem', color: 'var(--success-text)' }}>
                      {new Date(attendance.startTime).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {attendance?.endTime && (
                  <div className={styles.metaItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span className={styles.metaLabel}>Exam Ended</span>
                    <span className={styles.metaValue} style={{ fontSize: '0.85rem' }}>
                      {new Date(attendance.endTime).toLocaleDateString()}
                    </span>
                    <span className={styles.metaValue} style={{ fontSize: '0.85rem', color: 'var(--error-text)' }}>
                      {new Date(attendance.endTime).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Total Duration</span>
                  <span className={styles.metaValue}>{calculateExamDuration()}</span>
                </div>
            </div>
          </div>

          {/* Exam Details Card */}
          <div className={styles.examInfoCard}>
            <div className={styles.sectionHeader}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Exam Details
            </div>
            <div className={styles.metaGrid}>
                <div className={styles.metaItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span className={styles.metaLabel}>Exam Name</span>
                  <span className={styles.metaValue} style={{ fontSize: '1rem' }}>{examDetails.exam_name}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Exam ID</span>
                  <span className={styles.metaValue}>{examDetails.id}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Date</span>
                  <span className={styles.metaValue}>
                    {new Date(examDetails.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Duration</span>
                  <span className={styles.metaValue}>{calculateExamDuration()}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Status</span>
                  <span className={styles.metaValue}>
                    {attendance?.endTime ? (
                      <span style={{ color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Completed
                      </span>
                    ) : (
                      <span style={{ color: 'var(--warning-text)' }}>Ongoing</span>
                    )}
                  </span>
                </div>
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT - Main Dashboard */}
        <main className={styles.mainContent}>
          {/* Top Bar */}
          <header className={styles.topBar}>
            <h1 className={styles.pageTitle}>Participant Details</h1>
            <button onClick={() => router.back()} className={styles.backButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Exam
            </button>
          </header>

          {/* Stats Overview */}
          {scoreDetails?.success && (
            <div className={styles.statsOverview}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Risk Assessment</span>
                  <span className={styles.statValue} style={{ color: getScoreColor(scoreDetails.data) }}>
                      {getScoreLabel(scoreDetails.data)}
                  </span>
                  <span className={styles.statTrend} style={{ color: getScoreColor(scoreDetails.data) }}>
                    Based on AI analysis
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Proctor Score</span>
                  <span className={styles.statValue}>
                      {scoreDetails.data}%
                  </span>
                  <span className={styles.statTrend} style={{ color: scoreDetails.data > 80 ? 'var(--success-text)' : 'var(--warning-text)' }}>
                    Trust Score
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Total Violations</span>
                  <span className={styles.statValue} style={{ color: getTotalViolations() > 0 ? 'var(--error-text)' : 'var(--text-primary)' }}>
                      {getTotalViolations()}
                  </span>
                  <span className={styles.statTrend}>
                    Detected incidents
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Exam Result</span>
                  <span className={styles.statValue}>
                      {examResults ? examResults.stats.score : "-"}
                  </span>
                  <span className={styles.statTrend}>
                     {examResults ? (
                       (() => {
                          const [obtained, total] = examResults.stats.score.split('/').map(Number);
                          const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;
                          return `${percentage}% Score`;
                        })()
                     ) : "Loading..."}
                  </span>
                </div>
            </div>
          )}

          {/* Tabs Container */}
          <div className={styles.tabsContainer}>
              <div className={styles.tabsHeader}>
                <button 
                  className={`${styles.tab} ${activeTab === "overview" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("overview")}
                >
                  Overview
                </button>
                <button 
                  className={`${styles.tab} ${activeTab === "timeline" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("timeline")}
                >
                  Timeline
                </button>
                <button 
                  className={`${styles.tab} ${activeTab === "review" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("review")}
                >
                  Video Review
                </button>
                <button 
                  className={`${styles.tab} ${activeTab === "examResults" ? styles.activeTab : ""}`}
                  onClick={() => setActiveTab("examResults")}
                >
                  Results
                </button>
              </div>

              <div className={styles.tabContent}>
                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                  <div className={styles.overviewTab}>
                    {scoreDetails?.success ? (
                      <div>
                         <h3 className={styles.sectionHeader}>Violation Breakdown</h3>
                         <div className={styles.statsOverview} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                            {scoreDetails.scoreBreakdown && Object.entries(scoreDetails.scoreBreakdown).map(([key, val]) => {
                                // Filter out non-display keys
                                if (['total_score', 'screen_sharing', 'safe_browser'].includes(key)) return null;
                                return (
                                  <div key={key} className={styles.statCard} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: '80px' }}>
                                      <span className={styles.statLabel} style={{ marginBottom: 0, textTransform: 'capitalize', flex: 1 }}>
                                        {key.replace(/_/g, ' ')}
                                      </span>
                                      <span className={styles.statValue} style={{ fontSize: '1.5rem', color: val > 0 ? 'var(--error-text)' : 'var(--text-secondary)' }}>
                                        {val}
                                      </span>
                                  </div>
                                );
                            })}
                            
                            {/* Static PDF Constants Display */}
                            <div className={styles.statCard} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: '80px' }}>
                                <span className={styles.statLabel} style={{ marginBottom: 0 }}>Super Proctor Feed</span>
                                <span className={styles.statValue} style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>{PDF_CONSTANTS.SUPER_PROCTOR_FEED}</span>
                            </div>
                            <div className={styles.statCard} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: '80px' }}>
                                <span className={styles.statLabel} style={{ marginBottom: 0 }}>Restricted Object</span>
                                <span className={styles.statValue} style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>{PDF_CONSTANTS.RESTRICTED_OBJECT}</span>
                            </div>
                            <div className={styles.statCard} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: '80px' }}>
                                <span className={styles.statLabel} style={{ marginBottom: 0 }}>Data Capture Interval</span>
                                <span className={styles.statValue} style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>{PDF_CONSTANTS.DATA_CAPTURE_INTERVAL}</span>
                            </div>
                            <div className={styles.statCard} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: '80px' }}>
                                <span className={styles.statLabel} style={{ marginBottom: 0 }}>Pause Exam Request</span>
                                <span className={styles.statValue} style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>{PDF_CONSTANTS.PAUSE_EXAM_REQUEST}</span>
                            </div>
                            <div className={styles.statCard} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: '80px' }}>
                                <span className={styles.statLabel} style={{ marginBottom: 0 }}>Individual Settings</span>
                                <span className={styles.statValue} style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>{PDF_CONSTANTS.INDIVIDUAL_TEST_TAKER_SETTINGS}</span>
                            </div>
                            <div className={styles.statCard} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: '80px' }}>
                                <span className={styles.statLabel} style={{ marginBottom: 0 }}>Auto Test Abort</span>
                                <span className={styles.statValue} style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>{PDF_CONSTANTS.AUTO_TEST_ABORT}</span>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <div className={styles.noDataMessage}>No Data Available</div>
                    )}
                  </div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === "timeline" && (
                  <div className={styles.timelineTab}>
                    {timelineEvents.length > 0 ? (
                      timelineEvents.map((event, index) => {
                         const hasViolations = event.violations.length > 0;
                         // Find exact violation date logic from original code
                         const violationDate = violations.find((v) => {
                            const violationTime = new Date(v.timestamp);
                            const violationTimeStr = violationTime.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            });
                            return violationTimeStr === event.timestamp;
                         });

                         return (
                          <div key={index} className={styles.timelineItem}>
                              <div className={styles.timelineIcon} style={{ 
                                borderColor: hasViolations ? 'var(--error-text)' : 'var(--success-text)',
                                color: hasViolations ? 'var(--error-text)' : 'var(--success-text)'
                              }}>
                                {hasViolations ? '!' : '✓'}
                              </div>
                              <div className={styles.timelineContent}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.timestamp}</span>
                                      {violationDate && (
                                         <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                           {new Date(violationDate.timestamp).toLocaleDateString()}
                                         </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Trust Score: {event.score}%</span>
                                </div>
                                
                                {hasViolations ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {event.violations.map((v, i) => (
                                          <span key={i} className={`${styles.severityTag} ${styles.severityHigh}`}>
                                            {v}
                                          </span>
                                        ))}
                                      </div>
                                      
                                      <div style={{ display: 'flex', gap: '12px' }}>
                                        <button 
                                          className={styles.btn} 
                                          style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--primary-50)', color: 'var(--primary-600)' }}
                                          onClick={() => {
                                             if (violationDate) seekToTimestamp(violationDate.timestamp);
                                          }}
                                        >
                                          ▶ Jump to Video
                                        </button>
                                        
                                        {violationDate && (
                                            <button 
                                              className={styles.btn} 
                                              style={{ fontSize: '0.8rem', padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                                              onClick={() =>
                                                openImageModal(
                                                  `/api/violation-image/${user?.id}/${examDetails?.id}/${violationDate.timestamp}`,
                                                  `Violation at ${event.timestamp}`,
                                                  event.timestamp,
                                                  event.violations[0] || "Unknown"
                                                )
                                              }
                                            >
                                              🖼 View Snapshot
                                            </button>
                                        )}
                                      </div>
                                    </div>
                                ) : (
                                    <span style={{ color: 'var(--success-text)', fontSize: '0.9rem', fontWeight: 500 }}>Clean Interval - No anomalies detected</span>
                                )}
                              </div>
                          </div>
                        );
                      })
                    ) : (
                       <div className={styles.noDataMessage}>No Timeline Data Available</div>
                    )}
                  </div>
                )}

                {/* REVIEW TAB */}
                {activeTab === "review" && (
                   <div className={styles.reviewTab}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                         <h3 className={styles.sectionHeader}>Video Playback</h3>
                         <button
                            onClick={() => checkAllVideosAvailability()}
                            className={styles.btn}
                            style={{ fontSize: '0.9rem', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                            disabled={checkingVideoAvailability}
                          >
                            {checkingVideoAvailability ? "Checking..." : "Refresh Videos"}
                          </button>
                      </div>

                      {/* Video Grid */}
                      <div className={styles.videoGrid}>
                         <VideoPlayer
                            user={user}
                            examDetails={examDetails}
                            videosAvailability={videosAvailability}
                            checkingVideoAvailability={checkingVideoAvailability}
                            videoRef={videoRef}
                            baseUrl={baseUrl}
                            onVideoDownload={handleVideoDownload}
                            category="face_camera"
                            title="Face Camera"
                            isSelected={selectedVideoCategory === "face_camera"}
                            onSelect={() => setSelectedVideoCategory("face_camera")}
                          />
                          <VideoPlayer
                            user={user}
                            examDetails={examDetails}
                            videosAvailability={videosAvailability}
                            checkingVideoAvailability={checkingVideoAvailability}
                            videoRef={videoRef}
                            baseUrl={baseUrl}
                            onVideoDownload={handleVideoDownload}
                            category="screen_recording"
                            title="Screen Recording"
                            isSelected={selectedVideoCategory === "screen_recording"}
                            onSelect={() => setSelectedVideoCategory("screen_recording")}
                          />
                          <VideoPlayer
                            user={user}
                            examDetails={examDetails}
                            videosAvailability={videosAvailability}
                            checkingVideoAvailability={checkingVideoAvailability}
                            videoRef={videoRef}
                            baseUrl={baseUrl}
                            onVideoDownload={handleVideoDownload}
                            category="third_eye"
                            title="Third Eye"
                            isSelected={selectedVideoCategory === "third_eye"}
                            onSelect={() => setSelectedVideoCategory("third_eye")}
                          />
                      </div>

                      <div style={{ marginTop: '32px' }}>
                        <h3 className={styles.sectionHeader}>Detected Violations</h3>
                        <div className={styles.violationsList}>
                           {violations.length > 0 ? violations.map(violation => (
                              <div key={violation.id} className={styles.timelineItem} onClick={() => seekToTimestamp(violation.timestamp)} style={{ cursor: 'pointer', paddingBottom: '16px' }}>
                                 <div className={styles.timelineIcon} style={{ 
                                    background: getSeverityColor(violation.severity), 
                                    color: 'white',
                                    border: 'none',
                                    fontSize: '10px'
                                  }}>
                                    {violation.severity.charAt(0).toUpperCase()}
                                 </div>
                                 <div className={styles.timelineContent} style={{ background: 'var(--bg-surface-hover)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                       <span style={{ fontWeight: 600 }}>{violation.type}</span>
                                       <span className={styles.metaLabel}>{formatTimestamp(violation.timestamp)}</span>
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{violation.description}</p>
                                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--primary-600)' }}>
                                       ▶ Click to jump to timestamp
                                    </div>
                                 </div>
                              </div>
                           )) : (
                              <div className={styles.noDataMessage}>No violations detected.</div>
                           )}
                        </div>
                      </div>
                   </div>
                )}

                {/* RESULTS TAB */}
                {activeTab === "examResults" && (
                   <div className={styles.examResultsTab}>
                      {examResultsLoading ? (
                        <div className={styles.noDataMessage}>Loading results...</div>
                      ) : examResults ? (
                         <div>
                            <div className={styles.statsOverview} style={{ marginBottom: '32px' }}>
                                <div className={styles.statCard}>
                                  <span className={styles.statLabel}>Total Questions</span>
                                  <span className={styles.statValue}>{examResults.stats.totalQuestions}</span>
                                </div>
                                <div className={styles.statCard}>
                                  <span className={styles.statLabel}>Correct</span>
                                  <span className={styles.statValue} style={{ color: 'var(--success-text)' }}>{examResults.stats.correct}</span>
                                </div>
                                <div className={styles.statCard}>
                                  <span className={styles.statLabel}>Wrong</span>
                                  <span className={styles.statValue} style={{ color: 'var(--error-text)' }}>{examResults.stats.wrong}</span>
                                </div>
                                <div className={styles.statCard}>
                                  <span className={styles.statLabel}>Unanswered</span>
                                  <span className={styles.statValue} style={{ color: 'var(--warning-text)' }}>{examResults.stats.unanswered}</span>
                                </div>
                                <div className={styles.statCard} style={{ gridColumn: '1 / -1', background: 'var(--primary-600)', color: 'white' }}>
                                  <span className={styles.statLabel} style={{ color: 'rgba(255,255,255,0.8)' }}>Total Score</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <span className={styles.statValue} style={{ color: 'white' }}>{examResults.stats.score}</span>
                                    <span style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', fontWeight: 600 }}>
                                      {(() => {
                                          const [obtained, total] = examResults.stats.score.split('/').map(Number);
                                          return total > 0 ? Math.round((obtained / total) * 100) + '%' : '0%';
                                      })()}
                                    </span>
                                  </div>
                                </div>
                            </div>

                            <h3 className={styles.sectionHeader}>Question Analysis</h3>
                            <div className={styles.questionsContainer}>
                               {examResults.answers.map((item, index) => (
                                  <div key={index} className={`${styles.questionCard} ${item.isCorrect ? styles.correct : styles.wrong}`}>
                                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                           <span style={{ 
                                             background: 'var(--bg-surface-hover)', 
                                             padding: '4px 8px', 
                                             borderRadius: '6px', 
                                             fontSize: '0.85rem', 
                                             fontWeight: 600 
                                           }}>
                                              Q{index + 1}
                                           </span>
                                           <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                              {item.isCorrect ? item.question.marks : 0} / {item.question.marks} marks
                                           </span>
                                        </div>
                                        <span className={item.isCorrect ? styles.trendGood : styles.trendBad} style={{ fontSize: '0.9rem' }}>
                                           {item.isCorrect ? '✓ Correct' : '✗ Wrong'}
                                        </span>
                                     </div>
                                     
                                     <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 500 }}>
                                        {item.question.question_text}
                                     </h4>

                                     <div className={styles.optionsList}>
                                        {item.question.QuestionOptions.map(opt => (
                                           <div key={opt.id} className={`${styles.optionItem} 
                                              ${opt.is_correct ? styles.correct : ''}
                                              ${!opt.is_correct && Number(opt.id) === Number(item.userAnswer?.option_id) ? styles.wrong : ''}
                                              ${Number(opt.id) === Number(item.userAnswer?.option_id) ? styles.selected : ''}
                                           `}>
                                              <span>{opt.option_text}</span>
                                              {Number(opt.id) === Number(item.userAnswer?.option_id) && (
                                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                                   {opt.is_correct ? '(Your Answer)' : '(Your Answer)'}
                                                </span>
                                              )}
                                           </div>
                                        ))}
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      ) : (
                         <div className={styles.noDataMessage}>No results available.</div>
                      )}
                   </div>
                )}
              </div>
          </div>
        </main>
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div className={styles.imageModal} onClick={closeImageModal}>
          <div
            className={styles.imageModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.modalCloseButton}
              onClick={closeImageModal}
              aria-label="Close modal"
            >
              ×
            </button>
            <img
              src={modalImage.src}
              alt={modalImage.alt}
              className={styles.modalImage}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.parentNode?.insertBefore(
                  document.createTextNode("Image not available"),
                  target
                );
              }}
            />
            <div className={styles.modalInfo}>
              <strong>{modalImage.violationType}</strong>
              <br />
              <small>{modalImage.timestamp}</small>
            </div>
          </div>
        </div>
      )}

      {/* Violation Tooltip */}
      {tooltip.visible && (
        <div
          className={styles.violationTooltip}
          style={{
            left: tooltip.x - 150,
            top: tooltip.y - 80,
          }}
        >
          <span className={styles.tooltipTitle}>{tooltip.title}</span>
          <div className={styles.tooltipDescription}>{tooltip.content}</div>
          <span
            className={styles.tooltipSeverity}
            style={{
              backgroundColor: getSeverityColor(tooltip.severity),
              color: "white",
            }}
          >
            {tooltip.severity} risk
          </span>
        </div>
      )}
    </div>
    </ExaminerGuard>
  );
};

export default ParticipantDetailsPage;

