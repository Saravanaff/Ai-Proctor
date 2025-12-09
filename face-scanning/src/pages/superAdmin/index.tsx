import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/CreateExamPage.module.css";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SuperAdminGuard } from "../../components/guards";
import { LoadingScreen } from "../../components/PageTransition";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { configureAxiosInterceptor } from "@/utils/axiosConfig";
import { logout as authLogout } from "@/utils/auth";
import { Users, GraduationCap, BookOpen, UserCog, Plus, Clock, Calendar, MoreVertical, LayoutDashboard, TrendingUp, BarChart3, Shield, UserCheck, ShieldCheck, UsersRound, FileText, CheckCircle } from "lucide-react";
import { useDashboardStats } from "@/hooks/useSuperAdmin";

interface DashboardStats {
  totalAdmins: number;
  activeAdmins: number;
  totalStudents: number;
  totalExams: number;
}

interface Exam {
  id: number;
  exam_name: string;
  start_time: string;
  end_time: string;
  duration: number;
  participants?: number;
  totalStudents?: number;
  attendances?: Array<{
    user_id: number;
    exam_id: number;
    startTime?: string;
    endTime?: string;
    User?: {
      name: string;
      email: string;
    };
  }>;
  Attends?: Array<{
    user_id: number;
    exam_id: number;
    startTime?: string;
    endTime?: string;
    User?: {
      name: string;
      email: string;
    };
  }>;
}

const SuperAdminDashboard = () => {
  const router = useRouter();
  
  // Use SWR hook for cached data fetching
  const { stats, isLoading, refresh } = useDashboardStats();

  const [ongoingExams, setOngoingExams] = useState<Exam[]>([]);
  const [scheduledExams, setScheduledExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [showAllOngoing, setShowAllOngoing] = useState(false);
  const [showAllScheduled, setShowAllScheduled] = useState(false);
  const [ongoingPage, setOngoingPage] = useState(1);
  const [scheduledPage, setScheduledPage] = useState(1);
  const ongoingPerPage = 3;
  const scheduledPerPage = 5;

  // Configure axios interceptor once
  useEffect(() => {
    configureAxiosInterceptor();
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const token = getTokenFromCookie();
        
        const response = await axios.get(`${base}/exam`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Exam API Response:", response.data);

        if (response.data && response.data.success) {
          const now = new Date();
          // Backend returns response.data.exams
          const exams = response.data.exams || [];

          console.log("Total exams fetched:", exams.length);

          // Filter ongoing exams (started but not ended)
          const ongoing = exams.filter((exam: Exam) => {
            try {
              if (!exam.start_time || !exam.end_time) return false;
              const startTime = new Date(exam.start_time);
              const endTime = new Date(exam.end_time);
              const isOngoing = startTime <= now && endTime >= now;
              if (isOngoing) {
                console.log("Ongoing exam found:", exam.exam_name, {
                  start: startTime,
                  end: endTime,
                  now
                });
              }
              return isOngoing;
            } catch (err) {
              console.error("Error parsing exam dates for:", exam.exam_name, err);
              return false;
            }
          });

          // Filter scheduled future exams (not started yet)
          const scheduled = exams.filter((exam: Exam) => {
            try {
              if (!exam.start_time) return false;
              const startTime = new Date(exam.start_time);
              const isScheduled = startTime > now;
              if (isScheduled) {
                console.log("Scheduled exam found:", exam.exam_name, {
                  start: startTime,
                  now
                });
              }
              return isScheduled;
            } catch (err) {
              console.error("Error parsing exam dates for:", exam.exam_name, err);
              return false;
            }
          }).sort((a: Exam, b: Exam) => {
            try {
              return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
            } catch (err) {
              return 0;
            }
          });

          console.log("Ongoing exams:", ongoing.length);
          console.log("Scheduled exams:", scheduled.length);

          setOngoingExams(ongoing);
          setScheduledExams(scheduled);
        } else {
          console.error("Unexpected API response structure:", response.data);
          setOngoingExams([]);
          setScheduledExams([]);
        }
      } catch (error) {
        console.error("Error fetching exams:", error);
        setOngoingExams([]);
        setScheduledExams([]);
      } finally {
        setLoadingExams(false);
      }
    };

    fetchExams();
    // Refresh every minute
    const interval = setInterval(fetchExams, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const getTimeLeft = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  };

  const getParticipationPercentage = (participants: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((participants / total) * 100);
  };

  // Pagination for ongoing exams
  const totalOngoingPages = Math.ceil(ongoingExams.length / ongoingPerPage);
  const displayedOngoingExams = showAllOngoing 
    ? ongoingExams.slice((ongoingPage - 1) * ongoingPerPage, ongoingPage * ongoingPerPage)
    : ongoingExams.slice(0, 2);

  // Pagination for scheduled exams
  const totalScheduledPages = Math.ceil(scheduledExams.length / scheduledPerPage);
  const displayedScheduledExams = showAllScheduled
    ? scheduledExams.slice((scheduledPage - 1) * scheduledPerPage, scheduledPage * scheduledPerPage)
    : scheduledExams.slice(0, 4);

  const handleLogout = () => {
    authLogout();
  };

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

  // Show full page loading screen only on initial load when both are loading
  if (isLoading && loadingExams) {
    console.log('🔄 Dashboard - showing loading screen');
    return (
      <SuperAdminGuard>
        <LoadingScreen message="Loading dashboard..." />
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .sidebar-nav-button {
          padding: 12px 16px;
          background: transparent;
          color: #64748b;
          border: none;
          border-radius: 10px;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          transition: all 0.2s ease;
        }
        .sidebar-nav-button:hover {
          background: #f1f5f9;
          color: #1e293b;
          padding-left: 20px;
        }
        .sidebar-nav-button.active {
          background: #0ea5e9;
          color: white;
        }
        .sidebar-logout-button {
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }
        .sidebar-logout-button:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #dc2626;
        }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "260px",
            background: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "fixed",
            height: "100vh",
            left: 0,
            top: 0,
            zIndex: 100,
            overflowY: "auto",
            willChange: "contents",
          }}
        >
          {/* Logo/Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "32px",
                padding: "0 8px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
                }}
              >
                <Shield size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
                  Super Admin
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Admin Portal
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button
                onClick={() => router.push("/superAdmin")}
                className="sidebar-nav-button active"
              >
                <LayoutDashboard size={18} />
                <span style={{ flex: 1 }}>Dashboard</span>
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "4px",
                    background: "white",
                    borderRadius: "10px 0 0 10px",
                  }}
                />
              </button>
              <button
                onClick={() => router.push("/superAdmin/admins")}
                className="sidebar-nav-button"
              >
                <Shield size={18} />
                Admin Management
              </button>
              <button
                onClick={() => router.push("/superAdmin/students")}
                className="sidebar-nav-button"
              >
                <UserCheck size={18} />
                Student Management
              </button>
            </nav>
          </div>

          {/* Logout at bottom */}
          <div>
            <button
              onClick={handleLogout}
              className="sidebar-logout-button"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ 
          marginLeft: "260px", 
          flex: 1, 
          padding: "32px",
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden"
        }}>
          {/* Modern Header */}
          <header style={{ marginBottom: "32px" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #ffffff, #f1f5f9)",
                borderRadius: "12px",
                padding: "32px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "white",
                      boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4)",
                    }}
                  >
                    <LayoutDashboard size={32} color="white" />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#1e293b" }}>
                      Good morning, Super Admin
                    </h1>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Stats Cards */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: "24px", 
            marginBottom: "32px"
          }}>
            {/* Total Admins */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "10px",
                    background: "rgba(59, 130, 246, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShieldCheck size={28} color="#3b82f6" strokeWidth={2} />
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#64748b", fontWeight: "500" }}>
                  Total Admins
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "#1e293b" }}>
                  {isLoading ? "..." : stats?.totalAdmins || 0}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#10b981" }}>
                  {stats?.activeAdmins || 0} Active
                </p>
              </div>
            </div>

            {/* Total Students */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <UsersRound size={28} color="#10b981" strokeWidth={2} />
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#64748b", fontWeight: "500" }}>
                  Total Students
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "#1e293b" }}>
                  {isLoading ? "..." : stats?.totalStudents || 0}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  Across all exams
                </p>
              </div>
            </div>

            {/* Total Exams */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "10px",
                    background: "rgba(245, 158, 11, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileText size={28} color="#f59e0b" strokeWidth={2} />
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#64748b", fontWeight: "500" }}>
                  Total Exams
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "#1e293b" }}>
                  {isLoading ? "..." : stats?.totalExams || 0}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                  All time
                </p>
              </div>
            </div>

            {/* Active Admins */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.08)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "10px",
                    background: "rgba(139, 92, 246, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle size={28} color="#8b5cf6" strokeWidth={2} />
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#64748b", fontWeight: "500" }}>
                  Active Admins
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "#1e293b" }}>
                  {isLoading ? "..." : stats?.activeAdmins || 0}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "#10b981" }}>
                  Currently online
                </p>
              </div>
            </div>
          </div>

          {/* Ongoing Exams Section */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
              marginBottom: "24px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10b981",
                    animation: "pulse 2s infinite",
                  }}
                />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1e293b" }}>
                  Ongoing Exams
                </h3>
                <span style={{ 
                  padding: "4px 12px", 
                  borderRadius: "12px", 
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#10b981",
                  fontSize: "12px",
                  fontWeight: "600"
                }}>
                  {ongoingExams.length} active
                </span>
              </div>
              {ongoingExams.length > 2 && (
                <button
                  onClick={() => {
                    setShowAllOngoing(!showAllOngoing);
                    setOngoingPage(1);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0ea5e9",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#0ea5e9";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#0ea5e9";
                  }}
                >
                  {showAllOngoing ? "Show Less" : `View All (${ongoingExams.length})`}
                </button>
              )}
            </div>

            {loadingExams ? (
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                padding: "60px 20px",
                color: "#64748b" 
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    border: "3px solid #e2e8f0",
                    borderTop: "3px solid #0ea5e9",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                    margin: "0 auto 12px"
                  }} />
                  <p style={{ fontSize: "14px", fontWeight: "500" }}>Loading exams...</p>
                </div>
              </div>
            ) : ongoingExams.length === 0 ? (
              <div style={{ 
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "60px 20px",
                color: "#64748b"
              }}>
                <div style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px"
                }}>
                  <Clock size={28} color="#64748b" />
                </div>
                <p style={{ fontSize: "15px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
                  No ongoing exams
                </p>
                <p style={{ fontSize: "13px", margin: 0 }}>
                  All exams are scheduled or completed
                </p>
              </div>
            ) : (
              <>
                <div style={{ 
                  overflowX: "auto",
                  margin: "0 -24px",
                  padding: "0 24px"
                }}>
                  <table style={{ 
                    width: "100%", 
                    borderCollapse: "separate", 
                    borderSpacing: "0",
                    minWidth: "600px"
                  }}>
                    <thead>
                      <tr>
                        <th style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          fontSize: "11px",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#64748b",
                          borderBottom: "1px solid #e2e8f0",
                          background: "#f1f5f9"
                        }}>
                          Exam Name
                        </th>
                        <th style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          fontSize: "11px",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#64748b",
                          borderBottom: "1px solid #e2e8f0",
                          background: "#f1f5f9"
                        }}>
                          Time Remaining
                        </th>
                        <th style={{
                          textAlign: "right",
                          padding: "12px 16px",
                          fontSize: "11px",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#64748b",
                          borderBottom: "1px solid #e2e8f0",
                          background: "#f1f5f9"
                        }}>
                          Participants
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedOngoingExams.map((exam, index) => {
                        const attendees = exam.attendances || [];
                        const participants = attendees.filter((a: any) => a.startTime).length;
                        
                        return (
                          <tr
                            key={exam.id}
                            style={{
                              borderBottom: index < displayedOngoingExams.length - 1 ? "1px solid #e2e8f0" : "none",
                              transition: "all 0.2s ease",
                              cursor: "pointer"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f1f5f9";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <td style={{ padding: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "8px",
                                  background: "rgba(14, 165, 233, 0.1)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0
                                }}>
                                  <Clock size={18} color="#0ea5e9" />
                                </div>
                                <div>
                                  <div style={{ 
                                    fontSize: "14px", 
                                    fontWeight: "600", 
                                    color: "#1e293b",
                                    marginBottom: "2px"
                                  }}>
                                    {exam.exam_name}
                                  </div>
                                  <div style={{
                                    fontSize: "12px",
                                    color: "#64748b"
                                  }}>
                                    ID: {exam.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ 
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                background: "rgba(245, 158, 11, 0.1)",
                                color: "#f59e0b",
                                fontSize: "13px",
                                fontWeight: "600"
                              }}>
                                <Clock size={14} />
                                <span>{getTimeLeft(exam.end_time)}</span>
                              </div>
                            </td>
                            <td style={{ padding: "16px", textAlign: "right" }}>
                              <div style={{ 
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                background: "#f1f5f9",
                                fontSize: "14px",
                                fontWeight: "600",
                                color: "#1e293b"
                              }}>
                                <Users size={16} color="#64748b" />
                                <span>{participants}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Ongoing Exams */}
                {showAllOngoing && totalOngoingPages > 1 && (
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center", 
                    marginTop: "20px",
                    paddingTop: "20px",
                    borderTop: "1px solid #e2e8f0"
                  }}>
                    <div style={{ 
                      fontSize: "13px",
                      color: "#64748b",
                      fontWeight: "500"
                    }}>
                      Showing {((ongoingPage - 1) * ongoingPerPage) + 1} to {Math.min(ongoingPage * ongoingPerPage, ongoingExams.length)} of {ongoingExams.length} exams
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        onClick={() => setOngoingPage(p => Math.max(1, p - 1))}
                        disabled={ongoingPage === 1}
                        style={{
                          padding: "6px 12px",
                          background: ongoingPage === 1 ? "transparent" : "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          color: ongoingPage === 1 ? "#64748b" : "#1e293b",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: ongoingPage === 1 ? "not-allowed" : "pointer",
                          opacity: ongoingPage === 1 ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (ongoingPage !== 1) {
                            e.currentTarget.style.background = "#f1f5f9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (ongoingPage !== 1) {
                            e.currentTarget.style.background = "#ffffff";
                          }
                        }}
                      >
                        Previous
                      </button>
                      <div style={{ 
                        display: "flex",
                        gap: "4px"
                      }}>
                        {Array.from({ length: totalOngoingPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setOngoingPage(page)}
                            style={{
                              minWidth: "32px",
                              height: "32px",
                              padding: "0 8px",
                              background: ongoingPage === page ? "#0ea5e9" : "transparent",
                              border: ongoingPage === page ? "none" : "1px solid #e2e8f0",
                              borderRadius: "6px",
                              color: ongoingPage === page ? "white" : "#1e293b",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (ongoingPage !== page) {
                                e.currentTarget.style.background = "#f1f5f9";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (ongoingPage !== page) {
                                e.currentTarget.style.background = "transparent";
                              }
                            }}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setOngoingPage(p => Math.min(totalOngoingPages, p + 1))}
                        disabled={ongoingPage === totalOngoingPages}
                        style={{
                          padding: "6px 12px",
                          background: ongoingPage === totalOngoingPages ? "transparent" : "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          color: ongoingPage === totalOngoingPages ? "#64748b" : "#1e293b",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: ongoingPage === totalOngoingPages ? "not-allowed" : "pointer",
                          opacity: ongoingPage === totalOngoingPages ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (ongoingPage !== totalOngoingPages) {
                            e.currentTarget.style.background = "#f1f5f9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (ongoingPage !== totalOngoingPages) {
                            e.currentTarget.style.background = "#ffffff";
                          }
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Scheduled Exams Section */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "12px" }}>
                  <Calendar size={20} color="#0ea5e9" />
                  Scheduled Exams
                </h3>
                <span style={{ 
                  padding: "4px 12px", 
                  borderRadius: "12px", 
                  background: "rgba(14, 165, 233, 0.1)",
                  color: "#0ea5e9",
                  fontSize: "12px",
                  fontWeight: "600"
                }}>
                  {scheduledExams.length} upcoming
                </span>
              </div>
              {scheduledExams.length > 4 && (
                <button
                  onClick={() => {
                    setShowAllScheduled(!showAllScheduled);
                    setScheduledPage(1);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0ea5e9",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#0ea5e9";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#0ea5e9";
                  }}
                >
                  {showAllScheduled ? "Show Less" : `View All (${scheduledExams.length})`}
                </button>
              )}
            </div>

            {loadingExams ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                Loading exams...
              </div>
            ) : scheduledExams.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                No scheduled exams
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                    <thead>
                      <tr style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        <th style={{ textAlign: "left", padding: "12px 16px", background: "#f1f5f9", borderRadius: "8px 0 0 8px" }}>EXAM NAME</th>
                        <th style={{ textAlign: "left", padding: "12px 16px", background: "#f1f5f9" }}>DATE & TIME</th>
                        <th style={{ textAlign: "left", padding: "12px 16px", background: "#f1f5f9" }}>DURATION</th>
                        <th style={{ textAlign: "left", padding: "12px 16px", background: "#f1f5f9" }}>STUDENTS</th>
                        <th style={{ textAlign: "center", padding: "12px 16px", background: "#f1f5f9", borderRadius: "0 8px 8px 0" }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedScheduledExams.map((exam) => {
                        const attendees = exam.attendances || [];
                        const totalStudents = attendees.length;
                        
                        return (
                          <tr
                            key={exam.id}
                            style={{
                              background: "#f1f5f9",
                              transition: "all 0.2s ease",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "#f1f5f9";
                            }}
                          >
                            <td style={{ padding: "16px", borderRadius: "8px 0 0 8px" }}>
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                                {exam.exam_name}
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ fontSize: "13px", color: "#1e293b", marginBottom: "4px" }}>
                                {formatDate(exam.start_time)}
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b" }}>
                                {formatTime(exam.start_time)}
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Clock size={14} color="#64748b" />
                                <span style={{ fontSize: "13px", color: "#1e293b" }}>
                                  {formatDuration(exam.duration)}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Users size={14} color="#64748b" />
                                <span style={{ fontSize: "13px", color: "#1e293b" }}>
                                  {totalStudents}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "16px", textAlign: "center", borderRadius: "0 8px 8px 0" }}>
                              <button
                                style={{
                                  padding: "8px",
                                  background: "transparent",
                                  border: "none",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  color: "#64748b",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#0ea5e9";
                                  e.currentTarget.style.color = "white";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.color = "#64748b";
                                }}
                              >
                                <MoreVertical size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Scheduled Exams */}
                {showAllScheduled && totalScheduledPages > 1 && (
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center", 
                    marginTop: "20px",
                    paddingTop: "20px",
                    borderTop: "1px solid #e2e8f0"
                  }}>
                    <div style={{ 
                      fontSize: "13px",
                      color: "#64748b",
                      fontWeight: "500"
                    }}>
                      Showing {((scheduledPage - 1) * scheduledPerPage) + 1} to {Math.min(scheduledPage * scheduledPerPage, scheduledExams.length)} of {scheduledExams.length} exams
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        onClick={() => setScheduledPage(p => Math.max(1, p - 1))}
                        disabled={scheduledPage === 1}
                        style={{
                          padding: "6px 12px",
                          background: scheduledPage === 1 ? "transparent" : "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          color: scheduledPage === 1 ? "#64748b" : "#1e293b",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: scheduledPage === 1 ? "not-allowed" : "pointer",
                          opacity: scheduledPage === 1 ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (scheduledPage !== 1) {
                            e.currentTarget.style.background = "#f1f5f9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (scheduledPage !== 1) {
                            e.currentTarget.style.background = "#ffffff";
                          }
                        }}
                      >
                        Previous
                      </button>
                      <div style={{ 
                        display: "flex",
                        gap: "4px"
                      }}>
                        {Array.from({ length: totalScheduledPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setScheduledPage(page)}
                            style={{
                              minWidth: "32px",
                              height: "32px",
                              padding: "0 8px",
                              background: scheduledPage === page ? "#0ea5e9" : "transparent",
                              border: scheduledPage === page ? "none" : "1px solid #e2e8f0",
                              borderRadius: "6px",
                              color: scheduledPage === page ? "white" : "#1e293b",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (scheduledPage !== page) {
                                e.currentTarget.style.background = "#f1f5f9";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (scheduledPage !== page) {
                                e.currentTarget.style.background = "transparent";
                              }
                            }}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setScheduledPage(p => Math.min(totalScheduledPages, p + 1))}
                        disabled={scheduledPage === totalScheduledPages}
                        style={{
                          padding: "6px 12px",
                          background: scheduledPage === totalScheduledPages ? "transparent" : "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          color: scheduledPage === totalScheduledPages ? "#64748b" : "#1e293b",
                          fontSize: "13px",
                          fontWeight: "600",
                          cursor: scheduledPage === totalScheduledPages ? "not-allowed" : "pointer",
                          opacity: scheduledPage === totalScheduledPages ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (scheduledPage !== totalScheduledPages) {
                            e.currentTarget.style.background = "#f1f5f9";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (scheduledPage !== totalScheduledPages) {
                            e.currentTarget.style.background = "#ffffff";
                          }
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>


        </div>
      </div>
    </SuperAdminGuard>
  );
};

export default SuperAdminDashboard;
