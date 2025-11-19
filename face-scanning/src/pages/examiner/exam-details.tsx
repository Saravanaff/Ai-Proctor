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
  examScore: number | null; // Actual exam score from answers
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

  const fetchParticipantExamScore = async (userId: number, examId: number) => {
    try {
      const token = getTokenFromCookie();
      
      // Fetch exam questions
      const questionsRes = await axios.get(`${baseUrl}/getExamQuestions/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500,
      });

      // Fetch user answers
      const answersRes = await axios.get(
        `${baseUrl}/exam/${examId}/student/${userId}/answers`,
        {
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (status) => status < 500,
        }
      );

      if (questionsRes.status !== 200 || answersRes.status !== 200) {
        return 0; // Return 0 if can't fetch data
      }

      const questions = questionsRes.data.questions || [];
      const userAnswers = answersRes.data.data?.answers || [];

      if (questions.length === 0) {
        return 0; // No questions means 0 score
      }

      // If no answers, score is 0
      if (userAnswers.length === 0) {
        return 0;
      }

      // Calculate score
      let correctCount = 0;
      userAnswers.forEach((answer: any) => {
        const question = questions.find((q: any) => q.id === answer.question_id);
        if (question && question.QuestionOptions) {
          const selectedOption = question.QuestionOptions.find(
            (opt: any) => opt.id === answer.option_id
          );
          if (selectedOption?.is_correct) {
            correctCount++;
          }
        }
      });

      const scorePercentage = (correctCount / questions.length) * 100;
      return Math.round(scorePercentage);
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        console.error(`Network error fetching exam score for user ${userId}:`, error.message);
      }
      return 0; // Return 0 on error
    }
  };

  const fetchParticipantStats = async (userId: number, examId: number) => {
    setParticipantStats(prev => ({
      ...prev,
      [userId]: { userId, riskScore: null, violationCount: 0, examScore: null, loading: true }
    }));

    const [backendScore, violationCount, examScore] = await Promise.all([
      fetchParticipantScore(userId, examId),
      fetchParticipantViolations(userId, examId),
      fetchParticipantExamScore(userId, examId)
    ]);

    // Use the actual backend score instead of calculating manually
    const riskScore = backendScore;

    setParticipantStats(prev => ({
      ...prev,
      [userId]: { userId, riskScore, violationCount, examScore, loading: false }
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

  // Calculate statistics
  const totalParticipants = examDetails?.attendances?.length || 0;
  const participantsWithScores = Object.values(participantStats).filter(stat => stat.riskScore !== null).length;
  const averageRiskScore = participantsWithScores > 0
    ? Object.values(participantStats)
        .filter(stat => stat.riskScore !== null)
        .reduce((sum, stat) => sum + (stat.riskScore || 0), 0) / participantsWithScores
    : 0;
  
  // Calculate average marks from actual exam scores (0 is a valid score)
  const participantsWithExamScores = Object.values(participantStats).filter(stat => !stat.loading && stat.examScore !== null).length;
  const averageMarks = participantsWithExamScores > 0
    ? Object.values(participantStats)
        .filter(stat => !stat.loading && stat.examScore !== null)
        .reduce((sum, stat) => sum + (stat.examScore || 0), 0) / participantsWithExamScores
    : 0;
  
  const totalViolations = Object.values(participantStats).reduce((sum, stat) => sum + stat.violationCount, 0);
  const highRiskCount = Object.values(participantStats).filter(stat => stat.riskScore !== null && stat.riskScore > 60).length;
  const mediumRiskCount = Object.values(participantStats).filter(stat => stat.riskScore !== null && stat.riskScore > 30 && stat.riskScore <= 60).length;
  const lowRiskCount = Object.values(participantStats).filter(stat => stat.riskScore !== null && stat.riskScore <= 30).length;

  return (
    <ExaminerGuard>
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      padding: "24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif"
    }}>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .glass-panel {
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          border: 1px solid var(--glass-border);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: "32px", animation: "slideIn 0.6s ease-out" }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            background: "var(--glass-bg)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--glass-border)",
            borderRadius: "12px",
            color: "var(--text-primary)",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            marginBottom: "20px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(-4px)";
            e.currentTarget.style.background = "var(--glass-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
            e.currentTarget.style.background = "var(--glass-bg)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="glass-panel" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px"
            }}>
              📚
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: "700",
                color: "var(--text-primary)",
                letterSpacing: "-0.02em"
              }}>
                {examDetails.exam_name}
              </h1>
              <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <span style={{ fontWeight: "500" }}>Exam ID: <strong style={{ color: "var(--text-primary)" }}>{examDetails.id}</strong></span>
                <span style={{ fontWeight: "500" }}>Access Key: <strong style={{ 
                  color: "#3b82f6",
                  background: "rgba(59, 130, 246, 0.1)",
                  padding: "2px 8px",
                  borderRadius: "6px"
                }}>{examDetails.key}</strong></span>
                <span style={{ fontWeight: "500" }}>Created: {new Date(examDetails.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
        animation: "fadeIn 0.7s ease-out 0.2s backwards"
      }}>
        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Participants
          </div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
            {totalParticipants}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Students attended
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Average Risk Score
          </div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: averageRiskScore > 60 ? "#ef4444" : averageRiskScore > 30 ? "#f59e0b" : "#10b981", marginBottom: "4px" }}>
            {participantsWithScores > 0 ? averageRiskScore.toFixed(1) : "N/A"}
            {participantsWithScores > 0 && <span style={{ fontSize: "18px" }}>%</span>}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {participantsWithScores > 0 ? `${participantsWithScores} scored` : "No scores yet"}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Average Marks
          </div>
          <div style={{ fontSize: "32px", fontWeight: "700", color: averageMarks >= 70 ? "#10b981" : averageMarks >= 40 ? "#f59e0b" : "#ef4444", marginBottom: "4px" }}>
            {participantsWithExamScores > 0 ? averageMarks.toFixed(1) : "N/A"}
            {participantsWithExamScores > 0 && <span style={{ fontSize: "18px" }}>%</span>}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {participantsWithExamScores > 0 ? `${participantsWithExamScores} students` : "No scores yet"}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Risk Distribution
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "baseline", marginTop: "8px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#ef4444" }}>{highRiskCount}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>High</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#f59e0b" }}>{mediumRiskCount}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>Medium</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#10b981" }}>{lowRiskCount}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>Low</div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Graphs Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
        gap: "16px",
        marginBottom: "32px",
        animation: "fadeIn 0.8s ease-out 0.3s backwards"
      }}>
        {/* Risk Distribution Pie Chart */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{
            margin: "0 0 20px 0",
            fontSize: "16px",
            fontWeight: "700",
            color: "var(--text-primary)"
          }}>
            Risk Level Distribution
          </h3>
          
          {participantsWithScores > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
              {/* Pie Chart */}
              <div style={{ position: "relative", width: "200px", height: "200px" }}>
                <svg width="200" height="200" viewBox="0 0 200 200" style={{ transform: "rotate(-90deg)" }}>
                  {(() => {
                    const total = participantsWithScores;
                    const radius = 80;
                    const circumference = 2 * Math.PI * radius;
                    
                    // Calculate percentages
                    const highPercent = (highRiskCount / total) * 100;
                    const mediumPercent = (mediumRiskCount / total) * 100;
                    const lowPercent = (lowRiskCount / total) * 100;
                    
                    // Calculate stroke dash values
                    const highDash = (highPercent / 100) * circumference;
                    const mediumDash = (mediumPercent / 100) * circumference;
                    const lowDash = (lowPercent / 100) * circumference;
                    
                    let currentOffset = 0;
                    
                    return (
                      <>
                        {/* Low Risk (Green) */}
                        {lowRiskCount > 0 && (
                          <circle
                            cx="100"
                            cy="100"
                            r={radius}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="40"
                            strokeDasharray={`${lowDash} ${circumference - lowDash}`}
                            strokeDashoffset={-currentOffset}
                            style={{ transition: "all 0.5s ease" }}
                          />
                        )}
                        
                        {/* Medium Risk (Orange) */}
                        {mediumRiskCount > 0 && (() => {
                          const offset = currentOffset;
                          currentOffset += lowDash;
                          return (
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke="#f59e0b"
                              strokeWidth="40"
                              strokeDasharray={`${mediumDash} ${circumference - mediumDash}`}
                              strokeDashoffset={-currentOffset}
                              style={{ transition: "all 0.5s ease" }}
                            />
                          );
                        })()}
                        
                        {/* High Risk (Red) */}
                        {highRiskCount > 0 && (() => {
                          currentOffset += mediumDash;
                          return (
                            <circle
                              cx="100"
                              cy="100"
                              r={radius}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="40"
                              strokeDasharray={`${highDash} ${circumference - highDash}`}
                              strokeDashoffset={-currentOffset}
                              style={{ transition: "all 0.5s ease" }}
                            />
                          );
                        })()}
                        
                        {/* Center circle for donut effect */}
                        <circle cx="100" cy="100" r="55" fill="#ffffff" />
                      </>
                    );
                  })()}
                </svg>
                
                {/* Center text */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  zIndex: 10
                }}>
                  <div style={{ fontSize: "32px", fontWeight: "700", color: "#1f2937", textShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                    {participantsWithScores}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px", fontWeight: "600" }}>
                    Students
                  </div>
                </div>
              </div>
              
              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#10b981" }}></div>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Low Risk</span>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {lowRiskCount} ({participantsWithScores > 0 ? ((lowRiskCount / participantsWithScores) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#f59e0b" }}></div>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Medium Risk</span>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {mediumRiskCount} ({participantsWithScores > 0 ? ((mediumRiskCount / participantsWithScores) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#ef4444" }}></div>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>High Risk</span>
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {highRiskCount} ({participantsWithScores > 0 ? ((highRiskCount / participantsWithScores) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>📊</div>
              <p style={{ margin: 0, fontSize: "14px" }}>No risk data available yet</p>
            </div>
          )}
        </div>

        {/* Performance Bar Chart */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{
            margin: "0 0 20px 0",
            fontSize: "16px",
            fontWeight: "700",
            color: "var(--text-primary)"
          }}>
            Score Performance Chart
          </h3>
          
          {participantsWithExamScores > 0 ? (() => {
            // Calculate score ranges
            const excellentCount = Object.values(participantStats).filter(s => !s.loading && s.examScore !== null && s.examScore >= 80).length;
            const goodCount = Object.values(participantStats).filter(s => !s.loading && s.examScore !== null && s.examScore >= 60 && s.examScore < 80).length;
            const averageCount = Object.values(participantStats).filter(s => !s.loading && s.examScore !== null && s.examScore >= 40 && s.examScore < 60).length;
            const poorCount = Object.values(participantStats).filter(s => !s.loading && s.examScore !== null && s.examScore < 40).length;
            
            const maxCount = Math.max(excellentCount, goodCount, averageCount, poorCount, 1);
            
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Bar Chart */}
                <div style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                  height: "200px",
                  gap: "12px",
                  padding: "30px 10px 0"
                }}>
                  {/* Excellent Bar */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#000", minHeight: "20px" }}>
                      {participantsWithExamScores > 0 ? ((excellentCount / participantsWithExamScores) * 100).toFixed(0) : 0}%
                    </div>
                    <div style={{
                      width: "100%",
                      height: `${(excellentCount / maxCount) * 140}px`,
                      minHeight: excellentCount > 0 ? "30px" : "0px",
                      background: "linear-gradient(180deg, #10b981 0%, #059669 100%)",
                      borderRadius: "8px 8px 0 0",
                      transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      boxShadow: "0 -4px 12px rgba(16, 185, 129, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <div style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                      }}>
                        {excellentCount}
                      </div>
                    </div>
                    <div style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#333",
                      textAlign: "center",
                      marginTop: "8px"
                    }}>
                      Excellent<br/>(80-100%)
                    </div>
                  </div>
                  
                  {/* Good Bar */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#000", minHeight: "20px" }}>
                      {participantsWithExamScores > 0 ? ((goodCount / participantsWithExamScores) * 100).toFixed(0) : 0}%
                    </div>
                    <div style={{
                      width: "100%",
                      height: `${(goodCount / maxCount) * 140}px`,
                      minHeight: goodCount > 0 ? "30px" : "0px",
                      background: "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                      borderRadius: "8px 8px 0 0",
                      transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      boxShadow: "0 -4px 12px rgba(59, 130, 246, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <div style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                      }}>
                        {goodCount}
                      </div>
                    </div>
                    <div style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#333",
                      textAlign: "center",
                      marginTop: "8px"
                    }}>
                      Good<br/>(60-79%)
                    </div>
                  </div>
                  
                  {/* Average Bar */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#000", minHeight: "20px" }}>
                      {participantsWithExamScores > 0 ? ((averageCount / participantsWithExamScores) * 100).toFixed(0) : 0}%
                    </div>
                    <div style={{
                      width: "100%",
                      height: `${(averageCount / maxCount) * 140}px`,
                      minHeight: averageCount > 0 ? "30px" : "0px",
                      background: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
                      borderRadius: "8px 8px 0 0",
                      transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      boxShadow: "0 -4px 12px rgba(245, 158, 11, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <div style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                      }}>
                        {averageCount}
                      </div>
                    </div>
                    <div style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#333",
                      textAlign: "center",
                      marginTop: "8px"
                    }}>
                      Average<br/>(40-59%)
                    </div>
                  </div>
                  
                  {/* Poor Bar */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#000", minHeight: "20px" }}>
                      {participantsWithExamScores > 0 ? ((poorCount / participantsWithExamScores) * 100).toFixed(0) : 0}%
                    </div>
                    <div style={{
                      width: "100%",
                      height: `${(poorCount / maxCount) * 140}px`,
                      minHeight: poorCount > 0 ? "30px" : "0px",
                      background: "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
                      borderRadius: "8px 8px 0 0",
                      transition: "height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      boxShadow: "0 -4px 12px rgba(239, 68, 68, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <div style={{
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#fff",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                      }}>
                        {poorCount}
                      </div>
                    </div>
                    <div style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#333",
                      textAlign: "center",
                      marginTop: "8px"
                    }}>
                      Poor<br/>(&lt;40%)
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>📈</div>
              <p style={{ margin: 0, fontSize: "14px" }}>No performance data available yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Participants Section */}
      <div className="glass-panel" style={{ padding: "24px", animation: "fadeIn 0.8s ease-out 0.3s backwards" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "700",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Participants
          </h2>
          <span style={{
            background: "var(--glass-hover)",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--text-primary)"
          }}>
            {filteredParticipants.length} {filteredParticipants.length === 1 ? 'student' : 'students'}
          </span>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center"
          }}>
            <svg
              style={{
                position: "absolute",
                left: "14px",
                width: "16px",
                height: "16px",
                color: "var(--text-secondary)",
                pointerEvents: "none"
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px 12px 42px",
                background: "var(--bg-primary)",
                border: "1px solid var(--glass-border)",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text-primary)",
                outline: "none",
                transition: "all 0.3s ease"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--glass-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--glass-hover)",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--glass-border)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--glass-hover)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        {filteredParticipants.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredParticipants.map((attendance, index) => {
              const stats = participantStats[attendance.user.id];
              const riskScore = stats?.riskScore;
              return (
                <div
                  key={index}
                  onClick={() => handleUserClick(attendance.user)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                    e.currentTarget.style.borderColor = "#3b82f6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "var(--glass-border)";
                  }}
                >
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "white",
                    flexShrink: 0
                  }}>
                    {attendance.user.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "15px",
                      fontWeight: "600",
                      color: "var(--text-primary)",
                      marginBottom: "4px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {attendance.user.name}
                    </div>
                    <div style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {attendance.user.email}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Duration
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                        {calculateDuration(attendance)}
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Risk Score
                      </div>
                      <div style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: riskScore !== null && riskScore !== undefined ? getRiskColor(riskScore) : "var(--text-secondary)"
                      }}>
                        {stats?.loading ? "..." : riskScore !== null && riskScore !== undefined ? `${riskScore}%` : "N/A"}
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Violations
                      </div>
                      <div style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: (stats?.violationCount || 0) > 0 ? "#ef4444" : "var(--text-primary)"
                      }}>
                        {stats?.loading ? "..." : stats?.violationCount || 0}
                      </div>
                    </div>

                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ color: "var(--text-secondary)", flexShrink: 0 }}
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchTerm ? (
          <div style={{
            textAlign: "center",
            padding: "48px 20px",
            color: "var(--text-secondary)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
            <h3 style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--text-primary)"
            }}>
              No participants found
            </h3>
            <p style={{ margin: 0, fontSize: "14px" }}>
              No participants match your search for "{searchTerm}"
            </p>
          </div>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "48px 20px",
            color: "var(--text-secondary)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
            <h3 style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "var(--text-primary)"
            }}>
              No Participants Yet
            </h3>
            <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
              Share the exam access key with students to get started
            </p>
            <div style={{
              display: "inline-block",
              background: "rgba(59, 130, 246, 0.1)",
              color: "#3b82f6",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "18px",
              fontWeight: "700",
              marginTop: "8px"
            }}>
              {examDetails.key}
            </div>
          </div>
        )}
      </div>
    </div>
    </ExaminerGuard>
  );
};

export default ExamDetailsPage;
