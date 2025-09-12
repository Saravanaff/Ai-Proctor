import React, { useState, useEffect } from "react";
import { generateParticipantPdf } from "../../components/ParticipantPdfReport";
import { useRouter } from "next/router";
import axios from "axios";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "../../styles/ParticipantDetailsPage.module.css";
import { getTokenFromCookie } from "@/constants/AuthStore";

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
            breakdown: scoreDetails.scoreBreakdown,
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

    const firstLog = new Date(sortedLogs[0].violation_timestamp);
    const lastLog = new Date(
      sortedLogs[sortedLogs.length - 1].violation_timestamp
    );

    // Create 15-minute intervals
    const intervals: TimelineEvent[] = [];
    const intervalMinutes = 15;
    let currentTime = new Date(firstLog);
    currentTime.setMinutes(
      Math.floor(currentTime.getMinutes() / intervalMinutes) * intervalMinutes,
      0,
      0
    );

    let score = 100; // Start with perfect score

    while (currentTime <= lastLog) {
      const intervalEnd = new Date(
        currentTime.getTime() + intervalMinutes * 60000
      );

      // Find violations in this interval
      const intervalViolations = sortedLogs.filter((log) => {
        const logTime = new Date(log.violation_timestamp);
        return logTime >= currentTime && logTime < intervalEnd;
      });

      // Reduce score based on violations
      const violationPenalty = intervalViolations.length * 5; // 5 points per violation
      score = Math.max(0, score - violationPenalty);

      intervals.push({
        timestamp: currentTime.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        score,
        violations: intervalViolations.map((log) => log.violation_name),
      });

      currentTime = intervalEnd;
    }

    return intervals;
  };

  useEffect(() => {
    const fetchParticipantDetails = async () => {
      if (!examId || !userId) return;

      try {
        setLoading(true);

        // Fetch exam details
        const examResponse = await axios.get(`${baseUrl}/exam/${examId}`);
        setExamDetails(examResponse.data.exam);

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

  const VideoPlayer: React.FC<{
    category: string;
    title: string;
  }> = ({ category, title }) => {
    return (
      <div className={styles.videoCard}>
        <div className={styles.videoHeader}>
          <span className={styles.videoTitle}>{title}</span>
          <div className={styles.videoControls}>
            <button
              className={styles.downloadBtn}
              onClick={() => handleVideoDownload(category)}
            >
              Download
            </button>
          </div>
        </div>
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
          Timeline
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
            <h3 className={styles.sectionTitle} style={{ marginBottom: 12 }}>
              Performance Timeline
            </h3>
            <div className={styles.timeline}>
              {timelineEvents.length > 0 ? (
                timelineEvents.map((event, index) => {
                  // Convert "10:00" to a Date object for AM/PM formatting
                  let timeStr = event.timestamp;
                  let formattedTime = (() => {
                    // Try to parse as HH:mm
                    const [h, m] = timeStr.split(":");
                    if (!isNaN(Number(h)) && !isNaN(Number(m))) {
                      const d = new Date();
                      d.setHours(Number(h));
                      d.setMinutes(Number(m));
                      d.setSeconds(0);
                      return d.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      });
                    }
                    return timeStr;
                  })();
                  return (
                    <div
                      key={index}
                      className={styles.timelineItem}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor:
                            event.violations.length > 0
                              ? "var(--error-color)"
                              : "var(--success-color)",
                          marginRight: 12,
                          flexShrink: 0,
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
                          minWidth: 70,
                          color: "var(--text-secondary)",
                          marginRight: 10,
                        }}
                      >
                        {formattedTime}
                      </span>
                      {event.violations.length > 0 && (
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--error-color)",
                            background: "rgba(255,0,0,0.07)",
                            borderRadius: 4,
                            padding: "2px 8px",
                            marginLeft: 4,
                          }}
                        >
                          {event.violations.join(", ")}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--text-secondary)",
                    fontStyle: "italic",
                  }}
                >
                  No timeline data available. No violations recorded for this
                  exam.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Session Tab */}
        {activeTab === "review" && (
          <div className={styles.reviewTab}>
            <div className={styles.reviewHeader}>
              <h3 className={styles.sectionTitle}>Review Session</h3>
              <p className={styles.reviewDescription}>
                Download video recordings and review all violations with
                detailed timestamps
              </p>
            </div>

            {/* Video Downloads in Review Tab */}
            <div className={styles.videoSection}>
              <h4 className={styles.subsectionTitle}>Videos</h4>
              <div className={styles.videoGrid}>
                <VideoPlayer category="face_camera" title="Face Camera" />
                <VideoPlayer
                  category="screen_recording"
                  title="Screen Recording"
                />
                <VideoPlayer category="third_eye" title="Third Eye" />
              </div>
            </div>

            {/* Violations with Timestamps */}
            <div className={styles.violationsSection}>
              <h4 className={styles.subsectionTitle}>Violations</h4>
              <div className={styles.violationsList}>
                {violations.length > 0 ? (
                  violations.map((violation) => (
                    <div key={violation.id} className={styles.violationItem}>
                      <div className={styles.violationHeader}>
                        <span
                          className={styles.violationSeverity}
                          style={{
                            backgroundColor: getSeverityColor(
                              violation.severity
                            ),
                          }}
                        >
                          {violation.severity.toUpperCase()}
                        </span>
                        <span className={styles.violationType}>
                          {violation.type}
                        </span>
                        <span className={styles.violationTime}>
                          {formatTimestamp(violation.timestamp)}
                        </span>
                      </div>
                      <p className={styles.violationDescription}>
                        {violation.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "var(--text-secondary)",
                      fontStyle: "italic",
                    }}
                  >
                    No violations recorded for this exam session.
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
