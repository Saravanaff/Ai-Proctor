import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/CreateExamPage.module.css";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SuperAdminGuard } from "../../components/guards";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { configureAxiosInterceptor } from "@/utils/axiosConfig";
import { logout as authLogout } from "@/utils/auth";
import { Users, GraduationCap, FileText, CheckCircle, Plus, Clock, Calendar, MoreVertical } from "lucide-react";
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
        .sidebar-nav-button {
          padding: 12px 16px;
          background: transparent;
          color: var(--text-secondary);
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
          background: var(--secondary-bg);
          color: var(--text-primary);
          padding-left: 20px;
        }
        .sidebar-nav-button.active {
          background: var(--accent-color);
          color: white;
        }
        .sidebar-logout-button {
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
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
          background: var(--danger-bg);
          color: var(--danger-color);
          border-color: var(--danger-color);
        }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)", overflow: "hidden" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "260px",
            background: "var(--card-bg)",
            borderRight: "1px solid var(--border-color)",
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
                  background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
                }}
              >
                SA
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                  Super Admin
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
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
                Admin Management
              </button>
              <button
                onClick={() => router.push("/superAdmin/students")}
                className="sidebar-nav-button"
              >
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
                background: "linear-gradient(135deg, var(--card-bg), var(--secondary-bg))",
                borderRadius: "24px",
                padding: "32px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 8px 32px var(--shadow)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "5px",
                  background: "linear-gradient(90deg, var(--accent-color), var(--primary-color))",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "white",
                      boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4)",
                    }}
                  >
                    SA
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "var(--text-primary)" }}>
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
                background: "var(--card-bg)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px var(--shadow)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px var(--shadow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px var(--shadow)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  <Users size={24} color="white" />
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Total Admins
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {isLoading ? "..." : stats?.totalAdmins || 0}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "var(--success-color)" }}>
                  {stats?.activeAdmins || 0} Active
                </p>
              </div>
            </div>

            {/* Total Students */}
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px var(--shadow)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px var(--shadow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px var(--shadow)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  <GraduationCap size={24} color="white" />
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Total Students
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {isLoading ? "..." : stats?.totalStudents || 0}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                  Across all exams
                </p>
              </div>
            </div>

            {/* Total Exams */}
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px var(--shadow)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px var(--shadow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px var(--shadow)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  <FileText size={24} color="white" />
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Total Exams
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {isLoading ? "..." : stats?.totalExams || 0}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                  All time
                </p>
              </div>
            </div>

            {/* Active Admins */}
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px var(--shadow)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px var(--shadow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px var(--shadow)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  <CheckCircle size={24} color="white" />
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Active Admins
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {isLoading ? "..." : stats?.activeAdmins || 0}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "var(--success-color)" }}>
                  Currently online
                </p>
              </div>
            </div>
          </div>

          {/* Ongoing Exams Section */}
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 4px 20px var(--shadow)",
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
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
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
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--accent-color)",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent-color)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--accent-color)";
                  }}
                >
                  {showAllOngoing ? "Show Less" : `View All (${ongoingExams.length})`}
                </button>
              )}
            </div>

            {loadingExams ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                Loading exams...
              </div>
            ) : ongoingExams.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                No ongoing exams at the moment
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {displayedOngoingExams.map((exam) => {
                    // Backend returns 'attendances' property (lowercase)
                    const attendees = exam.attendances || [];
                    const totalStudents = attendees.length;
                    const participants = attendees.filter((a: any) => a.startTime).length;
                    
                    console.log("Exam:", exam.exam_name);
                    console.log("Exam object keys:", Object.keys(exam));
                    console.log("Total attendees:", totalStudents);
                    console.log("Attendees data:", attendees);
                    console.log("Participants with startTime:", participants);
                    
                    return (
                      <div
                        key={exam.id}
                        style={{
                          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))",
                          borderRadius: "12px",
                          padding: "20px",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateX(4px)";
                          e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.5)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.2)";
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "8px",
                                  background: "linear-gradient(135deg, #10b981, #059669)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Clock size={18} color="white" />
                              </div>
                              <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>
                                {exam.exam_name}
                              </h4>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f59e0b", fontSize: "13px", fontWeight: "500" }}>
                              <Clock size={14} />
                              <span>{getTimeLeft(exam.end_time)}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                Participants
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Users size={16} color="var(--text-secondary)" />
                                <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                                  {participants}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination for Ongoing Exams */}
                {showAllOngoing && totalOngoingPages > 1 && (
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    gap: "12px", 
                    marginTop: "24px",
                    paddingTop: "20px",
                    borderTop: "1px solid var(--border-color)"
                  }}>
                    <button
                      onClick={() => setOngoingPage(p => Math.max(1, p - 1))}
                      disabled={ongoingPage === 1}
                      style={{
                        padding: "8px 16px",
                        background: "var(--secondary-bg)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: ongoingPage === 1 ? "not-allowed" : "pointer",
                        opacity: ongoingPage === 1 ? 0.5 : 1,
                        transition: "all 0.3s ease",
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      Page {ongoingPage} of {totalOngoingPages}
                    </span>
                    <button
                      onClick={() => setOngoingPage(p => Math.min(totalOngoingPages, p + 1))}
                      disabled={ongoingPage === totalOngoingPages}
                      style={{
                        padding: "8px 16px",
                        background: "var(--secondary-bg)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: ongoingPage === totalOngoingPages ? "not-allowed" : "pointer",
                        opacity: ongoingPage === totalOngoingPages ? 0.5 : 1,
                        transition: "all 0.3s ease",
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Scheduled Exams Section */}
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 4px 20px var(--shadow)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "12px" }}>
                  <Calendar size={20} color="var(--accent-color)" />
                  Scheduled Exams
                </h3>
                <span style={{ 
                  padding: "4px 12px", 
                  borderRadius: "12px", 
                  background: "rgba(14, 165, 233, 0.1)",
                  color: "var(--accent-color)",
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
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--accent-color)",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent-color)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--accent-color)";
                  }}
                >
                  {showAllScheduled ? "Show Less" : `View All (${scheduledExams.length})`}
                </button>
              )}
            </div>

            {loadingExams ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                Loading exams...
              </div>
            ) : scheduledExams.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
                No scheduled exams
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                    <thead>
                      <tr style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        <th style={{ textAlign: "left", padding: "12px 16px", background: "var(--secondary-bg)", borderRadius: "8px 0 0 8px" }}>EXAM NAME</th>
                        <th style={{ textAlign: "left", padding: "12px 16px", background: "var(--secondary-bg)" }}>DATE & TIME</th>
                        <th style={{ textAlign: "left", padding: "12px 16px", background: "var(--secondary-bg)" }}>DURATION</th>
                        <th style={{ textAlign: "left", padding: "12px 16px", background: "var(--secondary-bg)" }}>STUDENTS</th>
                        <th style={{ textAlign: "center", padding: "12px 16px", background: "var(--secondary-bg)", borderRadius: "0 8px 8px 0" }}>ACTIONS</th>
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
                              background: "var(--secondary-bg)",
                              transition: "all 0.2s ease",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "var(--hover-bg)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "var(--secondary-bg)";
                            }}
                          >
                            <td style={{ padding: "16px", borderRadius: "8px 0 0 8px" }}>
                              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                                {exam.exam_name}
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ fontSize: "13px", color: "var(--text-primary)", marginBottom: "4px" }}>
                                {formatDate(exam.start_time)}
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                {formatTime(exam.start_time)}
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Clock size={14} color="var(--text-secondary)" />
                                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                                  {formatDuration(exam.duration)}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <Users size={14} color="var(--text-secondary)" />
                                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
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
                                  color: "var(--text-secondary)",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--accent-color)";
                                  e.currentTarget.style.color = "white";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.color = "var(--text-secondary)";
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
                    justifyContent: "center", 
                    alignItems: "center", 
                    gap: "12px", 
                    marginTop: "24px",
                    paddingTop: "20px",
                    borderTop: "1px solid var(--border-color)"
                  }}>
                    <button
                      onClick={() => setScheduledPage(p => Math.max(1, p - 1))}
                      disabled={scheduledPage === 1}
                      style={{
                        padding: "8px 16px",
                        background: "var(--secondary-bg)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: scheduledPage === 1 ? "not-allowed" : "pointer",
                        opacity: scheduledPage === 1 ? 0.5 : 1,
                        transition: "all 0.3s ease",
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                      Page {scheduledPage} of {totalScheduledPages}
                    </span>
                    <button
                      onClick={() => setScheduledPage(p => Math.min(totalScheduledPages, p + 1))}
                      disabled={scheduledPage === totalScheduledPages}
                      style={{
                        padding: "8px 16px",
                        background: "var(--secondary-bg)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        color: "var(--text-primary)",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: scheduledPage === totalScheduledPages ? "not-allowed" : "pointer",
                        opacity: scheduledPage === totalScheduledPages ? 0.5 : 1,
                        transition: "all 0.3s ease",
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Floating Theme Toggle */}
          <div
            style={{
              position: "fixed",
              right: 20,
              bottom: 20,
              zIndex: 1200,
            }}
          >
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: 12,
                padding: 8,
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
              }}
            >
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </SuperAdminGuard>
  );
};

export default SuperAdminDashboard;
