import React, { useState, useEffect, useRef } from "react";
import { generateParticipantPdf } from "../../components/ParticipantPdfReport";
import { useRouter } from "next/router";
import axios from "axios";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "../../styles/ParticipantDetailsPage.module.css";
import { getTokenFromCookie } from "@/constants/AuthStore";
import VideoPlayer from "../../components/VideoPlayer";
import { ExaminerGuard } from "@/components/guards";

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
  const handleGeneratePDF = async () => {
    if (!user || !examDetails) return;

    let results = examResults;
    if (!results) {
      try {
        setExamResultsLoading(true);
        
        const token = getTokenFromCookie();
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;

        const examRes = await axios.get(`${base}/exam/${examDetails.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const questions = examRes.data.questions || [];
        
        const answersRes = await axios.get(
          `${base}/exam/${examDetails.id}/student/${user.id}/answers`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const userAnswers = answersRes.data.data?.answers || [];
        
        const detailedAnswers = questions.map((question: any) => {
          const userAnswer = userAnswers.find(
            (ans: any) => ans.question_id === question.id
          );
          
          const questionOptions = Array.isArray(question.QuestionOptions)
            ? question.QuestionOptions
            : [];

          const selectedOption = questionOptions.find(
            (opt: any) => opt.id === userAnswer?.option_id
          );
          const correctOption = questionOptions.find((opt: any) => opt.is_correct);
          const isCorrect = userAnswer ? selectedOption?.is_correct || false : false;

          return {
            question,
            userAnswer,
            selectedOption,
            correctOption,
            isCorrect,
          };
        });

        const stats = {
          totalQuestions: questions.length,
          answered: userAnswers.length,
          correct: detailedAnswers.filter((a: any) => a.isCorrect).length,
          wrong: detailedAnswers.filter((a: any) => a.userAnswer && !a.isCorrect).length,
          unanswered: questions.length - userAnswers.length,
          score: scoreDetails?.data ? `${scoreDetails.data}` : "0",
        };

        results = { answers: detailedAnswers, stats };
        setExamResults(results);
      } catch (err) {
        console.error("Error fetching exam results for PDF:", err);
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
  const router = useRouter();
  const { examId, userId } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);

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

  axios.interceptors.request.use(
    (config) => {
      const token = getTokenFromCookie();
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

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
      const response = await axios.get(`${baseUrl}/getScore`, {
        params: payload,
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
      const response = await axios.get<ViolationLogResponse>(
        `${baseUrl}/getLogs`,
        {
          params: { examId, userId },
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

      const answersRes = await axios.get(
        `${base}/exam/${examDetails.id}/student/${user.id}/answers`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
          validateStatus: (status) => status < 500,
        }
      );

      const questions = questionsRes.data.questions || [];
      const userAnswers = answersRes.data.data?.answers || [];

      const detailedAnswers = questions.map((question: any) => {
        const questionOptions = Array.isArray(question.QuestionOptions)
          ? question.QuestionOptions
          : [];

        const userAnswer = userAnswers.find(
          (ans: any) => ans.question_id === question.id
        );
        const selectedOption = userAnswer
          ? questionOptions.find(
              (opt: any) => opt.id === userAnswer.option_id
            )
          : null;
        const correctOption = questionOptions.find(
          (opt: any) => opt.is_correct
        );
        const isCorrect = selectedOption?.is_correct || false;

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

      const stats = {
        totalQuestions: questions.length,
        answered: userAnswers.length,
        correct: detailedAnswers.filter((a: any) => a.isCorrect).length,
        wrong: detailedAnswers.filter((a: any) => a.userAnswer && !a.isCorrect)
          .length,
        unanswered: questions.length - userAnswers.length,
        score: scoreDetails?.data ? `${scoreDetails.data}` : "0",
      };

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
      if (!examId || !userId) return;

      try {
        setLoading(true);

        // Fetch exam details
        const examResponse = await axios.get(`${baseUrl}/exam/${examId}`, {
          timeout: 10000,
          validateStatus: (status) => status < 500,
        });
        
        if (!examResponse.data || !examResponse.data.exam) {
          console.error("Invalid exam response:", examResponse);
          return;
        }
        
        setExamDetails(examResponse.data.exam);

        // Find the specific user from exam attendances
        const attendance = examResponse.data.exam.attendances?.find(
          (att: any) => att.user.id === parseInt(userId as string)
        );

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
  }, [examId, userId, router]);

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
                video.style.border = "3px solid var(--primary-color)";
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

  if (loading || logsLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingIndicator />
      </div>
    );
  }

  if (!user || !examDetails) {
    return (
      <div className={styles.errorContainer}>
        <h2>Participant not found</h2>
        <button onClick={() => router.back()} className={styles.backButton}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <ExaminerGuard>
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Exam
        </button>
        <h1 className={styles.title}>Participant Details</h1>
      </div>

      {/* Participant Info Card */}
      <div className={styles.participantCard}>
        <div className={styles.participantHeader}>
          <div className={styles.participantAvatar}>
            {user.name.charAt(0).toUpperCase()}
          </div>

          {/* Two Column Layout for Details */}
          <div
            style={{
              display: "flex",
              gap: "40px",
              alignItems: "flex-start",
              flex: 1,
              width: "100%",
            }}
          >
            {/* Student Details Column */}
            <div
              className={styles.participantInfo}
              style={{
                flex: 1,
                maxWidth: "50%",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "18px",
                  color: "#2c3e50",
                  borderBottom: "2px solid #e9ecef",
                  paddingBottom: "8px",
                }}
              >
                Student Details
              </h3>
              <h2
                className={styles.participantName}
                style={{
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {user.name}
              </h2>
              <p className={styles.participantEmail}>{user.email}</p>
              <p className={styles.participantId}>
                <strong style={{ color: "#495057" }}>User ID:</strong>{" "}
                <span style={{ color: "#6c757d", fontWeight: "500" }}>
                  {user.id}
                </span>
              </p>
              <p className={styles.participantId}>
                <strong style={{ color: "#495057" }}>Department:</strong>{" "}
                <span style={{ color: "#6c757d", fontWeight: "500" }}>
                  {user.dept || "N/A"}
                </span>
              </p>
              <p className={styles.participantId}>
                <strong style={{ color: "#495057" }}>Date of Birth:</strong>{" "}
                <span style={{ color: "#6c757d", fontWeight: "500" }}>
                  {user.dob || "N/A"}
                </span>
              </p>
              <p className={styles.participantId}>
                <strong style={{ color: "#495057" }}>Registration No:</strong>{" "}
                <span style={{ color: "#6c757d", fontWeight: "500" }}>
                  {user.reg || "N/A"}
                </span>
              </p>

              {/* Clean Attendance Details */}
              <div
                style={{
                  marginTop: "24px",
                  paddingTop: "20px",
                  borderTop: "2px solid #e9ecef",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 20px 0",
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#2c3e50",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "18px",
                    }}
                  >
                    ⏱
                  </span>
                  Exam Timeline
                </h4>

                <div
                  style={{
                    display: "grid",
                    gap: "16px",
                  }}
                >
                  {/* Session Joined */}
                  {attendance?.createdAt && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 0",
                        borderBottom: "1px solid #f1f3f4",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "16px",
                            width: "24px",
                            textAlign: "center",
                          }}
                        >
                          <div className={styles.iconContainer}>
                            <div className={styles.phoneIcon}></div>
                          </div>
                        </span>
                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#2c3e50",
                              marginBottom: "2px",
                            }}
                          >
                            Session Joined
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6c757d",
                            }}
                          >
                            When user entered the exam room
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          {new Date(attendance.createdAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#007bff",
                            fontWeight: "500",
                          }}
                        >
                          {new Date(attendance.createdAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Exam Started */}
                  {attendance?.startTime && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 0",
                        borderBottom: "1px solid #f1f3f4",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "16px",
                            width: "24px",
                            textAlign: "center",
                          }}
                        >
                          ▶️
                        </span>
                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#2c3e50",
                              marginBottom: "2px",
                            }}
                          >
                            Exam Started
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6c757d",
                            }}
                          >
                            When user began taking the exam
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          {new Date(attendance.startTime).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#28a745",
                            fontWeight: "500",
                          }}
                        >
                          {new Date(attendance.startTime).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Exam Ended */}
                  {attendance?.endTime && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 0",
                        borderBottom: "1px solid #f1f3f4",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "16px",
                            width: "24px",
                            textAlign: "center",
                          }}
                        >
                          ⏹️
                        </span>
                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "#2c3e50",
                              marginBottom: "2px",
                            }}
                          >
                            Exam Ended
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#6c757d",
                            }}
                          >
                            When user completed the exam
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          {new Date(attendance.endTime).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#dc3545",
                            fontWeight: "500",
                          }}
                        >
                          {new Date(attendance.endTime).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Duration Summary */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 0 8px 0",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      paddingLeft: "16px",
                      paddingRight: "16px",
                      marginTop: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          width: "24px",
                          textAlign: "center",
                        }}
                      >
                        ⏳
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#2c3e50",
                            marginBottom: "2px",
                          }}
                        >
                          Total Duration
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#6c757d",
                          }}
                        >
                          {attendance?.endTime
                            ? "Exam completed"
                            : "Currently ongoing"}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "700",
                          color: "#495057",
                        }}
                      >
                        {calculateExamDuration()}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: attendance?.endTime ? "#28a745" : "#ffc107",
                          fontWeight: "500",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "4px",
                        }}
                      >
                        <span>
                          {attendance?.endTime ? (
                            <div className={styles.iconContainer}>
                              <div className={styles.checkIcon}></div>
                            </div>
                          ) : (
                            <div className={styles.iconContainer}>
                              <div className={styles.loadingIcon}></div>
                            </div>
                          )}
                        </span>
                        {attendance?.endTime ? "Completed" : "Ongoing"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Exam Details Column */}
            <div
              className={styles.examDetailsSection}
              style={{
                flex: 1,
                maxWidth: "50%",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "18px",
                  color: "#2c3e50",
                  borderBottom: "2px solid #e9ecef",
                  paddingBottom: "8px",
                }}
              >
                Exam Details
              </h3>
              <h2
                className={styles.participantName}
                style={{
                  fontSize: "2.5rem",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {examDetails.exam_name}
              </h2>
              <p className={styles.participantEmail}>
                {new Date(examDetails.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className={styles.participantId}>
                <strong style={{ color: "#495057" }}>Exam ID:</strong>{" "}
                <span style={{ color: "#6c757d", fontWeight: "500" }}>
                  {examDetails.id}
                </span>
              </p>
            </div>
          </div>

          {scoreDetails?.success && (
            <div className={styles.scoreSection}>
              <div
                className={styles.scoreChip}
                style={{ backgroundColor: getScoreColor(scoreDetails.data) }}
              >
                <span className={styles.scoreValue}>{scoreDetails.data}%</span>
                <span className={styles.scoreLabel}>
                  {getScoreLabel(scoreDetails.data)}
                </span>
              </div>
              <div className={styles.quickStats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Total Violations</span>
                  <span className={styles.statValue}>
                    {violations.length ||
                      (scoreDetails?.scoreBreakdown
                        ? Object.entries(scoreDetails.scoreBreakdown).reduce(
                            (sum, [key, val]) => {
                              if (
                                key !== "total_score" &&
                                key !== "screen_sharing" &&
                                key !== "safe_browser" &&
                                typeof val === "number"
                              ) {
                                return sum + val;
                              }
                              return sum;
                            },
                            0
                          )
                        : 0)}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Exam Score</span>
                  <span
                    className={styles.statValue}
                    style={{ 
                      color: examResults 
                        ? (examResults.stats.correct / examResults.stats.totalQuestions * 100 >= 70 
                          ? "#10b981" 
                          : examResults.stats.correct / examResults.stats.totalQuestions * 100 >= 40 
                          ? "#f59e0b" 
                          : "#ef4444")
                        : examResultsLoading 
                        ? "inherit"
                        : "#ef4444"
                    }}
                  >
                    {examResults 
                      ? `${examResults.stats.correct}/${examResults.stats.totalQuestions} (${examResults.stats.score}${examResults.stats.score.includes('%') ? '' : '%'})`
                      : examResultsLoading 
                      ? "Loading..." 
                      : "0 (0%)"}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Risk Level</span>
                  <span
                    className={styles.statValue}
                    style={{ color: getScoreColor(scoreDetails.data) }}
                  >
                    {getScoreLabel(scoreDetails.data)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate PDF Button - Bottom left section */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          margin: "30px 0",
          width: "100%",
        }}
      >
        <button
          onClick={handleGeneratePDF}
          className={styles.generatePdfButton}
          style={{
            background: "#6366f1",
            border: "none",
            borderRadius: "8px",
            color: "white",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "180px",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 20px rgba(99, 102, 241, 0.4)";
            e.currentTarget.style.background = "#4f46e5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 15px rgba(99, 102, 241, 0.3)";
            e.currentTarget.style.background = "#6366f1";
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10,9 9,9 8,9" />
          </svg>
          Generate Report
        </button>
      </div>

      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${
            activeTab === "overview" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Violations ({getTotalViolations()})
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "timeline" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("timeline")}
        >
          Violation Details
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "review" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("review")}
        >
          Review Session
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "examResults" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("examResults")}
        >
          Exam Results
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "overview" && (
          <div className={styles.overviewTab}>
            {scoreDetails?.success ? (
              <>
                {scoreDetails.scoreBreakdown && (
                  <div className={styles.scoreBreakdown}>
                    <div className={styles.breakdownGrid}>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Multiple Persons Detected
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.no_of_person_flagged}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Zero Person Detected
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.no_person_flagged}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Face Authentication Issues
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.auth_face_flagged}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Head Position Violations
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.head_position_flagged}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Eye Movement Violations
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.eyes_flagged}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Sound Violations
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.sound_flagged}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Unauthorized Devices Detected
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.object_detected_flagged}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Tab Switch Violations
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.tab_switch_violation}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Number of Microphones
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.number_of_microphone}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Mandatory Screen Sharing
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.screen_sharing
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Mandatory Safe Browser
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.safe_browser
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Desktop Apps Control
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.control_desktop_apps}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Blank Feed Incidents
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.blank_feed}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Super Proctor Feed
                        </span>
                        <span className={styles.breakdownValue}>
                          {PDF_CONSTANTS.SUPER_PROCTOR_FEED}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Restricted Object
                        </span>
                        <span className={styles.breakdownValue}>
                          {PDF_CONSTANTS.RESTRICTED_OBJECT}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Data Capture Interval
                        </span>
                        <span className={styles.breakdownValue}>
                          {PDF_CONSTANTS.DATA_CAPTURE_INTERVAL}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Pause Exam Request
                        </span>
                        <span className={styles.breakdownValue}>
                          {PDF_CONSTANTS.PAUSE_EXAM_REQUEST}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Individual Test Taker Settings
                        </span>
                        <span className={styles.breakdownValue}>
                          {PDF_CONSTANTS.INDIVIDUAL_TEST_TAKER_SETTINGS}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Blank Feed Incidents
                        </span>
                        <span className={styles.breakdownValue}>
                          {scoreDetails.scoreBreakdown.blank_feed}
                        </span>
                      </div>
                      <div className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>
                          Auto Test Abort
                        </span>
                        <span className={styles.breakdownValue}>
                          {PDF_CONSTANTS.AUTO_TEST_ABORT}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noDataMessage}>
                <div className={styles.noDataIcon}></div>
                <h3>No Score Data Available</h3>
                <p>
                  Score data for this participant is not yet available or the
                  exam hasn't been completed.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "timeline" && (
          <div className={styles.timelineTab}>
            <h3 className={styles.sectionTitle} style={{ marginBottom: 8 }}>
              <div className={styles.iconContainer}>
                <div className={styles.chartIcon}></div>
              </div>
              Exam Activity Timeline
            </h3>
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                marginBottom: 20,
                background: "rgba(0,123,255,0.05)",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(0,123,255,0.15)",
              }}
            >
              <div className={styles.iconContainer}>
                <div className={styles.infoIcon}></div>
              </div>
              <strong>Interactive Timeline:</strong> Click on any violation
              below to automatically jump to that moment in the video stream.
              <br />
              <div className={styles.iconContainer}>
                <div className={styles.playIcon}></div>
              </div>
              The system will switch to the Review tab and seek to the exact
              timestamp.
            </div>
            <div className={styles.timeline}>
              {timelineEvents.length > 0 ? (
                timelineEvents.map((event, index) => {
                  const violationDate = violations.find((v) => {
                    const violationTime = new Date(v.timestamp);
                    const violationTimeStr = violationTime.toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }
                    );
                    return violationTimeStr === event.timestamp;
                  });

                  const fullDate = violationDate
                    ? new Date(violationDate.timestamp)
                    : new Date();
                  const severity = violationDate
                    ? violationDate.severity
                    : "low";

                  const formatDate = (dateStr: string) => {
                    try {
                      if (!dateStr) {
                        return {
                          formatted: "Date N/A",
                          weekday: "Day N/A",
                        };
                      }

                      // If it's in YYYY-DD-MM format, we need to rearrange to standard format
                      if (dateStr && dateStr.includes("-")) {
                        const parts = dateStr.split("T")[0].split("-"); // Get date part only, ignore time
                        if (parts.length === 3) {
                          const year = parts[0]; // 2025
                          const day = parts[1]; // 12
                          const month = parts[2]; // 09

                          // Validate parts are numbers and in reasonable ranges
                          const yearNum = parseInt(year, 10);
                          const monthNum = parseInt(month, 10);
                          const dayNum = parseInt(day, 10);

                          if (
                            yearNum >= 1970 &&
                            yearNum <= 2100 &&
                            monthNum >= 1 &&
                            monthNum <= 12 &&
                            dayNum >= 1 &&
                            dayNum <= 31
                          ) {
                            // Create date in standard format: YYYY-MM-DD
                            const standardDate = new Date(
                              `${year}-${month}-${day}`
                            );

                            // Double-check if the date is valid
                            if (!isNaN(standardDate.getTime())) {
                              return {
                                formatted: standardDate.toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                ),
                                weekday: standardDate.toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "long",
                                  }
                                ),
                              };
                            }
                          }
                        }
                      }

                      // Fallback to standard parsing if format doesn't match
                      const date = new Date(dateStr);
                      if (!isNaN(date.getTime())) {
                        return {
                          formatted: date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }),
                          weekday: date.toLocaleDateString("en-US", {
                            weekday: "long",
                          }),
                        };
                      } else {
                        return {
                          formatted: "Date N/A",
                          weekday: "Day N/A",
                        };
                      }
                    } catch (error) {
                      // Fallback for any errors
                      return {
                        formatted: "Date N/A",
                        weekday: "Day N/A",
                      };
                    }
                  };

                  const dateInfo = formatDate(
                    violationDate
                      ? violationDate.timestamp
                      : new Date().toISOString()
                  );

                  return (
                    <div
                      key={index}
                      className={styles.timelineItem}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        marginBottom: 12,
                        padding: "12px",
                        borderRadius: "8px",
                        transition: "all 0.2s ease",
                        background: "white",
                        border:
                          event.violations.length > 0
                            ? `1px solid ${getSeverityColor(severity)}`
                            : "1px solid #e9ecef",
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.04)",
                        cursor:
                          event.violations.length > 0 ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (event.violations.length > 0 && violationDate) {
                          seekToTimestamp(violationDate.timestamp);
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (event.violations.length > 0) {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow =
                            "0 4px 12px rgba(0, 0, 0, 0.08)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 6px rgba(0, 0, 0, 0.04)";
                      }}
                    >
                      {/* Compact Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              backgroundColor:
                                event.violations.length > 0
                                  ? getSeverityColor(severity)
                                  : "#28a745",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "8px",
                                color: "white",
                                fontWeight: "bold",
                              }}
                            >
                              {event.violations.length > 0 ? "!" : "✓"}
                            </span>
                          </div>

                          <div>
                            <h4
                              style={{
                                margin: "0",
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#2c3e50",
                              }}
                            >
                              {event.violations.length > 0
                                ? `${event.violations.length} Violation${
                                    event.violations.length > 1 ? "s" : ""
                                  }`
                                : "Clean"}
                            </h4>
                          </div>
                        </div>

                        {event.violations.length > 0 && (
                          <div
                            style={{
                              background: `${getSeverityColor(severity)}15`,
                              color: getSeverityColor(severity),
                              padding: "3px 8px",
                              borderRadius: "12px",
                              fontSize: "10px",
                              fontWeight: "500",
                            }}
                          >
                            <div className={styles.iconContainer}>
                              <div className={styles.playIcon}></div>
                            </div>
                            Jump
                          </div>
                        )}
                      </div>

                      {/* Compact Date and Time Row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          marginBottom: "8px",
                          fontSize: "12px",
                          color: "#6c757d",
                        }}
                      >
                        <span>
                          <div className={styles.iconContainer}>
                            <div className={styles.calendarIcon}></div>
                          </div>
                          {dateInfo.formatted}
                        </span>
                        <span>
                          <div className={styles.iconContainer}>
                            <div className={styles.weekdayIcon}></div>
                          </div>
                          {dateInfo.weekday}
                        </span>
                        <span>
                          <div className={styles.iconContainer}>
                            <div className={styles.clockIcon}></div>
                          </div>
                          {event.timestamp}
                        </span>
                      </div>

                      {/* Compact Violation Details */}
                      {event.violations.length > 0 ? (
                        <div className={styles.violationWithImage}>
                          <div className={styles.violationContent}>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                                marginBottom: "8px",
                              }}
                            >
                              {event.violations.map((violation, vIndex) => (
                                <div
                                  key={vIndex}
                                  style={{
                                    background: `${getSeverityColor(
                                      severity
                                    )}15`,
                                    color: getSeverityColor(severity),
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: "500",
                                    border: `1px solid ${getSeverityColor(
                                      severity
                                    )}30`,
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={(e) =>
                                    showTooltip(e, violation)
                                  }
                                  onMouseLeave={hideTooltip}
                                >
                                  {violation}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Image on the right side */}
                          <div
                            className={styles.violationImageContainer}
                            onClick={() =>
                              openImageModal(
                                `/api/violation-image/${user?.id}/${examDetails?.id}/${event.timestamp}`,
                                `Violation at ${event.timestamp}`,
                                event.timestamp,
                                event.violations[0] || "Unknown"
                              )
                            }
                            title="Click to view larger image"
                          >
                            <div className={styles.imageNotFound}>
                              <div className={styles.iconContainer}>
                                <div className={styles.imageIcon}></div>
                              </div>
                              Image Not Found
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "6px",
                            background: "#e8f5e8",
                            borderRadius: "4px",
                            color: "#28a745",
                            fontSize: "12px",
                          }}
                        >
                          <div className={styles.iconContainer}>
                            <div className={styles.checkIcon}></div>
                          </div>
                          No violations
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 40px",
                    color: "var(--text-secondary)",
                    fontStyle: "italic",
                    background: "var(--card-bg)",
                    borderRadius: "12px",
                    border: "1px dashed var(--border-color)",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "16px" }}>
                    <div
                      className={styles.iconContainer}
                      style={{
                        fontSize: "2rem",
                        width: "40px",
                        height: "40px",
                      }}
                    >
                      <div
                        className={styles.chartIcon}
                        style={{ width: "32px", height: "32px" }}
                      ></div>
                    </div>
                  </div>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "var(--text-primary)",
                    }}
                  >
                    No Timeline Data Available
                  </h4>
                  <p style={{ margin: "0", fontSize: "0.9rem" }}>
                    No activity timeline recorded for this exam session.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Session Tab */}
        {activeTab === "review" && (
          <div className={styles.reviewTab}>
            <div className={styles.reviewHeader}>
              <h3 className={styles.sectionTitle}>
                <div className={styles.iconContainer}>
                  <div className={styles.videoIcon}></div>
                </div>
                Review Session - Live Video Streaming
              </h3>
              <div className={styles.reviewDescription}>
                <p
                  style={{
                    marginBottom: "8px",
                    fontSize: "1rem",
                    color: "var(--text-primary)",
                  }}
                >
                  <strong>Interactive Video Review:</strong> Stream exam
                  recordings in real-time and navigate instantly to violation
                  timestamps.
                </p>
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    background: "rgba(0,123,255,0.05)",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(0,123,255,0.15)",
                    marginBottom: "16px",
                  }}
                >
                  <div className={styles.iconContainer}>
                    <div className={styles.infoIcon}></div>
                  </div>
                  <strong>How to use:</strong>
                  <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
                    <li>Select a video category below to start streaming</li>
                    <li>
                      Click on any violation in the timeline or violations list
                      to jump to that exact moment
                    </li>
                    <li>
                      Download videos for offline review or evidence collection
                    </li>
                    <li>
                      Use standard video controls (play, pause, seek, volume,
                      fullscreen)
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Video Downloads in Review Tab */}
            <div className={styles.videoSection}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <h4 className={styles.subsectionTitle}>Videos</h4>
                <button
                  onClick={() => {
                    console.log("Manual video availability refresh triggered");
                    checkAllVideosAvailability();
                  }}
                  style={{
                    background: "var(--primary-color)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  disabled={checkingVideoAvailability}
                >
                  {checkingVideoAvailability ? (
                    "Checking..."
                  ) : (
                    <>
                      <div className={styles.refreshIcon}></div>
                      Refresh Videos
                    </>
                  )}
                </button>
              </div>
              {checkingVideoAvailability ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--text-secondary)",
                    fontStyle: "italic",
                  }}
                >
                  Checking video availability...
                  <div style={{ marginTop: "8px", fontSize: "0.8rem" }}>
                    User ID: {user?.id}, Exam ID: {examDetails?.id}
                  </div>
                </div>
              ) : Object.values(videosAvailability).some(
                  (available) => available
                ) ? (
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
                    onSelect={() =>
                      setSelectedVideoCategory("screen_recording")
                    }
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
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "60px 40px",
                    color: "var(--text-secondary)",
                    background: "var(--card-bg)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "16px" }}>
                    <div
                      className={styles.iconContainer}
                      style={{
                        fontSize: "2rem",
                        width: "40px",
                        height: "40px",
                      }}
                    >
                      <div
                        className={styles.videoIcon}
                        style={{ width: "32px", height: "32px" }}
                      ></div>
                    </div>
                  </div>
                  <h4
                    style={{
                      margin: "0 0 8px 0",
                      color: "var(--text-primary)",
                    }}
                  >
                    No Video Data Available
                  </h4>
                  <p
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "0.9rem",
                      fontStyle: "italic",
                    }}
                  >
                    No video recordings were found for this exam session.
                    <br />
                    Videos may not have been recorded or are still being
                    processed.
                  </p>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      background: "rgba(0,0,0,0.05)",
                      padding: "12px",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                    }}
                  >
                    <strong>Debug Info:</strong>
                    <br />
                    User ID: {user?.id}
                    <br />
                    Exam ID: {examDetails?.id}
                    <br />
                    Base URL: {baseUrl}
                    <br />
                    Availability Status: {JSON.stringify(videosAvailability)}
                  </div>
                </div>
              )}
            </div>

            {/* Violations with Timestamps */}
            <div className={styles.violationsSection}>
              <h4 className={styles.subsectionTitle}>
                Violations & Timeline Navigation
              </h4>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginBottom: "16px",
                  fontStyle: "italic",
                  background: "rgba(0,123,255,0.05)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(0,123,255,0.15)",
                }}
              >
                <div className={styles.iconContainer}>
                  <div className={styles.infoIcon}></div>
                </div>
                <strong>Interactive Timeline:</strong> Click on any violation
                below to automatically jump to that exact moment in the video
                stream. The video will seek to the timestamp and highlight
                briefly to confirm the navigation.
              </p>
              <div className={styles.violationsList}>
                {violations.length > 0 ? (
                  violations.map((violation, index) => (
                    <div
                      key={violation.id}
                      className={styles.violationItem}
                      onClick={() => {
                        console.log(
                          `Seeking to violation: ${violation.type} at ${violation.timestamp}`
                        );
                        seekToTimestamp(violation.timestamp);
                      }}
                      style={{
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        border: "1px solid transparent",
                        borderRadius: "8px",
                        padding: "12px",
                        marginBottom: "8px",
                        background: "var(--card-bg)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(0,123,255,0.05)";
                        e.currentTarget.style.borderColor =
                          "var(--primary-color)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(0,123,255,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--card-bg)";
                        e.currentTarget.style.borderColor = "transparent";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 4px rgba(0,0,0,0.05)";
                      }}
                      title={`Click to jump to ${
                        violation.type
                      } at ${formatTimestamp(violation.timestamp)}`}
                    >
                      <div className={styles.violationHeader}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            className={styles.violationSeverity}
                            style={{
                              backgroundColor: getSeverityColor(
                                violation.severity
                              ),
                              color: "white",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {violation.severity}
                          </span>
                          <span
                            className={styles.violationType}
                            style={{
                              fontWeight: "600",
                              color: "var(--text-primary)",
                              fontSize: "1rem",
                              cursor: "help",
                            }}
                            onMouseEnter={(e) => showTooltip(e, violation.type)}
                            onMouseLeave={hideTooltip}
                          >
                            {violation.type}
                          </span>
                          <div
                            style={{ marginLeft: "auto", textAlign: "right" }}
                          >
                            <div
                              className={styles.violationTime}
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--primary-color)",
                                fontWeight: "500",
                              }}
                            >
                              <div className={styles.iconContainer}>
                                <div className={styles.clockIcon}></div>
                              </div>
                              {formatTimestamp(violation.timestamp)}
                            </div>
                            <small
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: "0.75rem",
                                display: "block",
                                marginTop: "2px",
                              }}
                            >
                              +
                              {getRelativeTimeFromExamStart(
                                violation.timestamp
                              )}{" "}
                              from start
                            </small>
                          </div>
                        </div>
                      </div>

                      <div className={styles.violationWithImage}>
                        <div className={styles.violationContent}>
                          <p
                            className={styles.violationDescription}
                            style={{
                              margin: "8px 0 0 0",
                              color: "var(--text-secondary)",
                              fontSize: "0.9rem",
                              lineHeight: "1.4",
                            }}
                          >
                            {violation.description}
                          </p>
                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "0.8rem",
                              color: "var(--primary-color)",
                              fontWeight: "500",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <div className={styles.iconContainer}>
                              <div className={styles.playIcon}></div>
                            </div>
                            Click to jump to video timestamp
                          </div>
                        </div>

                        {/* Image on the right side */}
                        <div
                          className={styles.violationImageContainer}
                          onClick={() =>
                            openImageModal(
                              `/api/violation-image/${user?.id}/${examDetails?.id}/${violation.timestamp}`,
                              `${violation.type} at ${formatTimestamp(
                                violation.timestamp
                              )}`,
                              violation.timestamp,
                              violation.type
                            )
                          }
                          title="Click to view larger image"
                        >
                          <div className={styles.imageNotFound}>
                            <div className={styles.iconContainer}>
                              <div className={styles.imageIcon}></div>
                            </div>
                            View Image
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "60px 40px",
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                      background: "var(--card-bg)",
                      borderRadius: "12px",
                      border: "1px dashed var(--border-color)",
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "16px" }}>
                      <div
                        className={styles.iconContainer}
                        style={{
                          fontSize: "2rem",
                          width: "40px",
                          height: "40px",
                        }}
                      >
                        <div
                          className={styles.checkIcon}
                          style={{
                            width: "32px",
                            height: "32px",
                            border: "4px solid var(--success-color)",
                          }}
                        ></div>
                      </div>
                    </div>
                    <h4
                      style={{
                        margin: "0 0 8px 0",
                        color: "var(--text-primary)",
                      }}
                    >
                      No Violations Recorded
                    </h4>
                    <p style={{ margin: "0", fontSize: "0.9rem" }}>
                      Great! No violations were detected during this exam
                      session.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Exam Results Tab */}
        {activeTab === "examResults" && (
          <div className={styles.examResultsTab}>
            {examResultsLoading ? (
              <div className={styles.loadingState}>Loading exam results...</div>
            ) : examResults ? (
              <div className={styles.examResultsContent}>
                {/* Stats summary */}
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Questions</div>
                    <div className={styles.statValue}>
                      {examResults.stats.totalQuestions}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Correct</div>
                    <div className={`${styles.statValue} ${styles.correct}`}>
                      {examResults.stats.correct}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Wrong</div>
                    <div className={`${styles.statValue} ${styles.wrong}`}>
                      {examResults.stats.wrong}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Unanswered</div>
                    <div className={`${styles.statValue} ${styles.unanswered}`}>
                      {examResults.stats.unanswered}
                    </div>
                  </div>
                </div>

                {/* Questions list */}
                <div className={styles.questionsContainer}>
                  <h3 className={styles.questionsTitle}>Question Details</h3>
                  {examResults.answers.map((item, index) => (
                    <div
                      key={item.question.id}
                      className={`${styles.questionCard} ${
                        item.isCorrect
                          ? styles.correctAnswer
                          : item.userAnswer
                          ? styles.wrongAnswer
                          : styles.notAnswered
                      } theme-transition`}
                    >
                      <div className={styles.questionHeader}>
                        <span className={styles.questionNumber}>
                          Q{index + 1}
                        </span>
                        <span
                          className={`${styles.questionStatus} ${
                            item.isCorrect
                              ? styles.statusCorrect
                              : item.userAnswer
                              ? styles.statusWrong
                              : styles.statusUnanswered
                          }`}
                        >
                          {item.isCorrect
                            ? "✓ Correct"
                            : item.userAnswer
                            ? "✗ Wrong"
                            : "— Not Answered"}
                        </span>
                      </div>

                      <div className={styles.questionText}>
                        {item.question.question_text}
                      </div>

                      <div className={styles.optionsList}>
                        {item.question.QuestionOptions.map((option: any) => (
                          <div
                            key={option.id}
                            className={`${styles.optionItem} ${
                              option.is_correct
                                ? styles.correctOption
                                : option.id === item.userAnswer?.option_id
                                ? styles.selectedOption
                                : ""
                            }`}
                          >
                            <span className={styles.optionText}>
                              {option.option_text}
                            </span>
                            {option.is_correct && (
                              <span className={styles.correctBadge}>
                                ✓ Correct Answer
                              </span>
                            )}
                            {!option.is_correct &&
                              option.id === item.userAnswer?.option_id && (
                                <span className={styles.selectedBadge}>
                                  Your Answer
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
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>📝</div>
                <p>No exam results available for this participant</p>
              </div>
            )}
          </div>
        )}
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
