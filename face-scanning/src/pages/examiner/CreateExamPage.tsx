import React, { useState, useEffect, useMemo } from "react";
import styles from "../../styles/CreateExamPage.module.css";
import { Exam } from "../../types/exam";
import SearchBar from "../../components/exams/SearchBar";
import ExamsGrid from "../../components/exams/ExamsGrid";
import ExamResultsModal from "../../components/exams/ExamResultsModal";
import { ExaminerGuard } from "../../components/guards";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { configureAxiosInterceptor } from "@/utils/axiosConfig";
import { logout as authLogout, getUserName, getUserInitials } from "@/utils/auth";
import { useRouter } from "next/router";
import { LayoutDashboard, Plus } from "lucide-react";
import { LoadingScreen } from "@/components/PageTransition";

const CreateExam = () => {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "suspended"
  >("all");
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileInitials, setProfileInitials] = useState<string>("U");
  const [selectedExamForResults, setSelectedExamForResults] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Configure axios interceptor once
  useEffect(() => {
    configureAxiosInterceptor();
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    const fetchExams = async () => {
      console.log("📊 Fetching exams...");
      setLoading(true);
      const startTime = Date.now();
      
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await axios.get(`${base}/exam`);
        console.log("re", res);
        if (!cancelled && res.data?.success && res.data?.exams) {
          const examsWithParticipants = res.data.exams.map(
            (exam: Record<string, unknown>) => ({
              ...exam,
              participants: Array.isArray(exam.attendances)
                ? exam.attendances.length
                : 0,
              status: (exam.status as string) || "active", // Default to active if not provided
              exam_key: (exam.key as string) || (exam.exam_key as string), // Normalize key field
              startTime:
                (exam.startTime as string) || (exam.start_time as string),
              endTime: (exam.endTime as string) || (exam.end_time as string),
            })
          );
          setExams(examsWithParticipants);
        }
        
        // Ensure minimum display time of 500ms for loading screen
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 500 - elapsedTime);
        
        await new Promise(resolve => setTimeout(resolve, remainingTime));
        console.log("✅ Exams loaded");
      } catch (e: unknown) {
        console.error(e);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    };
    fetchExams();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStatusChange = async (examId: number, newStatus: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      await axios.put(`${base}/exam/${examId}/status`, { status: newStatus });

      // Update local state
      setExams((prevExams) =>
        prevExams.map((exam) =>
          exam.id === examId
            ? { ...exam, status: newStatus as Exam["status"] }
            : exam
        )
      );
    } catch (err) {
      console.error("Failed to update status:", err);
      // Optionally show an error message
    }
  };

  const handleDeleteExam = async (examId: number) => {
    if (!confirm("Are you sure you want to delete this exam? This action cannot be undone.")) {
      return;
    }

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      await axios.delete(`${base}/exam/${examId}`);

      // Remove exam from local state
      setExams((prevExams) => prevExams.filter((exam) => exam.id !== examId));
      
      alert("Exam deleted successfully!");
    } catch (err) {
      console.error("Failed to delete exam:", err);
      alert("Failed to delete exam. Please try again.");
    }
  };

  const filteredExams = useMemo(
    () =>
      exams.filter((e) => {
        const examName =
          (e as unknown as { exam_name?: string; name?: string }).exam_name ||
          e.name ||
          "";
        const matchesSearch = examName
          .toLowerCase()
          .includes(search.toLowerCase());
        
        // Check if exam is expired
        const now = new Date();
        const end = 
          e.endTime || (e as unknown as { end_time?: string }).end_time;
        const isExpired = end && new Date(end) < now;
        
        // Determine if exam should be shown based on filter
        let matchesFilter: boolean;
        if (filterStatus === "all") {
          matchesFilter = true;
        } else if (filterStatus === "suspended") {
          // Show exams that are suspended OR expired
          matchesFilter = e.status === "suspended" || (e.status === "active" && !!isExpired);
        } else if (filterStatus === "active") {
          // Show only active exams that are not expired
          const start = e.startTime || (e as unknown as { start_time?: string }).start_time;
          const isFuture = start && new Date(start) > now;
          matchesFilter = e.status === "active" && !isExpired && !isFuture;
        } else {
          matchesFilter = e.status === filterStatus;
        }
        
        return matchesSearch && matchesFilter;
      }),
    [exams, search, filterStatus]
  );
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: exams.length,
      active: exams.filter((e) => {
        const start =
          e.startTime || (e as unknown as { start_time?: string }).start_time;
        const end = 
          e.endTime || (e as unknown as { end_time?: string }).end_time;
        const isFuture = start && new Date(start) > now;
        const isExpired = end && new Date(end) < now;
        return e.status === "active" && !isFuture && !isExpired;
      }).length,
      suspended: exams.filter((e) => {
        const end = 
          e.endTime || (e as unknown as { end_time?: string }).end_time;
        const isExpired = end && new Date(end) < now;
        // Show as suspended if status is suspended OR if exam has expired
        return e.status === "suspended" || (e.status === "active" && isExpired);
      }).length,
      future: exams.filter((e) => {
        const start =
          e.startTime || (e as unknown as { start_time?: string }).start_time;
        return e.status === "active" && start && new Date(start) > now;
      }).length,
      completed: exams.filter((e) => e.status === "completed").length,
    };
  }, [exams]);

  const formatRange = (s?: string, e?: string) => {
    if (!s || !e) return "—";
    const sd = new Date(s);
    const ed = new Date(e);
    return `${sd.toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    })} → ${ed.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`;
  };

  const handleLogout = () => {
    authLogout();
  };

  // Parse JWT payload to get user name (safe decode)
  useEffect(() => {
    const name = getUserName();
    if (name) {
      setProfileName(name);
      setProfileInitials(getUserInitials());
    }
  }, []);

  const handleCloseResultsModal = () => {
    setSelectedExamForResults(null);
  };

  if (initialLoading) {
    return <LoadingScreen message="Loading exams..." />;
  }

  return (
    <ExaminerGuard>
      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
        }}
      >
        {/* Top Navigation Bar */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "white",
            borderBottom: "1px solid #e2e8f0",
            padding: "16px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Logo and Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#0ea5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: "700",
                color: "white",
              }}
            >
              EX
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#0f172a",
                }}
              >
                Exam Dashboard
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                Examiner Portal
              </p>
            </div>
          </div>

          {/* Right Side - Navigation, Theme Toggle, Profile, Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Navigation Buttons */}
            <button
              onClick={() => router.push("/examiner")}
              style={{
                padding: "10px 20px",
                background: "transparent",
                color: "#64748b",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>

            <button
              onClick={() => router.push("/examiner/NewExam")}
              style={{
                padding: "10px 20px",
                background: "#0ea5e9",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#0284c7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0ea5e9";
              }}
            >
              <Plus size={16} />
              New Exam
            </button>

            {/* Divider */}
            <div
              style={{
                width: "1px",
                height: "32px",
                background: "#e2e8f0",
              }}
            />

            {/* User Profile */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#0ea5e9",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                {profileInitials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#0f172a",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "150px",
                  }}
                >
                  {profileName || "User"}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  Examiner
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                padding: "10px 16px",
                background: "transparent",
                color: "#ef4444",
                border: "1px solid #fee2e2",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fef2f2";
                e.currentTarget.style.borderColor = "#fecaca";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "#fee2e2";
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
          {/* Stats */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(5, 1fr)", 
            gap: "20px", 
            marginBottom: "32px" 
          }}>
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ 
                fontSize: "36px", 
                fontWeight: "700", 
                color: "#0f172a",
                marginBottom: "8px",
              }}>
                {stats.total}
              </div>
              <div style={{ 
                fontSize: "13px", 
                fontWeight: "600", 
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                TOTAL
              </div>
            </div>

            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ 
                fontSize: "36px", 
                fontWeight: "700", 
                color: "#22c55e",
                marginBottom: "8px",
              }}>
                {stats.active}
              </div>
              <div style={{ 
                fontSize: "13px", 
                fontWeight: "600", 
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                ACTIVE
              </div>
            </div>

            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ 
                fontSize: "36px", 
                fontWeight: "700", 
                color: "#ef4444",
                marginBottom: "8px",
              }}>
                {stats.suspended}
              </div>
              <div style={{ 
                fontSize: "13px", 
                fontWeight: "600", 
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                SUSPENDED
              </div>
            </div>

            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ 
                fontSize: "36px", 
                fontWeight: "700", 
                color: "#3b82f6",
                marginBottom: "8px",
              }}>
                {stats.future}
              </div>
              <div style={{ 
                fontSize: "13px", 
                fontWeight: "600", 
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                FUTURE
              </div>
            </div>

            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ 
                fontSize: "36px", 
                fontWeight: "700", 
                color: "#64748b",
                marginBottom: "8px",
              }}>
                {stats.completed}
              </div>
              <div style={{ 
                fontSize: "13px", 
                fontWeight: "600", 
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                COMPLETED
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              {/* Filter Buttons */}
              {["all", "active", "suspended"].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setFilterStatus(status as "all" | "active" | "suspended")
                  }
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: filterStatus === status ? "#0ea5e9" : "white",
                    color: filterStatus === status ? "white" : "#64748b",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    transition: "all 0.2s ease",
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, maxWidth: "400px" }}>
              <SearchBar value={search} onChange={setSearch} />
            </div>
          </div>

          {/* Exams Header */}
          <div style={{ marginBottom: "16px" }}>
            <h2
              style={{
                color: "#0f172a",
                fontSize: "18px",
                fontWeight: "600",
                margin: 0,
              }}
            >
              Exams ({filteredExams.length})
            </h2>
          </div>

          {/* Content */}
          <section style={{ background: "transparent", padding: 0 }}>
            {loading && (
              <div className={styles.skeletonGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${styles.examCard} ${styles.skeletonCard} ${styles.shimmer}`}
                  />
                ))}
              </div>
            )}

            {!loading && filteredExams.length === 0 && (
              <div style={{
                background: "white",
                borderRadius: "12px",
                padding: "64px 32px",
                textAlign: "center",
                border: "1px solid #e2e8f0",
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  {filterStatus === "suspended" ? "🚫" : "📁"}
                </div>
                <h3 style={{
                  color: "#0f172a",
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}>
                  {filterStatus === "suspended" 
                    ? "No Suspended Exams" 
                    : filterStatus === "active"
                    ? "No Active Exams"
                    : "No Exams Found"}
                </h3>
                <p style={{
                  color: "#64748b",
                  fontSize: "14px",
                  marginBottom: "24px",
                }}>
                  {filterStatus === "suspended"
                    ? "No exams are currently suspended or expired."
                    : search
                    ? "Try adjusting your search criteria."
                    : "Get started by creating your first exam."}
                </p>
                {filterStatus !== "suspended" && (
                  <button
                    onClick={() => router.push("/examiner/NewExam")}
                    style={{
                      padding: "10px 20px",
                      background: "#0ea5e9",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Plus size={16} /> Create Exam
                  </button>
                )}
              </div>
            )}

            {!loading && filteredExams.length > 0 && (
              <ExamsGrid
                exams={filteredExams}
                formatRange={formatRange}
                onViewResults={(exam) => {
                  setSelectedExamForResults({
                    id: exam.id,
                    name:
                      (exam as unknown as { exam_name?: string; name?: string })
                        .exam_name || exam.name,
                  });
                }}
                onDelete={handleDeleteExam}
              />
            )}
          </section>
        </div>

        {/* Exam Results Modal */}
        {selectedExamForResults && (
          <ExamResultsModal
            examId={selectedExamForResults.id}
            examName={selectedExamForResults.name}
            onClose={handleCloseResultsModal}
          />
        )}
      </div>
    </ExaminerGuard>
  );
};

export default CreateExam;

