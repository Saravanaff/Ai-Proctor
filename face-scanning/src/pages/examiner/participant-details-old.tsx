import React, { useState } from "react";
import { generateParticipantPdf } from "../../components/ParticipantPdfReport";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "../../styles/ParticipantDetailsPage.module.css";
import VideoPlayer from "../../components/VideoPlayer";
import ParticipantHeader from "../../components/participant/ParticipantHeader";
import ViolationsOverview from "../../components/participant/ViolationsOverview";
import ViolationsTimeline from "../../components/participant/ViolationsTimeline";
import VideoReview from "../../components/participant/VideoReview";
import ViolationsList from "../../components/participant/ViolationsList";
import TooltipProvider from "../../components/participant/TooltipProvider";
import TabNavigation from "../../components/participant/TabNavigation";
import { useParticipantDetails, useTooltip } from "../../hooks";
import {
  PDF_CONSTANTS,
  calculateExamDuration,
  getTotalViolations,
} from "../../utils/participantUtils";

const ParticipantDetailsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "review">("overview");
  const tooltip = useTooltip();
  const participantDetails = useParticipantDetails();

  // Destructure all the data and methods we need
  const {
    user,
    examDetails,
    attendance,
    examStartTime,
    scoreDetails,
    violations,
    timelineEvents,
    loading,
    selectedVideoCategory,
    setSelectedVideoCategory,
    videoLoading,
    videoError,
    videosAvailability,
    checkingVideoAvailability,
    handleVideoDownload,
    seekToTimestamp,
    videoRef,
  } = participantDetails;

  // Calculate exam duration
  const calculateExamDurationForComponent = (): string => {
    return calculateExamDuration(attendance);
  };

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
              individual_test_taker_settings: PDF_CONSTANTS.INDIVIDUAL_TEST_TAKER_SETTINGS,
              auto_test_abort: PDF_CONSTANTS.AUTO_TEST_ABORT,
            },
          }
        : undefined,
    });
  };

  // Check if video data is available
  const hasVideoData = Object.values(videosAvailability).some((available) => available);

  if (loading) {
    return <LoadingIndicator />;
  }
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "review"
  >("overview");

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

  // Tooltip state
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

        // Set exam start time from exam creation time (most accurate)
        if (examDetails) {
          const examStartFromCreation = new Date(examDetails.createdAt);
          console.log(
            "Setting exam start time from examDetails.createdAt:",
            examStartFromCreation.toISOString()
          );
          setExamStartTime(examStartFromCreation);
        } else if (logs.length > 0) {
          // Fallback: use first violation time if exam details not available
          const firstViolationTime = new Date(logs[0].violation_timestamp);
          console.log(
            "Setting exam start time from first violation (fallback):",
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
        const examResponse = await axios.get(`${baseUrl}/exam/${examId}`);
        setExamDetails(examResponse.data.exam);

        // Set exam start time as fallback
        if (examResponse.data.exam.createdAt) {
          const examStartFromCreation = new Date(
            examResponse.data.exam.createdAt
          );
          console.log(
            "Setting exam start time from exam creation (fetchUserDetails):",
            examStartFromCreation.toISOString()
          );
          setExamStartTime(examStartFromCreation);
        }

        // Find the specific user from exam attendances
        const attendance = examResponse.data.exam.attendances?.find(
          (att: any) => att.user.id === parseInt(userId as string)
        );

        if (attendance) {
          setUser(attendance.user);
          setAttendance(attendance);

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

  // Keyboard event handling for tooltip
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (tooltip.visible) {
          hideTooltip();
        }
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [tooltip.visible]);

  // Calculate total violations
  const getTotalViolations = () => {
    if (!scoreDetails?.scoreBreakdown) return 0;

    const breakdown = scoreDetails.scoreBreakdown;
    return (
      (breakdown.no_of_person_flagged || 0) +
      (breakdown.no_person_flagged || 0) +
      (breakdown.auth_face_flagged || 0) +
      (breakdown.head_position_flagged || 0) +
      (breakdown.eyes_flagged || 0) +
      (breakdown.sound_flagged || 0) +
      (breakdown.object_detected_flagged || 0) +
      (breakdown.tab_switch_violation || 0) +
      (breakdown.number_of_microphone || 0) +
      (breakdown.screen_sharing ? 1 : 0) +
      (breakdown.safe_browser ? 1 : 0) +
      (breakdown.control_desktop_apps ? 1 : 0) +
      (breakdown.blank_feed || 0)
    );
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

  // Modal and tooltip handlers
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
                      background:
                        "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
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
                  fontSize: "1.8rem",
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
                  // Get detailed date information for the violation
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

                  // Parse the date correctly - format is YYYY-DD-MM (Year-Day-Month)
                  const fullDate = violationDate
                    ? new Date(violationDate.timestamp)
                    : new Date();
                  const severity = violationDate
                    ? violationDate.severity
                    : "low";

                  // Handle the custom date format YYYY-DD-MM
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
                    Material: "Dear Students, take print of your hardcopy material and UPC questions to study for UPC classed. Ensure the UPC Questions and study materials(Notes)."
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
                                  background: `${getSeverityColor(severity)}15`,
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
                                onMouseEnter={(e) => showTooltip(e, violation)}
                                onMouseLeave={hideTooltip}
                              >
                                {violation}
                              </div>
                            ))}
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
      </div>

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
  );
};

export default ParticipantDetailsPage;
