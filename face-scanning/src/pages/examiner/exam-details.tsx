import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import LoadingIndicator from "../../components/LoadingIndicator";
import styles from "../../styles/ExamDetailsPage.module.css";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { ExaminerGuard } from "@/components/guards";
import { BarChart3 } from "lucide-react";
import { LoadingScreen } from "@/components/PageTransition";
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

  useEffect(() => {
    // Set light theme background
    document.body.style.background = "#f8fafc";
    document.body.style.minHeight = "100vh";
    document.documentElement.style.background = "#f8fafc";
    
    return () => {
      document.body.style.background = "";
      document.body.style.minHeight = "";
      document.documentElement.style.background = "";
    };
  }, []);

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
        // ✅ Use selected_option from backend JOIN (includes is_correct field)
        const selectedOption = answer.selected_option;
        
        // ✅ Check is_correct with all possible boolean formats (MySQL can return 1, "1", true, "true")
        const isCorrect = selectedOption?.is_correct === true || 
                         selectedOption?.is_correct === 1 || 
                         selectedOption?.is_correct === "1" ||
                         selectedOption?.is_correct === "true";
        
        if (isCorrect) {
          correctCount++;
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
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            color: "#1e293b",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            marginBottom: "20px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateX(-4px)";
            e.currentTarget.style.background = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateX(0)";
            e.currentTarget.style.background = "#f1f5f9";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div style={{
          background: "linear-gradient(135deg, #ffffff, #f1f5f9)",
          borderRadius: "24px",
          padding: "32px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #0ea5e9, #3b82f6)"
          }} />
          
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
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
                color: "#1e293b",
                letterSpacing: "-0.02em"
              }}>
                {examDetails.exam_name}
              </h1>
              <div style={{ display: "flex", gap: "16px", fontSize: "14px", color: "#64748b", flexWrap: "wrap" }}>
                <span style={{ fontWeight: "500" }}>Exam ID: <strong style={{ color: "#1e293b" }}>{examDetails.id}</strong></span>
                <span style={{ fontWeight: "500" }}>Access Key: <strong style={{ 
                  color: "#0ea5e9",
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
                    Start: <strong style={{ color: "#3b82f6" }}>{new Date(examDetails.startTime).toLocaleString()}</strong>
                    {' | '}End: <strong style={{ color: "#3b82f6" }}>{new Date(examDetails.endTime).toLocaleString()}</strong>
                    {' | '}Duration: <strong style={{ color: "#0ea5e9" }}>{Math.round((new Date(examDetails.endTime).getTime() - new Date(examDetails.startTime).getTime()) / (1000 * 60))} min</strong>
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
          background: "#ffffff",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Participants
          </div>
          <div style={{ fontSize: "36px", fontWeight: "700", color: "#1e293b", marginBottom: "4px" }}>
            {totalParticipants}
          </div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>
            Students attended
          </div>
        </div>

        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Average Risk Score
          </div>
          <div style={{ fontSize: "36px", fontWeight: "700", color: averageRiskScore > 60 ? "#ef4444" : averageRiskScore > 30 ? "#f59e0b" : "#10b981", marginBottom: "4px" }}>
            {participantsWithScores > 0 ? averageRiskScore.toFixed(1) : "N/A"}
            {participantsWithScores > 0 && <span style={{ fontSize: "20px" }}>%</span>}
          </div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>
            {participantsWithScores > 0 ? `${participantsWithScores} scored` : "No scores yet"}
          </div>
        </div>

        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Average Marks
          </div>
          <div style={{ fontSize: "36px", fontWeight: "700", color: averageMarks >= 70 ? "#10b981" : averageMarks >= 40 ? "#f59e0b" : "#ef4444", marginBottom: "4px" }}>
            {participantsWithExamScores > 0 ? averageMarks.toFixed(1) : "N/A"}
            {participantsWithExamScores > 0 && <span style={{ fontSize: "20px" }}>%</span>}
          </div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>
            {participantsWithExamScores > 0 ? `${participantsWithExamScores} students` : "No scores yet"}
          </div>
        </div>

        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Risk Distribution
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "baseline", marginTop: "8px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#ef4444" }}>{highRiskCount}</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", fontWeight: "600" }}>High</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#f59e0b" }}>{mediumRiskCount}</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", fontWeight: "600" }}>Medium</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", fontWeight: "700", color: "#10b981" }}>{lowRiskCount}</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", fontWeight: "600" }}>Low</div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Graphs Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px",
        marginBottom: "32px",
        animation: "fadeIn 0.8s ease-out 0.3s backwards"
      }}>
        {/* Low Risk Pie Chart */}
        <div style={{
          background: "linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)",
          borderRadius: "16px",
          padding: "28px",
          border: "none",
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.12)",
          transition: "all 0.3s ease"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.12)";
        }}
        >
          <h3 style={{
            margin: "0 0 20px 0",
            fontSize: "16px",
            fontWeight: "700",
            color: "#065F46"
          }}>
            Low Risk Students
          </h3>
          
          {participantsWithScores > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
              {/* Low Risk Pie Chart */}
              <div style={{ position: "relative", width: "220px", height: "220px" }}>
                <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: "rotate(-90deg)" }}>
                  {(() => {
                    const total = participantsWithScores;
                    const radius = 90;
                    const circumference = 2 * Math.PI * radius;
                    const lowPercent = (lowRiskCount / total) * 100;
                    const restPercent = 100 - lowPercent;
                    const lowDash = (lowPercent / 100) * circumference;
                    const restDash = (restPercent / 100) * circumference;
                    
                    return (
                      <>
                        {/* Background (Rest) - Darker Gray for contrast */}
                        <circle
                          cx="110"
                          cy="110"
                          r={radius}
                          fill="none"
                          stroke="#D1D5DB"
                          strokeWidth="32"
                        />
                        {/* Low Risk Progress */}
                        {lowRiskCount > 0 && (
                          <circle
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="32"
                            strokeDasharray={`${lowDash} ${circumference - lowDash}`}
                            strokeLinecap="round"
                            style={{ 
                              transition: "all 0.8s ease"
                            }}
                          />
                        )}
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
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "42px", fontWeight: "900", color: "#10b981", lineHeight: "1" }}>
                    {lowRiskCount}
                  </div>
                  <div style={{ fontSize: "12px", color: "#065F46", marginTop: "4px", fontWeight: "700", letterSpacing: "0.5px" }}>
                    Students
                  </div>
                </div>
              </div>
              
              {/* Percentage */}
              <div style={{
                background: "linear-gradient(135deg, #DCFCE7 0%, #F0FDF4 100%)",
                padding: "14px 28px",
                borderRadius: "14px"
              }}>
                <div style={{ fontSize: "32px", fontWeight: "900", color: "#10b981", textAlign: "center", lineHeight: "1" }}>
                  {participantsWithScores > 0 ? ((lowRiskCount / participantsWithScores) * 100).toFixed(1) : 0}%
                </div>
                <div style={{ fontSize: "11px", color: "#065F46", marginTop: "6px", fontWeight: "700", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  of total students
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#065F46" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px", display: "flex", justifyContent: "center" }}><BarChart3 size={48} /></div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>No data yet</p>
            </div>
          )}
        </div>

        {/* Medium Risk Pie Chart */}
        <div style={{
          background: "linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)",
          borderRadius: "16px",
          padding: "28px",
          border: "none",
          boxShadow: "0 2px 8px rgba(245, 158, 11, 0.12)",
          transition: "all 0.3s ease"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(245, 158, 11, 0.12)";
        }}
        >
          <h3 style={{
            margin: "0 0 20px 0",
            fontSize: "16px",
            fontWeight: "700",
            color: "#92400E"
          }}>
            Medium Risk Students
          </h3>
          
          {participantsWithScores > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
              {/* Medium Risk Pie Chart */}
              <div style={{ position: "relative", width: "220px", height: "220px" }}>
                <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: "rotate(-90deg)" }}>
                  {(() => {
                    const total = participantsWithScores;
                    const radius = 90;
                    const circumference = 2 * Math.PI * radius;
                    const mediumPercent = (mediumRiskCount / total) * 100;
                    const mediumDash = (mediumPercent / 100) * circumference;
                    
                    return (
                      <>
                        {/* Background - Darker Gray for contrast */}
                        <circle
                          cx="110"
                          cy="110"
                          r={radius}
                          fill="none"
                          stroke="#D1D5DB"
                          strokeWidth="32"
                        />
                        {/* Medium Risk Progress */}
                        {mediumRiskCount > 0 && (
                          <circle
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="32"
                            strokeDasharray={`${mediumDash} ${circumference - mediumDash}`}
                            strokeLinecap="round"
                            style={{ 
                              transition: "all 0.8s ease"
                            }}
                          />
                        )}
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
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "42px", fontWeight: "900", color: "#f59e0b", lineHeight: "1" }}>
                    {mediumRiskCount}
                  </div>
                  <div style={{ fontSize: "12px", color: "#92400E", marginTop: "4px", fontWeight: "700", letterSpacing: "0.5px" }}>
                    Students
                  </div>
                </div>
              </div>
              
              {/* Percentage */}
              <div style={{
                background: "linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)",
                padding: "14px 28px",
                borderRadius: "14px"
              }}>
                <div style={{ fontSize: "32px", fontWeight: "900", color: "#f59e0b", textAlign: "center", lineHeight: "1" }}>
                  {participantsWithScores > 0 ? ((mediumRiskCount / participantsWithScores) * 100).toFixed(1) : 0}%
                </div>
                <div style={{ fontSize: "11px", color: "#92400E", marginTop: "6px", fontWeight: "700", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  of total students
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#92400E" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px", display: "flex", justifyContent: "center" }}><BarChart3 size={48} /></div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>No data yet</p>
            </div>
          )}
        </div>

        {/* High Risk Pie Chart */}
        <div style={{
          background: "linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)",
          borderRadius: "16px",
          padding: "28px",
          border: "none",
          boxShadow: "0 2px 8px rgba(239, 68, 68, 0.12)",
          transition: "all 0.3s ease"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.18)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.12)";
        }}
        >
          <h3 style={{
            margin: "0 0 20px 0",
            fontSize: "16px",
            fontWeight: "700",
            color: "#7F1D1D"
          }}>
            High Risk Students
          </h3>
          
          {participantsWithScores > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
              {/* High Risk Pie Chart */}
              <div style={{ position: "relative", width: "220px", height: "220px" }}>
                <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: "rotate(-90deg)" }}>
                  {(() => {
                    const total = participantsWithScores;
                    const radius = 90;
                    const circumference = 2 * Math.PI * radius;
                    const highPercent = (highRiskCount / total) * 100;
                    const highDash = (highPercent / 100) * circumference;
                    
                    return (
                      <>
                        {/* Background - Darker Gray for contrast */}
                        <circle
                          cx="110"
                          cy="110"
                          r={radius}
                          fill="none"
                          stroke="#D1D5DB"
                          strokeWidth="32"
                        />
                        {/* High Risk Progress */}
                        {highRiskCount > 0 && (
                          <circle
                            cx="110"
                            cy="110"
                            r={radius}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="32"
                            strokeDasharray={`${highDash} ${circumference - highDash}`}
                            strokeLinecap="round"
                            style={{ 
                              transition: "all 0.8s ease"
                            }}
                          />
                        )}
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
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: "42px", fontWeight: "900", color: "#ef4444", lineHeight: "1" }}>
                    {highRiskCount}
                  </div>
                  <div style={{ fontSize: "12px", color: "#7F1D1D", marginTop: "4px", fontWeight: "700", letterSpacing: "0.5px" }}>
                    Students
                  </div>
                </div>
              </div>
              
              {/* Percentage */}
              <div style={{
                background: "linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)",
                padding: "14px 28px",
                borderRadius: "14px"
              }}>
                <div style={{ fontSize: "32px", fontWeight: "900", color: "#ef4444", textAlign: "center", lineHeight: "1" }}>
                  {participantsWithScores > 0 ? ((highRiskCount / participantsWithScores) * 100).toFixed(1) : 0}%
                </div>
                <div style={{ fontSize: "11px", color: "#7F1D1D", marginTop: "6px", fontWeight: "700", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  of total students
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#7F1D1D" }}>
              <div style={{ fontSize: "48px", marginBottom: "12px", display: "flex", justifyContent: "center" }}><BarChart3 size={48} /></div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "700" }}>No data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Bar Chart Section - Keep the existing one */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "20px",
        marginBottom: "32px",
        animation: "fadeIn 0.8s ease-out 0.4s backwards"
      }}>
        {/* Performance Bar Chart */}
        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "28px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)"
        }}>
          <h3 style={{
            margin: "0 0 24px 0",
            fontSize: "18px",
            fontWeight: "700",
            color: "#1e293b"
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
                              color: "#1e293b"
                            }}>
                              {d.label}
                            </span>
                            <span style={{
                              fontSize: "11px",
                              color: "#64748b"
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
                              color: "#64748b"
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
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>📈</div>
              <p style={{ margin: 0, fontSize: "14px" }}>No performance data available yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Participants Section */}
      <div style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "28px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
        animation: "fadeIn 0.8s ease-out 0.3s backwards"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <h2 style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "700",
            color: "#1e293b",
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
            background: "#f1f5f9",
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#1e293b",
            border: "1px solid #e2e8f0"
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
                color: "#64748b",
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
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "500",
                color: "#1e293b",
                outline: "none",
                transition: "all 0.3s ease"
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#0ea5e9";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(var(--accent-rgb), 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
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
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: "#64748b",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.color = "#1e293b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.color = "#64748b";
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
                color: "#64748b",
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
                  background: "#0ea5e9",
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
                  background: "#0ea5e9",
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
                  background: "#0ea5e9",
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
            border: "1px solid #e2e8f0"
          }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px"
            }}>
              <thead>
                <tr style={{
                  background: "#f1f5f9",
                  borderBottom: "2px solid #e2e8f0"
                }}>
                  <th style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "#64748b",
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
                    color: "#64748b",
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
                    color: "#64748b",
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
                            background: selectedDepartment !== "all" ? "#0ea5e9" : "transparent",
                            border: "none",
                            padding: "4px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            color: selectedDepartment !== "all" ? "white" : "#64748b",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (selectedDepartment === "all") {
                              e.currentTarget.style.color = "#0ea5e9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedDepartment === "all") {
                              e.currentTarget.style.color = "#64748b";
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
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "8px",
                            minWidth: "180px",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
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
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              fontSize: "13px",
                              color: "#1e293b",
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
                    color: "#64748b",
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
                    color: "#64748b",
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
                            background: regNoFilter !== "" ? "#0ea5e9" : "transparent",
                            border: "none",
                            padding: "4px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            color: regNoFilter !== "" ? "white" : "#64748b",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (regNoFilter === "") {
                              e.currentTarget.style.color = "#0ea5e9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (regNoFilter === "") {
                              e.currentTarget.style.color = "#64748b";
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
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "12px",
                            minWidth: "200px",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
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
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              fontSize: "13px",
                              color: "#1e293b",
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
                    color: "#64748b",
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
                    color: "#64748b",
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
                          background: riskScoreSortOrder !== "none" ? "#0ea5e9" : "transparent",
                          border: "none",
                          padding: "4px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          color: riskScoreSortOrder !== "none" ? "white" : "#64748b",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          if (riskScoreSortOrder === "none") {
                            e.currentTarget.style.background = "#f1f5f9";
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
                    color: "#64748b",
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
                            background: violationFilter !== "" ? "#0ea5e9" : "transparent",
                            border: "none",
                            padding: "4px",
                            cursor: "pointer",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            color: violationFilter !== "" ? "white" : "#64748b",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (violationFilter === "") {
                              e.currentTarget.style.color = "#0ea5e9";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (violationFilter === "") {
                              e.currentTarget.style.color = "#64748b";
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
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "12px",
                            minWidth: "200px",
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
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
                              background: "#f1f5f9",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              fontSize: "13px",
                              color: "#1e293b",
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
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap"
                  }}>
                    Exam Score
                  </th>
                  <th style={{
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "12px",
                    color: "#64748b",
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
                        borderBottom: "1px solid #e2e8f0",
                        transition: "background 0.2s ease",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f1f5f9";
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
                            background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
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
                            color: "#1e293b"
                          }}>
                            {attendance.user.name}
                          </span>
                        </div>
                      </td>
                      <td style={{
                        padding: "16px",
                        color: "#64748b",
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
                        color: "#64748b",
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
                        color: "#1e293b",
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
                            : "#f1f5f9",
                          color: riskScore !== null && riskScore !== undefined 
                            ? getRiskColor(riskScore) 
                            : "#64748b"
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
                          background: (stats?.violationCount || 0) > 0 ? "#FEE2E2" : "#f1f5f9",
                          color: (stats?.violationCount || 0) > 0 ? "#ef4444" : "#1e293b"
                        }}>
                          {stats?.loading ? "..." : stats?.violationCount || 0}
                        </span>
                      </td>
                      <td style={{
                        padding: "16px",
                        textAlign: "center",
                        whiteSpace: "nowrap"
                      }}>
                        {stats?.loading ? (
                          <span style={{ color: "#64748b" }}>...</span>
                        ) : stats?.examScore !== null && stats?.examScore !== undefined ? (
                          <span style={{
                            display: "inline-block",
                            padding: "6px 14px",
                            borderRadius: "8px",
                            fontSize: "15px",
                            fontWeight: "700",
                            background: stats.examScore >= 70 ? "#DCFCE7" : stats.examScore >= 40 ? "#FEF3C7" : "#FEE2E2",
                            color: stats.examScore >= 70 ? "#10b981" : stats.examScore >= 40 ? "#f59e0b" : "#ef4444"
                          }}>
                            {stats.examScore}%
                          </span>
                        ) : (
                          <span style={{
                            color: "#64748b",
                            fontSize: "13px",
                            fontStyle: "italic"
                          }}>
                            No score
                          </span>
                        )}
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
                            background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
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
            color: "#64748b"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
            <h3 style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#1e293b"
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
            color: "#64748b"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
            <h3 style={{
              margin: "0 0 8px 0",
              fontSize: "18px",
              fontWeight: "600",
              color: "#1e293b"
            }}>
              No Participants Yet
            </h3>
            <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
              Share the exam access key with students to get started
            </p>
            <div style={{
              display: "inline-block",
              background: "rgba(var(--accent-rgb), 0.1)",
              color: "#0ea5e9",
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

