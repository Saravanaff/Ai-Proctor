import React, { useState, useEffect, useRef } from "react";
import { generateParticipantPdf } from "../../components/ParticipantPdfReport";
import { useRouter } from "next/router";
import axios from "axios";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "../../styles/ParticipantDetailsPage.module.css";
import { getTokenFromCookie } from "@/constants/AuthStore";

// PDF Constants
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
  // PDF generation handler
  const handleGeneratePDF = () => {
    if (!user || !examDetails) return;
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
    });
  };
  const router = useRouter();
  const { examId, userId } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [scoreDetails, setScoreDetails] = useState<ScoreDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "review"
  >("overview");

  // State for violations and timeline events (populated from API)
  const [violations, setViolations] = useState<ViolationEvent[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Video player states
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

    const testUrl = `${baseUrl}/stream-video/${user.id}/${examDetails.id}/${category}`;
    console.log(`Testing URL: ${testUrl}`);

    try {
      const response = await fetch(testUrl, {
        method: "HEAD",
        headers: {
          Authorization: `Bearer ${getTokenFromCookie()}`,
        },
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

    try {
      const videoUrl = `${baseUrl}/stream-video/${user.id}/${examDetails.id}/${category}`;
      console.log(`Checking video availability for: ${videoUrl}`);

      const response = await axios.head(videoUrl);
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
      });
      return response.data;
    } catch (err) {
      console.log("Error fetching score in participant-details.tsx: ", err);
      return null;
    }
  };

  const fetchLogs = async (examId: number) => {
    try {
      setLogsLoading(true);
      const response = await axios.get<ViolationLogResponse>(
        `${baseUrl}/getLogs`,
        {
          params: { examId, userId },
        }
      );

      if (response.data.success) {
        const logs = response.data.data;
        console.log(logs);

        // Transform logs to ViolationEvent format
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

        // Create timeline events by grouping violations by time intervals
        const timelineEvents = createTimelineFromLogs(logs);

        setViolations(transformedViolations);
        setTimelineEvents(timelineEvents);

        // Set exam start time from the first log or exam creation time
        if (logs.length > 0) {
          const firstViolationTime = new Date(logs[0].violation_timestamp);
          // Assume exam started 5 minutes before first violation for safety
          setExamStartTime(
            new Date(firstViolationTime.getTime() - 5 * 60 * 1000)
          );
        } else if (examDetails) {
          setExamStartTime(new Date(examDetails.createdAt));
        }
      }
    } catch (err) {
      console.log("Error fetching logs in participant-details.tsx: ", err);
    } finally {
      setLogsLoading(false);
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

  // Helper function to get description based on violation type
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

    // Find matching description or return a generic one
    const matchingKey = Object.keys(descriptions).find((key) =>
      violationType.toLowerCase().includes(key.toLowerCase())
    );

    return matchingKey
      ? descriptions[matchingKey]
      : `${violationType} detected`;
  };

  // Helper function to create timeline events from logs
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
        const examResponse = await axios.get(`${baseUrl}/exam/${examId}`);
        setExamDetails(examResponse.data.exam);

        // Set exam start time as fallback
        if (examResponse.data.exam.createdAt) {
          setExamStartTime(new Date(examResponse.data.exam.createdAt));
        }

        // Find the specific user from exam attendances
        const attendance = examResponse.data.exam.attendances?.find(
          (att: any) => att.user.id === parseInt(userId as string)
        );

        if (attendance) {
          setUser(attendance.user);

          // Fetch score details
          const scoreData = await fetchScore({
            userId: attendance.user.id,
            examId: examResponse.data.exam.id,
          });
          setScoreDetails(scoreData);

          // Fetch violation logs
          await fetchLogs(examResponse.data.exam.id);

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
            localStorage.removeItem("token");
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

  const getSeverityColor = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "low":
        return "var(--success-color)";
      case "medium":
        return "var(--warning-color)";
      case "high":
        return "var(--error-color)";
      default:
        return "var(--text-secondary)";
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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleVideoDownload = async (category: string) => {
    if (!user || !examDetails) return;

    try {
      const token = getTokenFromCookie();
      const downloadUrl = `${baseUrl}/download-video/${user.id}/${examDetails.id}/${category}`;

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
        // Give time for video to load before seeking
        setTimeout(() => seekToTimestamp(violationTimestamp), 1000);
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

      if (timeDifferenceInSeconds >= 0) {
        // Wait for video to be ready before seeking
        const attemptSeek = () => {
          if (videoRef.current) {
            const video = videoRef.current;

            // Check if video is loaded enough to seek
            if (video.readyState >= 2) {
              // HAVE_CURRENT_DATA or higher
              video.currentTime = timeDifferenceInSeconds;
              setVideoLoading(false);

              // Scroll video into view
              video.scrollIntoView({ behavior: "smooth", block: "center" });

              // Highlight the video briefly to indicate seeking
              video.style.border = "3px solid var(--primary-color)";
              setTimeout(() => {
                video.style.border = "none";
              }, 2000);
            } else {
              // Video not ready, wait a bit and try again
              setTimeout(attemptSeek, 500);
            }
          } else {
            setVideoLoading(false);
            alert("Video player not available. Please select a video first.");
          }
        };

        attemptSeek();
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

  const VideoPlayer: React.FC<{
    category: string;
    title: string;
    isSelected?: boolean;
    onSelect?: () => void;
  }> = ({ category, title, isSelected = false, onSelect }) => {
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [showLoading, setShowLoading] = useState(false);
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset loading state when selection changes
    useEffect(() => {
      if (!isSelected) {
        setHasLoadedOnce(false);
        setVideoError(null);
        setVideoLoading(false);
        setShowLoading(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      }
    }, [isSelected]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }, []);

    if (!user || !examDetails) {
      console.log(
        `VideoPlayer: Cannot render ${category} - missing user or examDetails`
      );
      return null;
    }

    const videoStreamUrl = `${baseUrl}/stream-video/${user.id}/${examDetails.id}/${category}`;
    const isVideoAvailable = videosAvailability[category];

    console.log(
      `VideoPlayer ${category}: URL=${videoStreamUrl}, Available=${isVideoAvailable}, Selected=${isSelected}`
    );

    const handleVideoError = (event: any) => {
      setVideoLoading(false);
      setShowLoading(false);
      setHasLoadedOnce(false); // Reset on error
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Check if it's a network error (likely 404)
      const target = event.target as HTMLVideoElement;
      if (target.error) {
        switch (target.error.code) {
          case 1: // MEDIA_ERR_ABORTED
            console.log(`Video loading aborted for ${category}`);
            setVideoError("Video loading was interrupted. Please try again.");
            break;
          case 2: // MEDIA_ERR_NETWORK
            console.log(
              `Video not available for ${category} - network issue or 404`
            );
            setVideoError(
              "Video not available. This recording may not exist for this exam session."
            );
            break;
          case 3: // MEDIA_ERR_DECODE
            console.log(`Video decode error for ${category}`);
            setVideoError(
              "Video format not supported or corrupted. This video uses H.264 codec in MP4 container. Please ensure your browser supports H.264 playback or try downloading the video instead."
            );
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            console.log(`Video format not supported for ${category}`);
            setVideoError(
              "Video format not supported by your browser. This video uses H.264 codec which should be supported by modern browsers. Please update your browser (Chrome, Firefox, or Edge recommended) or try downloading the video."
            );
            break;
          default:
            console.error(`Video error for ${category}:`, target.error);
            setVideoError(
              "Failed to load video stream. The video uses H.264 codec in MP4 format. Please ensure your browser supports this format or try downloading the video instead."
            );
        }
      } else {
        console.error(`Video error for ${category}:`, event);
        setVideoError(
          "Failed to load video stream. Please check your connection or try downloading the video instead."
        );
      }
    };

    const handleVideoLoadStart = () => {
      if (isSelected && !hasLoadedOnce) {
        setVideoLoading(true);
        setVideoError(null);
        // Show loading indicator after a short delay to prevent flashing
        loadingTimeoutRef.current = setTimeout(() => {
          setShowLoading(true);
        }, 200);
        console.log(`Video load started for ${category}`);
      }
    };

    const handleVideoCanPlay = () => {
      if (isSelected) {
        setVideoLoading(false);
        setShowLoading(false);
        setHasLoadedOnce(true);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        console.log(`Video can play for ${category}`);
      }
    };

    const handleVideoWaiting = () => {
      if (isSelected && hasLoadedOnce) {
        setVideoLoading(true);
        // Only show loading for longer waits during playback
        loadingTimeoutRef.current = setTimeout(() => {
          setShowLoading(true);
        }, 500);
        console.log(`Video waiting/buffering for ${category}`);
      }
    };

    const handleVideoPlaying = () => {
      if (isSelected) {
        setVideoLoading(false);
        setShowLoading(false);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        console.log(`Video playing for ${category}`);
      }
    };

    const handleVideoLoadedData = () => {
      if (isSelected) {
        setVideoLoading(false);
        setShowLoading(false);
        setVideoError(null);
        setHasLoadedOnce(true);
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        console.log(`Video data loaded successfully for ${category}`);
      }
    };

    const handleVideoTimeUpdate = () => {
      // This can be used for real-time feedback if needed
    };

    return (
      <div
        className={`${styles.videoCard} ${
          isSelected ? styles.selectedVideo : ""
        }`}
      >
        <div className={styles.videoHeader}>
          <span className={styles.videoTitle}>{title}</span>
          <div className={styles.videoControls}>
            {checkingVideoAvailability ? (
              <span
                style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}
              >
                Checking...
              </span>
            ) : isVideoAvailable === false ? (
              <span style={{ fontSize: "0.8rem", color: "var(--error-color)" }}>
                No data available
              </span>
            ) : (
              <>
                <button
                  className={styles.selectBtn}
                  onClick={() => {
                    onSelect?.();
                    if (!isSelected) {
                      setVideoError(null);
                      setVideoLoading(false);
                      setShowLoading(false);
                      setHasLoadedOnce(false);
                    }
                  }}
                  style={{
                    backgroundColor: isSelected
                      ? "var(--primary-color)"
                      : "transparent",
                    color: isSelected ? "white" : "var(--primary-color)",
                    marginRight: "8px",
                    border: "1px solid var(--primary-color)",
                    borderRadius: "4px",
                    padding: "6px 12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  disabled={!isVideoAvailable}
                  onMouseEnter={(e) => {
                    if (!isSelected && isVideoAvailable) {
                      e.currentTarget.style.backgroundColor =
                        "var(--primary-color)";
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--primary-color)";
                    }
                  }}
                >
                  {isSelected ? "✓ Selected" : "Select"}
                </button>
                <button
                  className={styles.downloadBtn}
                  onClick={() => handleVideoDownload(category)}
                  style={{
                    backgroundColor: "var(--success-color)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px 12px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#218838";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--success-color)";
                  }}
                >
                  📥 Download
                </button>
              </>
            )}
          </div>
        </div>
        {isSelected && isVideoAvailable && (
          <div className={styles.videoContainer}>
            {showLoading && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                  background: "rgba(0,0,0,0.8)",
                  color: "white",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid transparent",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                ></div>
                {hasLoadedOnce ? "Buffering..." : "Loading video stream..."}
              </div>
            )}
            {videoError && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "var(--error-color)",
                  fontSize: "0.9rem",
                  background: "rgba(255,0,0,0.05)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,0,0,0.2)",
                }}
              >
                ⚠️ {videoError}
              </div>
            )}
            <video
              ref={videoRef}
              controls
              width="100%"
              height="350"
              onLoadStart={handleVideoLoadStart}
              onLoadedData={handleVideoLoadedData}
              onCanPlay={handleVideoCanPlay}
              onWaiting={handleVideoWaiting}
              onPlaying={handleVideoPlaying}
              onTimeUpdate={handleVideoTimeUpdate}
              onError={handleVideoError}
              style={{
                backgroundColor: "#000",
                borderRadius: "8px",
                display: videoError ? "none" : "block",
                position: "relative",
              }}
              preload="metadata"
              playsInline
              muted={false}
            >
              <source
                src={videoStreamUrl}
                type="video/mp4; codecs=avc1.64001e"
              />
              <source src={videoStreamUrl} type="video/mp4" />
              Your browser does not support the video tag or the video format.
              <br />
              <a
                href={videoStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download video file directly
              </a>
            </video>

            {/* Video Controls Info */}
            {isSelected && !videoError && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  fontStyle: "italic",
                }}
              >
                💡 Click on violations in the timeline or violations list to
                jump to specific timestamps
              </div>
            )}
          </div>
        )}
        {isSelected && isVideoAvailable === false && (
          <div className={styles.videoContainer}>
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                fontStyle: "italic",
                background: "rgba(0,0,0,0.02)",
                borderRadius: "8px",
                border: "1px dashed var(--border-color)",
              }}
            >
              <div style={{ marginBottom: "12px", fontSize: "1.5rem" }}>📹</div>
              <strong>No video data available for this category.</strong>
              <br />
              The video may not have been recorded during this exam session.
            </div>
          </div>
        )}
      </div>
    );
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
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: "8px",
            color: "white",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
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
              "0 6px 20px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 15px rgba(102, 126, 234, 0.3)";
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

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${
            activeTab === "overview" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Violations
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "timeline" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("timeline")}
        >
          Exam Activity
        </button>
        <button
          className={`${styles.tab} ${
            activeTab === "review" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("review")}
        >
          Review Session
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Overview Tab */}
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

        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className={styles.timelineTab}>
            <h3 className={styles.sectionTitle} style={{ marginBottom: 8 }}>
              📊 Exam Activity Timeline
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
              💡 <strong>Interactive Timeline:</strong> Click on any violation
              below to automatically jump to that moment in the video stream.
              <br />
              🎬 The system will switch to the Review tab and seek to the exact
              timestamp.
            </div>
            <div className={styles.timeline}>
              {timelineEvents.length > 0 ? (
                timelineEvents.map((event, index) => {
                  // Display the timestamp with seconds precision
                  let formattedTime = event.timestamp;

                  return (
                    <div
                      key={index}
                      className={styles.timelineItem}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 12,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        transition: "all 0.2s ease",
                        background:
                          event.violations.length > 0
                            ? "rgba(255,0,0,0.02)"
                            : "rgba(0,255,0,0.02)",
                        border: "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (event.violations.length > 0) {
                          e.currentTarget.style.backgroundColor =
                            "rgba(255,0,0,0.05)";
                          e.currentTarget.style.borderColor =
                            "rgba(255,0,0,0.2)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          event.violations.length > 0
                            ? "rgba(255,0,0,0.02)"
                            : "rgba(0,255,0,0.02)";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          backgroundColor:
                            event.violations.length > 0
                              ? "var(--error-color)"
                              : "var(--success-color)",
                          marginRight: 16,
                          flexShrink: 0,
                          boxShadow:
                            event.violations.length > 0
                              ? "0 0 8px rgba(255,0,0,0.3)"
                              : "0 0 8px rgba(0,255,0,0.3)",
                        }}
                        title={
                          event.violations.length > 0
                            ? `${event.violations.length} violation(s)`
                            : "No violations"
                        }
                      ></div>
                      <span
                        style={{
                          fontSize: 14,
                          minWidth: 100,
                          color: "var(--text-primary)",
                          marginRight: 16,
                          fontWeight: "500",
                          fontFamily: "monospace",
                        }}
                      >
                        🕒 {formattedTime}
                      </span>
                      {event.violations.length > 0 && (
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--error-color)",
                            background: "rgba(255,0,0,0.1)",
                            borderRadius: 6,
                            padding: "4px 12px",
                            marginLeft: 4,
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            border: "1px solid rgba(255,0,0,0.2)",
                            fontWeight: "500",
                            flex: 1,
                          }}
                          onClick={() => {
                            console.log(
                              `Timeline seeking to: ${event.timestamp}`
                            );
                            // Find the exact violation that matches this timeline event
                            const matchingViolation = violations.find((v) => {
                              const violationTime = new Date(v.timestamp);
                              const violationTimeStr =
                                violationTime.toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                });
                              return violationTimeStr === event.timestamp;
                            });

                            if (matchingViolation) {
                              seekToTimestamp(matchingViolation.timestamp);
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(255,0,0,0.2)";
                            e.currentTarget.style.transform = "scale(1.02)";
                            e.currentTarget.style.borderColor =
                              "var(--error-color)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(255,0,0,0.1)";
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.borderColor =
                              "rgba(255,0,0,0.2)";
                          }}
                          title={`Click to jump to violation: ${event.violations.join(
                            ", "
                          )}`}
                        >
                          🎬 {event.violations.join(", ")} → Jump to video
                        </span>
                      )}
                      {event.violations.length === 0 && (
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--success-color)",
                            background: "rgba(0,255,0,0.1)",
                            borderRadius: 6,
                            padding: "4px 12px",
                            marginLeft: 4,
                            border: "1px solid rgba(0,255,0,0.2)",
                            fontWeight: "500",
                            flex: 1,
                          }}
                        >
                          ✅ No violations at this time
                        </span>
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
                    📊
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
                🎬 Review Session - Live Video Streaming
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
                  📋 <strong>How to use:</strong>
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
                  {checkingVideoAvailability
                    ? "Checking..."
                    : "🔄 Refresh Videos"}
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
                    category="face_camera"
                    title="Face Camera"
                    isSelected={selectedVideoCategory === "face_camera"}
                    onSelect={() => setSelectedVideoCategory("face_camera")}
                  />
                  <VideoPlayer
                    category="screen_recording"
                    title="Screen Recording"
                    isSelected={selectedVideoCategory === "screen_recording"}
                    onSelect={() =>
                      setSelectedVideoCategory("screen_recording")
                    }
                  />
                  <VideoPlayer
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
                    📹
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
                💡 <strong>Interactive Timeline:</strong> Click on any violation
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
                            }}
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
                              🕒 {formatTimestamp(violation.timestamp)}
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
                        🎬 Click to jump to video timestamp
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
                      ✅
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
      </div>
    </div>
  );
};

export default ParticipantDetailsPage;
