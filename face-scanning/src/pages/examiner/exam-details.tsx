import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { usePost } from "../../hooks/usePost";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "../../styles/ExamDetailsPage.module.css";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Attendance {
  user_id: number;
  user: User;
}

interface ExamDetails {
  id: number;
  exam_name: string;
  key: number;
  attendances: Attendance[];
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
    total_score: number;
  };
}

const ExamDetailsPage: React.FC = () => {
  const router = useRouter();
  const { examId } = router.query;

  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [scoreDetails, setScoreDetails] = useState<ScoreDetails | null>(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [loadingScore, setLoadingScore] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);

//   const { execute: fetchScore } = usePost("/getScore");


  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://172.16.105.211:3001";

    const fetchScore = async (payload : any) => {

        setLoadingExam(true);
        const token = localStorage.getItem("token");
        let data;
        try {
            const response = await axios.post(`${baseUrl}/getScore`, payload , {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            data = response.data;
        }catch ( err ) {
            console.log("Error fetching score in exam-details.tsx: ", err);
        }
        finally {
          setLoadingExam(false);
        }

        return data;
    }


  // Fetch exam details
  useEffect(() => {
    const fetchExamDetails = async () => {
      if (!examId) return;

      try {
        setLoadingExam(true);
        const token = localStorage.getItem("token");

        const response = await axios.get(`${baseUrl}/exam/${examId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Exam details response:", response.data);

        setExamDetails(response.data.exam);
      } catch (error) {
        console.error("Error fetching exam details:", error);
        // Handle different error types
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            // Redirect to login if unauthorized
            localStorage.removeItem("token");
            router.push("/Login");
          } else if (error.response?.status === 404) {
            console.error("Exam not found");
          }
        }
      } finally {
        setLoadingExam(false);
      }
    };

    fetchExamDetails();
  }, [examId, router]);

  // Fetch user score
  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setLoadingScore(true);
    setShowScoreModal(true);

    try {
      const scoreData = await fetchScore({
        userId: user.id,
        examId: examDetails?.id,
      });


      console.log("User score data:", scoreData);

      setScoreDetails(scoreData);
    } catch (error) {
      console.error("Error fetching score:", error);
      setScoreDetails(null);
    } finally {
      setLoadingScore(false);
    }
  };

  const closeScoreModal = () => {
    setShowScoreModal(false);
    setSelectedUser(null);
    setScoreDetails(null);
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

  if (loadingExam) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingIndicator />
      </div>
    );
  }

  if (!examDetails) {
    return (
      <div className={styles.errorContainer}>
        <h2>Exam not found</h2>
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
          Back
        </button>
        <h1 className={styles.title}>Exam Details</h1>
      </div>

      {/* Exam Information Card */}
      <div className={styles.examCard}>
        <div className={styles.examHeader}>
          <div className={styles.examIcon}>📚</div>
          <div className={styles.examInfo}>
            <h2 className={styles.examTitle}>{examDetails.exam_name}</h2>
            <div className={styles.examMeta}>
              <span className={styles.examId}>ID: {examDetails.id}</span>
              <span className={styles.examKey}>Key: {examDetails.key}</span>
            </div>
          </div>
        </div>

        <div className={styles.examStats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Participants</span>
            <span className={styles.statValue}>
              {examDetails.attendances?.length || 0}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Created</span>
            <span className={styles.statValue}>
              {new Date(examDetails.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <div className={styles.participantsSection}>
        <h3 className={styles.sectionTitle}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Participants ({examDetails.attendances?.length || 0})
        </h3>

        {examDetails.attendances && examDetails.attendances.length > 0 ? (
          <div className={styles.participantsList}>
            {examDetails.attendances.map((attendance, index) => (
              <div
                key={index}
                className={styles.participantCard}
                onClick={() => handleUserClick(attendance.user)}
              >
                <div className={styles.participantAvatar}>
                  {attendance.user.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.participantInfo}>
                  <h4 className={styles.participantName}>
                    {attendance.user.name}
                  </h4>
                  <p className={styles.participantEmail}>
                    {attendance.user.email}
                  </p>
                </div>
                <div className={styles.participantAction}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  View Score
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👥</div>
            <h4 className={styles.emptyTitle}>No Participants Yet</h4>
            <p className={styles.emptyDescription}>
              Share exam key <strong>{examDetails.key}</strong> with students to
              get started
            </p>
          </div>
        )}
      </div>

      {/* Score Modal */}
      {showScoreModal && (
        <div className={styles.modal} onClick={closeScoreModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Score Details - {selectedUser?.name}
              </h3>
              <button className={styles.closeButton} onClick={closeScoreModal}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {loadingScore ? (
                <div className={styles.scoreLoading}>
                  <LoadingIndicator />
                  <span>Loading score details...</span>
                </div>
              ) : scoreDetails?.success ? (
                <div className={styles.scoreContent}>
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
                      <h4 className={styles.breakdownTitle}>
                        Detailed Breakdown
                      </h4>
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
                            No Person Detected
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
                            Eye Movement Issues
                          </span>
                          <span className={styles.breakdownValue}>
                            {scoreDetails.scoreBreakdown.eyes_flagged}
                          </span>
                        </div>
                        <div className={styles.breakdownItem}>
                          <span className={styles.breakdownLabel}>
                            Objects Detected
                          </span>
                          <span className={styles.breakdownValue}>
                            {
                              scoreDetails.scoreBreakdown
                                .object_detected_flagged
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.scoreError}>
                  <div className={styles.errorIcon}>⚠️</div>
                  <h4 className={styles.errorTitle}>No Score Data Available</h4>
                  <p className={styles.errorDescription}>
                    Score data for this participant is not yet available or the
                    exam hasn't been completed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamDetailsPage;
