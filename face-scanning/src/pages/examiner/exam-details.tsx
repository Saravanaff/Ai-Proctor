import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "../../styles/ExamDetailsPage.module.css";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { ExaminerGuard } from "@/components/guards";
interface User {
  id: number;
  name: string;
  email: string;
}

interface Attendance {
  user_id: number;
  user: User;
  startTime?: string;
  endTime?: string;
  createdAt: string;
}

interface ParticipantStats {
  userId: number;
  riskScore: number | null;
  violationCount: number;
  loading: boolean;
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
  const [participantStats, setParticipantStats] = useState<{ [key: number]: ParticipantStats }>({});
  const [searchTerm, setSearchTerm] = useState<string>("");

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Get risk label based on score (same logic as participant-details.tsx)
  const getRiskLabel = (score: number): string => {
    if (score <= 30) return "Low Risk";
    if (score <= 60) return "Medium Risk";
    return "High Risk";
  };

  // Get risk color based on score (same logic as participant-details.tsx)
  const getRiskColor = (score: number): string => {
    if (score <= 30) return "#10b981"; // Green for low risk
    if (score <= 60) return "#f59e0b"; // Orange for medium risk
    return "#ef4444"; // Red for high risk
  };

  // Calculate duration since joining
  const calculateDuration = (attendance: Attendance): string => {
    try {
      // Use startTime and endTime from attendance if available
      if (attendance.startTime) {
        const startTime = new Date(attendance.startTime);
        const endTime = attendance.endTime ? new Date(attendance.endTime) : new Date();
        const durationMs = endTime.getTime() - startTime.getTime();
        
        if (durationMs <= 0) return "Just started";

        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        // Add status indicator if exam is still ongoing
        const statusIndicator = attendance.endTime ? "" : " (ongoing)";

        if (hours > 0) {
          return `${hours}h ${minutes}m${statusIndicator}`;
        } else if (minutes > 0) {
          return `${minutes}m${statusIndicator}`;
        } else {
          return `< 1m${statusIndicator}`;
        }
      }
      
      // Fallback to createdAt if startTime is not available
      const startTime = new Date(attendance.createdAt);
      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      
      if (durationMs <= 0) return "Just joined";

      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m`;
      } else {
        return "< 1m";
      }
    } catch (error) {
      return "Unknown";
    }
  };

  // Filter participants based on search term
  const filteredParticipants = examDetails?.attendances?.filter(attendance =>
    attendance.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendance.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const fetchParticipantScore = async (userId: number, examId: number) => {
    try {
      const token = getTokenFromCookie();
      const response = await axios.get(`${baseUrl}/getScore`, {
        params: { userId, examId },
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500, // Don't throw on 404, etc.
      });
      
      // Handle different response statuses
      if (response.status === 200 && response.data?.data !== undefined) {
        return response.data.data;
      }
      
      // Score not found or not yet calculated
      return null;
    } catch (error) {
      // Only log actual network errors, not expected missing data
      if (axios.isAxiosError(error) && !error.response) {
        console.error(`Network error fetching score for user ${userId}:`, error.message);
      }
      return null;
    }
  };

  const fetchParticipantViolations = async (userId: number, examId: number) => {
    try {
      const token = getTokenFromCookie();
      const response = await axios.get(`${baseUrl}/getLogs`, {
        params: { examId, userId },
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500, // Don't throw on 404, etc.
      });
      
      // Handle different response statuses
      if (response.status === 200 && response.data?.count !== undefined) {
        return response.data.count;
      }
      
      // No violations found or not yet available
      return 0;
    } catch (error) {
      // Only log actual network errors, not expected missing data
      if (axios.isAxiosError(error) && !error.response) {
        console.error(`Network error fetching violations for user ${userId}:`, error.message);
      }
      return 0;
    }
  };

  const fetchParticipantStats = async (userId: number, examId: number) => {
    setParticipantStats(prev => ({
      ...prev,
      [userId]: { userId, riskScore: null, violationCount: 0, loading: true }
    }));

    const [backendScore, violationCount] = await Promise.all([
      fetchParticipantScore(userId, examId),
      fetchParticipantViolations(userId, examId)
    ]);

    // Use the actual backend score instead of calculating manually
    const riskScore = backendScore;

    setParticipantStats(prev => ({
      ...prev,
      [userId]: { userId, riskScore, violationCount, loading: false }
    }));
  };

  useEffect(() => {
    const fetchExamDetails = async () => {
      if (!examId) return;

      try {
        setLoadingExam(true);
        const token = getTokenFromCookie();

        const response = await axios.get(`${baseUrl}/exam/${examId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Exam details response:", response.data);

        setExamDetails(response.data.exam);
        
        // Fetch stats for each participant
        if (response.data.exam.attendances) {
          response.data.exam.attendances.forEach((attendance: Attendance) => {
            fetchParticipantStats(attendance.user.id, response.data.exam.id);
          });
        }
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
          Back
        </button>
        <h1 className={styles.title}>Exam Details</h1>
      </div>

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
          Participants ({filteredParticipants.length || 0})
        </h3>

        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search participants by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className={styles.clearSearch}
                title="Clear search"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        {filteredParticipants.length > 0 ? (
          <div className={styles.participantsList}>
            {filteredParticipants.map((attendance, index) => {
              const stats = participantStats[attendance.user.id];
              return (
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
                  <div className={styles.participantStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Attended</span>
                      <span className={styles.statValue}>
                        {calculateDuration(attendance)}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Risk</span>
                      <span 
                        className={`${styles.statValue} ${styles.riskValue}`}
                        style={{ 
                          color: stats?.riskScore !== null ? getRiskColor(stats.riskScore) : undefined 
                        }}
                      >
                        {stats?.loading ? "..." : 
                         stats?.riskScore !== null ? `${stats.riskScore}%` : "N/A"}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Violations</span>
                      <span className={`${styles.statValue} ${styles.violationValue}`}>
                        {stats?.loading ? "..." : stats?.violationCount || 0}
                      </span>
                    </div>
                  </div>
                  <div className={styles.participantAction}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchTerm ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h4 className={styles.emptyTitle}>No participants found</h4>
            <p className={styles.emptyDescription}>
              No participants match your search for "{searchTerm}". Try a different search term.
            </p>
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
    </ExaminerGuard>
  );
};

export default ExamDetailsPage;
