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
  dept: string;
  dob: string;
  reg: string;
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
  examScore: number | null; 
  loading: boolean;
}

interface ExamDetails {
  id: number;
  exam_name: string;
  key: number;
  attendances: Attendance[];
  createdAt: string;
  updatedAt: string;
  startTime?: string;
  endTime?: string;
}

const ExamDetailsPage: React.FC = () => {
  const router = useRouter();
  const { examId } = router.query;

  const [examDetails, setExamDetails] = useState<ExamDetails | null>(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [participantStats, setParticipantStats] = useState<{ [key: number]: ParticipantStats }>({});
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [violationFilter, setViolationFilter] = useState<string>("");
  const [regNoFilter, setRegNoFilter] = useState<string>("");
  
  // Sort state for risk score
  const [riskScoreSortOrder, setRiskScoreSortOrder] = useState<"none" | "asc" | "desc">("none");

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Find all open dropdowns
      const dropdowns = document.querySelectorAll('[data-filter-dropdown]');
      dropdowns.forEach(dropdown => {
        const dropdownElement = dropdown as HTMLElement;
        const button = dropdown.previousElementSibling as HTMLElement;
        
        // If click is outside both button and dropdown, close it
        if (!dropdown.contains(target) && !button?.contains(target)) {
          dropdownElement.style.display = 'none';
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getRiskLabel = (score: number): string => {
    if (score <= 30) return "Low Risk";
    if (score <= 60) return "Medium Risk";
    return "High Risk";
  };

  const getRiskColor = (score: number): string => {
    if (score <= 30) return "#10b981";
    if (score <= 60) return "#f59e0b";
    return "#ef4444";
  };

  const calculateDuration = (attendance: Attendance): string => {
    try {
      if (attendance.startTime) {
        const startTime = new Date(attendance.startTime);
        const endTime = attendance.endTime ? new Date(attendance.endTime) : new Date();
        const durationMs = endTime.getTime() - startTime.getTime();
        
        if (durationMs <= 0) return "Just started";

        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        const statusIndicator = attendance.endTime ? "" : " (ongoing)";

        if (hours > 0) {
          return `${hours}h ${minutes}m${statusIndicator}`;
        } else if (minutes > 0) {
          return `${minutes}m${statusIndicator}`;
        } else {
          return `< 1m${statusIndicator}`;
        }
      }
      
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

  // Get unique departments for filter
  const uniqueDepartments = Array.from(
    new Set(examDetails?.attendances?.map(a => a.user.dept).filter(Boolean) || [])
  ).sort();

  const filteredParticipants = (examDetails?.attendances?.filter(attendance => {
    const stats = participantStats[attendance.user.id];
    
    // Search filter (name or email)
    const matchesSearch = 
      attendance.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendance.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Department filter
    const matchesDepartment = 
      selectedDepartment === "all" || 
      attendance.user.dept === selectedDepartment;
    
    // Reg No filter
    const matchesRegNo = 
      regNoFilter === "" || 
      attendance.user.reg?.toLowerCase().includes(regNoFilter.toLowerCase());
    
    // Violation filter (search by number)
    const violationCount = stats?.violationCount || 0;
    const matchesViolations = 
      violationFilter === "" || 
      violationCount.toString().includes(violationFilter);
    
    return matchesSearch && matchesDepartment && matchesRegNo && matchesViolations;
  }) || []).sort((a, b) => {
    // Apply risk score sorting if active
    if (riskScoreSortOrder !== "none") {
      const statsA = participantStats[a.user.id];
      const statsB = participantStats[b.user.id];
      const scoreA = statsA?.riskScore ?? -1; // Treat null/undefined as -1 to push to end
      const scoreB = statsB?.riskScore ?? -1;
      
      if (riskScoreSortOrder === "asc") {
        // Ascending: lower scores first, nulls at end
        if (scoreA === -1 && scoreB === -1) return 0;
        if (scoreA === -1) return 1;
        if (scoreB === -1) return -1;
        return scoreA - scoreB;
      } else {
        // Descending: higher scores first, nulls at end
        if (scoreA === -1 && scoreB === -1) return 0;
        if (scoreA === -1) return 1;
        if (scoreB === -1) return -1;
        return scoreB - scoreA;
      }
    }
    return 0;
  });

  const fetchParticipantScore = async (userId: number, examId: number) => {
    try {
      const token = getTokenFromCookie();
      const response = await axios.get(`${baseUrl}/getScore`, {
        params: { userId, examId },
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: (status) => status < 500,
      });
      
      if (response.status === 200 && response.data?.data !== undefined) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
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
        validateStatus: (status) => status < 500, 
      });
      
      if (response.status === 200 && response.data?.count !== undefined) {
        return response.data.count;
      }
      
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
      background: "var(--background)",
      padding: "32px",
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
            background: "var(--secondary-bg)",
            border: "1px solid var(--border-color)",
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
            e.currentTarget.style.background = "var(--card-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
            e.currentTarget.style.background = "var(--secondary-bg)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div style={{
          background: "linear-gradient(135deg, var(--card-bg), var(--secondary-bg))",
          borderRadius: "24px",
          padding: "32px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 8px 32px var(--shadow)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, var(--accent-color), var(--primary-color))"
          }} />
          
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4)"
            }}>
              📚
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                margin: "0 0 8px 0",
                fontSize: "28px",
                fontWeight: "700",
                color: "var(--text-primary)",
                letterSpacing: "-0.02em"
              }}>
                {examDetails.exam_name}
              </h1>
              <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "var(--text-secondary)", flexWrap: "wrap" }}>
                <span style={{ fontWeight: "500" }}>Exam ID: <strong style={{ color: "var(--text-primary)" }}>{examDetails.id}</strong></span>
                <span style={{ fontWeight: "500" }}>Access Key: <strong style={{ 
                  color: "var(--accent-color)",
                  background: "rgba(var(--accent-rgb), 0.1)",
                  padding: "4px 12px",
                  borderRadius: "8px",
                  fontSize: "15px"
                }}>{examDetails.key}</strong></span>
                <span style={{ fontWeight: "500" }}>Created: {new Date(examDetails.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}</span>
                {/* Exam Duration, Start Time, End Time */}
                {examDetails.startTime && examDetails.endTime && (
                  <span style={{ fontWeight: "500" }}>
                    Start: <strong style={{ color: "var(--primary-color)" }}>{new Date(examDetails.startTime).toLocaleString()}</strong>
                    {' | '}End: <strong style={{ color: "var(--primary-color)" }}>{new Date(examDetails.endTime).toLocaleString()}</strong>
                    {' | '}Duration: <strong style={{ color: "var(--accent-color)" }}>{Math.round((new Date(examDetails.endTime).getTime() - new Date(examDetails.startTime).getTime()) / (1000 * 60))} min</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
        marginBottom: "32px",
        animation: "fadeIn 0.7s ease-out 0.2s backwards"
      }}>
        <div style={{
          background: "var(--card-bg)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 16px var(--shadow)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Participants
          </div>
          <div style={{ fontSize: "36px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
            {totalParticipants}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Students attended
          </div>
        </div>

        <div style={{
          background: "var(--card-bg)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 16px var(--shadow)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Average Risk Score
          </div>
          <div style={{ fontSize: "36px", fontWeight: "700", color: averageRiskScore > 60 ? "#ef4444" : averageRiskScore > 30 ? "#f59e0b" : "#10b981", marginBottom: "4px" }}>
            {participantsWithScores > 0 ? averageRiskScore.toFixed(1) : "N/A"}
            {participantsWithScores > 0 && <span style={{ fontSize: "20px" }}>%</span>}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {participantsWithScores > 0 ? `${participantsWithScores} scored` : "No scores yet"}
          </div>
        </div>

        <div style={{
          background: "var(--card-bg)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 16px var(--shadow)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Average Marks
          </div>
          <div style={{ fontSize: "36px", fontWeight: "700", color: averageMarks >= 70 ? "#10b981" : averageMarks >= 40 ? "#f59e0b" : "#ef4444", marginBottom: "4px" }}>
            {participantsWithExamScores > 0 ? averageMarks.toFixed(1) : "N/A"}
            {participantsWithExamScores > 0 && <span style={{ fontSize: "20px" }}>%</span>}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {participantsWithExamScores > 0 ? `${participantsWithExamScores} students` : "No scores yet"}
          </div>
        </div>

        <div style={{
          background: "var(--card-bg)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 16px var(--shadow)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Risk Distribution
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "baseline", marginTop: "8px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#ef4444" }}>{highRiskCount}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", fontWeight: "600" }}>High</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#f59e0b" }}>{mediumRiskCount}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", fontWeight: "600" }}>Medium</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#10b981" }}>{lowRiskCount}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", fontWeight: "600" }}>Low</div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Graphs Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
        gap: "20px",
        marginBottom: "32px",
        animation: "fadeIn 0.8s ease-out 0.3s backwards"
      }}>
        {/* Risk Distribution Pie Chart */}
        <div style={{
          background: "var(--card-bg)",
          borderRadius: "16px",
          padding: "28px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 16px var(--shadow)"
        }}>
          <h3 style={{
            margin: "0 0 24px 0",
            fontSize: "18px",
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
        <div style={{
          background: "var(--card-bg)",
          borderRadius: "16px",
          padding: "28px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 4px 16px var(--shadow)"
        }}>
          <h3 style={{
            margin: "0 0 24px 0",
            fontSize: "18px",
            fontWeight: "700",
            color: "var(--text-primary)"
          }}>
            Score Performance Distribution
          </h3>
          
          {participantsWithExamScores > 0 ? (() => {
            // Calculate score ranges
            const excellentCount = Object.values(participantStats).filter(s => !s.loading && s.examScore !== null && s.examScore >= 80).length;
            const goodCount = Object.values(participantStats).filter(s => !s.loading && s.examScore !== null && s.examScore >= 60 && s.examScore < 80).length;
            const averageCount = Object.values(participantStats).filter(s => !s.loading && s.examScore !== null && s.examScore >= 40 && s.examScore < 60).length;
            const poorCount = Object.values(participantStats).filter(s => !s.loading && s.examScore !== null && s.examScore < 40).length;
            
            const dataPoints = [
              { label: "Poor", range: "(<40%)", value: poorCount, color: "#ef4444", bgColor: "#FEE2E2" },
              { label: "Average", range: "(40-59%)", value: averageCount, color: "#f59e0b", bgColor: "#FEF3C7" },
              { label: "Good", range: "(60-79%)", value: goodCount, color: "#0ea5e9", bgColor: "#E0F2FE" },
              { label: "Excellent", range: "(80-100%)", value: excellentCount, color: "#10b981", bgColor: "#DCFCE7" }
            ];
            
            const maxValue = Math.max(...dataPoints.map(d => d.value), 1);
            
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Modern Horizontal Bar Chart */}
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  padding: "0"
                }}>
                  {dataPoints.map((d, i) => {
                    const percentage = (d.value / maxValue) * 100;
                    const studentPercentage = participantsWithExamScores > 0 ? ((d.value / participantsWithExamScores) * 100).toFixed(0) : 0;
                    
                    return (
                      <div key={i} style={{ position: "relative" }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "6px"
                        }}>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                          }}>
                            <div style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "2px",
                              background: d.color
                            }} />
                            <span style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--text-primary)"
                            }}>
                              {d.label}
                            </span>
                            <span style={{
                              fontSize: "11px",
                              color: "var(--text-secondary)"
                            }}>
                              {d.range}
                            </span>
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: "6px"
                          }}>
                            <span style={{
                              fontSize: "18px",
                              fontWeight: "700",
                              color: d.color
                            }}>
                              {d.value}
                            </span>
                            <span style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              color: "var(--text-secondary)"
                            }}>
                              ({studentPercentage}%)
                            </span>
                          </div>
                        </div>
                        
                        {/* Bar Container */}
                        <div style={{
                          width: "100%",
                          height: "32px",
                          background: d.bgColor,
                          borderRadius: "8px",
                          overflow: "hidden",
                          position: "relative",
                          border: `1px solid ${d.color}20`
                        }}>
                          {/* Animated Bar */}
                          <div style={{
                            height: "100%",
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, ${d.color}, ${d.color}dd)`,
                            borderRadius: "8px",
                            transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            paddingRight: "10px",
                            boxShadow: `0 2px 8px ${d.color}40`,
                            minWidth: d.value > 0 ? "50px" : "0px"
                          }}>
                            {d.value > 0 && (
                              <span style={{
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "white",
                                textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                              }}>
                                {d.value} {d.value === 1 ? 'student' : 'students'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Stats Summary Cards */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "10px",
                  marginTop: "6px"
                }}>
                  {dataPoints.map((d, i) => (
                    <div key={i} style={{
                      textAlign: "center",
                      padding: "12px 10px",
                      background: d.bgColor,
                      borderRadius: "10px",
                      border: `2px solid ${d.color}`,
                      transition: "transform 0.2s ease",
                      cursor: "default"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                      <div style={{
                        fontSize: "24px",
                        fontWeight: "700",
                        color: d.color,
                        lineHeight: "1"
                      }}>
                        {d.value}
                      </div>
                      <div style={{
                        fontSize: "10px",
                        color: d.color,
                        marginTop: "5px",
                        fontWeight: "600",
                        opacity: 0.8
                      }}>
                        {participantsWithExamScores > 0 ? ((d.value / participantsWithExamScores) * 100).toFixed(0) : 0}% {d.label}
                      </div>
                    </div>
                  ))}
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
      <div style={{
        background: "var(--card-bg)",
        borderRadius: "16px",
        padding: "28px",
        border: "1px solid var(--border-color)",
        boxShadow: "0 4px 16px var(--shadow)",
        animation: "fadeIn 0.8s ease-out 0.3s backwards"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <h2 style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "700",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Participants
          </h2>
          <span style={{
            background: "var(--secondary-bg)",
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: "600",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)"
          }}>
            {filteredParticipants.length} {filteredParticipants.length === 1 ? 'student' : 'students'}
          </span>
        </div>

        {/* Search Bar and Filters */}
        <div style={{ marginBottom: "24px" }}>
          {/* Search Bar */}
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            marginBottom: "12px"
          }}>
            <svg
              style={{
                position: "absolute",
                left: "16px",
                width: "18px",
                height: "18px",
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
                padding: "14px 16px 14px 48px",
                background: "var(--secondary-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "var(--text-primary)",
                outline: "none",
                transition: "all 0.3s ease"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-color)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(var(--accent-rgb), 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: "14px",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--secondary-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--card-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          {/* Active Filters Info */}
          {(selectedDepartment !== "all" || regNoFilter !== "" || violationFilter !== "") && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap"
            }}>
              <span style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                fontWeight: "600"
              }}>
                Active Filters:
              </span>
              {selectedDepartment !== "all" && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  background: "var(--accent-color)",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600"
                }}>
                  Dept: {selectedDepartment}
                  <button
                    onClick={() => setSelectedDepartment("all")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      padding: "0",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </span>
              )}
              {regNoFilter !== "" && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  background: "var(--accent-color)",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600"
                }}>
                  Reg: {regNoFilter}
                  <button
                    onClick={() => setRegNoFilter("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      padding: "0",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </span>
              )}
              {violationFilter !== "" && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  background: "var(--accent-color)",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600"
                }}>
                  Violations: {violationFilter}
                  <button
                    onClick={() => setViolationFilter("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      padding: "0",
                      display: "flex",
                      alignItems: "center"
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedDepartment("all");
                  setRegNoFilter("");
                  setViolationFilter("");
                }}
                style={{
                  padding: "4px 10px",
                  background: "var(--error-bg)",
                  border: "1px solid var(--error-color)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--error-color)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {filteredParticipants.length > 0 ? (
          <div style={{
            overflowX: "auto",
            borderRadius: "12px",
            border: "1px solid var(--border-color)"
          }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px"
            }}>
              <thead>
                <tr style={{
                  background: "var(--secondary-bg)",
                  borderBottom: "2px solid var(--border-color)"
                }}>
                  <th style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    Student
                  </th>
                  <th style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    Email
                  </th>
                  <th style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      Department
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const dropdown = e.currentTarget.nextElementSibling as HTMLElement;
                            if (dropdown) {
                              dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
                            }
                          }}
                          style={{
                            background: selectedDepartment !== "all" ? "var(--accent-color)" : "transparent",
                            border: "none",
                            padding: "4px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            color: selectedDepartment !== "all" ? "white" : "var(--text-secondary)",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (selectedDepartment === "all") {
                              e.currentTarget.style.color = "var(--accent-color)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedDepartment === "all") {
                              e.currentTarget.style.color = "var(--text-secondary)";
                            }
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                          </svg>
                        </button>
                        <div
                          data-filter-dropdown
                          style={{
                            display: "none",
                            position: "absolute",
                            top: "100%",
                            left: "0",
                            marginTop: "8px",
                            background: "var(--card-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            padding: "8px",
                            minWidth: "180px",
                            boxShadow: "0 4px 12px var(--shadow)",
                            zIndex: 1000
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={selectedDepartment}
                            onChange={(e) => {
                              setSelectedDepartment(e.target.value);
                              const dropdown = e.currentTarget.parentElement as HTMLElement;
                              if (dropdown) dropdown.style.display = "none";
                            }}
                            style={{
                              width: "100%",
                              padding: "8px",
                              background: "var(--secondary-bg)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              fontSize: "13px",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                              outline: "none"
                            }}
                          >
                            <option value="all">All Departments</option>
                            {uniqueDepartments.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    DOB
                  </th>
                  <th style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      Reg No
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const dropdown = e.currentTarget.nextElementSibling as HTMLElement;
                            if (dropdown) {
                              dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
                              const input = dropdown.querySelector('input') as HTMLInputElement;
                              if (input) input.focus();
                            }
                          }}
                          style={{
                            background: regNoFilter !== "" ? "var(--accent-color)" : "transparent",
                            border: "none",
                            padding: "4px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            color: regNoFilter !== "" ? "white" : "var(--text-secondary)",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (regNoFilter === "") {
                              e.currentTarget.style.color = "var(--accent-color)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (regNoFilter === "") {
                              e.currentTarget.style.color = "var(--text-secondary)";
                            }
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                          </svg>
                        </button>
                        <div
                          data-filter-dropdown
                          style={{
                            display: "none",
                            position: "absolute",
                            top: "100%",
                            left: "0",
                            marginTop: "8px",
                            background: "var(--card-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            padding: "12px",
                            minWidth: "200px",
                            boxShadow: "0 4px 12px var(--shadow)",
                            zIndex: 1000
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            placeholder="Filter reg no..."
                            value={regNoFilter}
                            onChange={(e) => setRegNoFilter(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px",
                              background: "var(--secondary-bg)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              fontSize: "13px",
                              color: "var(--text-primary)",
                              outline: "none"
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </th>
                  <th style={{
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    Duration
                  </th>
                  <th style={{
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      Risk Score
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRiskScoreSortOrder(prev => {
                            if (prev === "none") return "asc";
                            if (prev === "asc") return "desc";
                            return "none";
                          });
                        }}
                        style={{
                          background: riskScoreSortOrder !== "none" ? "var(--accent-color)" : "transparent",
                          border: "none",
                          padding: "4px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          color: riskScoreSortOrder !== "none" ? "white" : "var(--text-secondary)",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          if (riskScoreSortOrder === "none") {
                            e.currentTarget.style.background = "var(--secondary-bg)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (riskScoreSortOrder === "none") {
                            e.currentTarget.style.background = "transparent";
                          }
                        }}
                        title={
                          riskScoreSortOrder === "none" 
                            ? "Sort by risk score" 
                            : riskScoreSortOrder === "asc" 
                            ? "Sorted ascending (click for descending)" 
                            : "Sorted descending (click to clear)"
                        }
                      >
                        {riskScoreSortOrder === "none" && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12l7 7 7-7"/>
                          </svg>
                        )}
                        {riskScoreSortOrder === "asc" && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                          </svg>
                        )}
                        {riskScoreSortOrder === "desc" && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12l7 7 7-7"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </th>
                  <th style={{
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      Violations
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const dropdown = e.currentTarget.nextElementSibling as HTMLElement;
                            if (dropdown) {
                              dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
                              const input = dropdown.querySelector('input') as HTMLInputElement;
                              if (input) input.focus();
                            }
                          }}
                          style={{
                            background: violationFilter !== "" ? "var(--accent-color)" : "transparent",
                            border: "none",
                            padding: "4px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            color: violationFilter !== "" ? "white" : "var(--text-secondary)",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (violationFilter === "") {
                              e.currentTarget.style.color = "var(--accent-color)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (violationFilter === "") {
                              e.currentTarget.style.color = "var(--text-secondary)";
                            }
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                          </svg>
                        </button>
                        <div
                          data-filter-dropdown
                          style={{
                            display: "none",
                            position: "absolute",
                            top: "100%",
                            right: "0",
                            marginTop: "8px",
                            background: "var(--card-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            padding: "12px",
                            minWidth: "200px",
                            boxShadow: "0 4px 12px var(--shadow)",
                            zIndex: 1000
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            placeholder="Filter violations..."
                            value={violationFilter}
                            onChange={(e) => setViolationFilter(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px",
                              background: "var(--secondary-bg)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "6px",
                              fontSize: "13px",
                              color: "var(--text-primary)",
                              outline: "none"
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </th>
                  <th style={{
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((attendance, index) => {
                  const stats = participantStats[attendance.user.id];
                  const riskScore = stats?.riskScore;
                  return (
                    <tr
                      key={index}
                      style={{
                        borderBottom: "1px solid var(--border-color)",
                        transition: "background 0.2s ease",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--secondary-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                      onClick={() => handleUserClick(attendance.user)}
                    >
                      <td style={{
                        padding: "16px",
                        whiteSpace: "nowrap"
                      }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px"
                        }}>
                          <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "16px",
                            fontWeight: "700",
                            color: "white",
                            flexShrink: 0
                          }}>
                            {attendance.user.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{
                            fontWeight: "600",
                            color: "var(--text-primary)"
                          }}>
                            {attendance.user.name}
                          </span>
                        </div>
                      </td>
                      <td style={{
                        padding: "16px",
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap"
                      }}>
                        {attendance.user.email}
                      </td>
                      <td style={{
                        padding: "16px",
                        whiteSpace: "nowrap"
                      }}>
                        <span style={{
                          display: "inline-block",
                          padding: "6px 12px",
                          background: "#EEF2FF",
                          color: "#4F46E5",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "600"
                        }}>
                          {attendance.user.dept || "N/A"}
                        </span>
                      </td>
                      <td style={{
                        padding: "16px",
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap"
                      }}>
                        {attendance.user.dob || "N/A"}
                      </td>
                      <td style={{
                        padding: "16px",
                        whiteSpace: "nowrap"
                      }}>
                        <span style={{
                          display: "inline-block",
                          padding: "6px 12px",
                          background: "#F0FDF4",
                          color: "#16A34A",
                          borderRadius: "8px",
                          fontSize: "13px",
                          fontWeight: "600",
                          fontFamily: "'Courier New', monospace"
                        }}>
                          {attendance.user.reg || "N/A"}
                        </span>
                      </td>
                      <td style={{
                        padding: "16px",
                        textAlign: "center",
                        fontWeight: "600",
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap"
                      }}>
                        {calculateDuration(attendance)}
                      </td>
                      <td style={{
                        padding: "16px",
                        textAlign: "center",
                        whiteSpace: "nowrap"
                      }}>
                        <span style={{
                          display: "inline-block",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "700",
                          background: riskScore !== null && riskScore !== undefined 
                            ? (riskScore > 60 ? "#FEE2E2" : riskScore > 30 ? "#FEF3C7" : "#DCFCE7")
                            : "var(--secondary-bg)",
                          color: riskScore !== null && riskScore !== undefined 
                            ? getRiskColor(riskScore) 
                            : "var(--text-secondary)"
                        }}>
                          {stats?.loading ? "..." : riskScore !== null && riskScore !== undefined ? `${riskScore}%` : "N/A"}
                        </span>
                      </td>
                      <td style={{
                        padding: "16px",
                        textAlign: "center",
                        whiteSpace: "nowrap"
                      }}>
                        <span style={{
                          display: "inline-block",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: "700",
                          background: (stats?.violationCount || 0) > 0 ? "#FEE2E2" : "var(--secondary-bg)",
                          color: (stats?.violationCount || 0) > 0 ? "#ef4444" : "var(--text-primary)"
                        }}>
                          {stats?.loading ? "..." : stats?.violationCount || 0}
                        </span>
                      </td>
                      <td style={{
                        padding: "16px",
                        textAlign: "center"
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserClick(attendance.user);
                          }}
                          style={{
                            padding: "8px 16px",
                            background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            whiteSpace: "nowrap"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.4)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              background: "rgba(var(--accent-rgb), 0.1)",
              color: "var(--accent-color)",
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
