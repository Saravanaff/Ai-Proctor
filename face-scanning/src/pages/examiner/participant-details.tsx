import React, { useState, useEffect } from "react";
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
    total_score: number;
  };
}



const ParticipantDetailsPage: React.FC = () => {
  const router = useRouter();
  const { examId, userId } = router.query;

  const [user, setUser] = useState<User | null>(null);
  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [scoreDetails, setScoreDetails] = useState<ScoreDetails | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
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
          <div className={styles.participantInfo}>
            <h2 className={styles.participantName}>{user.name}</h2>
            <p className={styles.participantEmail}>{user.email}</p>
            <p className={styles.examName}>Exam: {examDetails.exam_name}</p>
          </div>
          {scoreDetails?.success && (
            <div
              className={styles.scoreChip}
              style={{ backgroundColor: getScoreColor(scoreDetails.data) }}
            >
              <span className={styles.scoreValue}>{scoreDetails.data}%</span>
              <span className={styles.scoreLabel}>
                {getScoreLabel(scoreDetails.data)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Video Downloads Section */}
      <div className={styles.videoDownloadsCard}>
        <h3 className={styles.sectionTitle}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7,10 12,15 17,10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download Exam Videos
        </h3>
        <div className={styles.videoDownloadGrid}>
          <div className={styles.videoDownloadItem}>
            <div className={styles.videoDownloadIcon}>📹</div>
            <div className={styles.videoDownloadInfo}>
              <h4>Face Camera Recording</h4>
              <p>Main camera feed showing participant's face during exam</p>
            </div>
            <button
              className={styles.downloadButton}
              onClick={() => handleVideoDownload("face_camera")}
            >
              ↓
            </button>
          </div>

          <div className={styles.videoDownloadItem}>
            <div className={styles.videoDownloadIcon}>🖥️</div>
            <div className={styles.videoDownloadInfo}>
              <h4>Screen Recording</h4>
              <p>Screen capture showing participant's activity during exam</p>
            </div>
            <button
              className={styles.downloadButton}
              onClick={() => handleVideoDownload("screen_recording")}
            >
              ↓
            </button>
          </div>

          <div className={styles.videoDownloadItem}>
            <div className={styles.videoDownloadIcon}>📱</div>
            <div className={styles.videoDownloadInfo}>
              <h4>Third Eye Recording</h4>
              <p>Mobile device surveillance feed for additional monitoring</p>
            </div>
            <button
              className={styles.downloadButton}
              onClick={() => handleVideoDownload("third_eye")}
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      {/* Overview Content */}
      <div className={styles.tabContent}>
        <div className={styles.overviewTab}>
          {scoreDetails?.success ? (
            <>
              <div className={styles.scoreOverview}>
                <div
                  className={styles.scoreCircle}
                  style={{ borderColor: getScoreColor(scoreDetails.data) }}
                >
                  <span
                    className={styles.scoreValue}
                    style={{ color: getScoreColor(scoreDetails.data) }}
                  >
                    {scoreDetails.data}%
                  </span>
                  <span className={styles.scoreLabel}>
                    {getScoreLabel(scoreDetails.data)}
                  </span>
                </div>
              </div>

              {scoreDetails.scoreBreakdown && (
                <div className={styles.scoreBreakdown}>
                  <h3 className={styles.breakdownTitle}>Score Breakdown</h3>
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
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noDataMessage}>
              <div className={styles.noDataIcon}>📊</div>
              <h3>No Score Data Available</h3>
              <p>
                Score data for this participant is not yet available or the
                exam hasn't been completed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantDetailsPage;
