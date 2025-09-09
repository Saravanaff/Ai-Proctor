import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "../../styles/ExamDetailsPage.module.css";
import { getTokenFromCookie } from "@/constants/AuthStore";
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

const ExamDetailsPage: React.FC = () => {
  const router = useRouter();
  const { examId } = router.query;

  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [loadingExam, setLoadingExam] = useState(true);

  //   const { execute: fetchScore } = usePost("/getScore");

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

  useEffect(() => {
    const fetchExamDetails = async () => {
      if (!examId) return;

      try {
        setLoadingExam(true);
        const token = localStorage.getItem("token");

        const response = await axios.get(`${baseUrl}/exam/${examId}`, {});

        console.log("Exam details response:", response.data);

        setExamDetails(response.data.exam);
      } catch (error) {
        console.error("Error fetching exam details:", error);
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
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

  const handleUserClick = async (user: User) => {
    // Navigate to participant details page
    router.push(
      `/examiner/participant-details?examId=${examDetails?.id}&userId=${user.id}`
    );
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
    </div>
  );
};

export default ExamDetailsPage;
