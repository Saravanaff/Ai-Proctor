import React, { useState, useEffect, useMemo } from "react";
import styles from "../../styles/CreateExamPage.module.css";
import { Exam } from "../../types/exam";
import SearchBar from "../../components/exams/SearchBar";
import ExamStats from "../../components/exams/ExamStats";
import ExamsGrid from "../../components/exams/ExamsGrid";
import ExamResultsModal from "../../components/exams/ExamResultsModal";
import { ThemeToggle } from "../../components/ThemeToggle";
import { ExaminerGuard } from "../../components/guards";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { useRouter } from "next/router";
import { LayoutDashboard, Plus } from "lucide-react";

const CreateExam = () => {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
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

  axios.interceptors.request.use(
    (config) => {
      const token = getTokenFromCookie();
      if (token) {
        // ensure headers exists and use a safe cast to avoid incompatible type assignment
        config.headers = config.headers ?? ({} as any);

        // Axios may use AxiosHeaders instance or plain object; handle both safely
        if (typeof (config.headers as any).set === "function") {
          // AxiosHeaders API
          (config.headers as any).set("Authorization", `Bearer ${token}`);
        } else {
          // plain object
          (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  useEffect(() => {
    let cancelled = false;
    const fetchExams = async () => {
      setLoading(true);
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
      } catch (e: unknown) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
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
    try {
      // clear token cookie (adjust cookie name if different)
      document.cookie =
        "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      // clear known localStorage keys (if your AuthStore uses others, remove them too)
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("globalName");
    } finally {
      // redirect to login page
      window.location.href = "/";
    }
  };

  // Parse JWT payload to get user name (safe decode)
  useEffect(() => {
    try {
      const token = getTokenFromCookie();
      if (!token) return;
      const parts = token.split(".");
      if (parts.length < 2) return;
      const payload = parts[1];
      // Add padding if needed for base64
      const pad = payload.length % 4;
      const adjusted = payload + (pad ? "=".repeat(4 - pad) : "");
      const decoded = JSON.parse(window.atob(adjusted));
      const name =
        decoded?.name ||
        decoded?.fullname ||
        decoded?.username ||
        decoded?.email ||
        null;
      if (name) {
        setProfileName(name);
        const initials = name
          .split(" ")
          .map((p: string) => p.charAt(0).toUpperCase())
          .slice(0, 2)
          .join("");
        setProfileInitials(initials || "U");
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleCloseResultsModal = () => {
    setSelectedExamForResults(null);
  };

  return (
    <ExaminerGuard>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          background: "var(--background)",
        }}
      >
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
                  background:
                    "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
                }}
              >
                EX
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                  }}
                >
                  Examiner
                </div>
                <div
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  Exam Portal
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              <button
                onClick={() => router.push("/examiner")}
                style={{
                  padding: "12px 16px",
                  background: "var(--accent-color)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden",
                }}
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
                onClick={() => router.push("/examiner/NewExam")}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "none",
                  borderRadius: "10px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.paddingLeft = "20px";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.paddingLeft = "16px";
                }}
              >
                <Plus size={18} />
                New Exam
              </button>
            </nav>
          </div>

          {/* Logout at bottom */}
          <div>
            <div style={{ marginBottom: "16px", padding: "0 8px" }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "var(--accent-color)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  {profileInitials}
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {profileName || "User"}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--danger-bg)";
                e.currentTarget.style.color = "var(--danger-color)";
                e.currentTarget.style.borderColor = "var(--danger-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              <span style={{ fontSize: "18px" }}>🚪</span>
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ marginLeft: "260px", flex: 1, padding: "32px" }}>
          <style jsx>{`
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
          `}</style>
          {/* Header */}
          <header style={{ marginBottom: "32px" }}>
            <div
              style={{
                background:
                  "linear-gradient(135deg, var(--card-bg), var(--secondary-bg))",
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
                  background:
                    "linear-gradient(90deg, var(--accent-color), var(--primary-color))",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "20px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "20px" }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "16px",
                      background:
                        "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                      fontWeight: "700",
                      color: "white",
                      boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4)",
                    }}
                  >
                    EX
                  </div>
                  <div>
                    <h1
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "28px",
                        fontWeight: "700",
                        color: "var(--text-primary)",
                      }}
                    >
                      Exam Management
                    </h1>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                      }}
                    >
                      Create, monitor and manage assessments
                    </p>
                  </div>
                </div>

                <div
                  style={{ display: "flex", gap: "16px", alignItems: "center" }}
                >
                  <ThemeToggle />
                  <button
                    onClick={() => router.push("/examiner/NewExam")}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>+</span> New Exam
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Stats */}
          <div style={{ marginBottom: "32px" }}>
            <ExamStats stats={stats} />
          </div>

          {/* Filters and Search */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
              gap: "16px",
              flexWrap: "wrap",
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
                    border: "1px solid var(--border-color)",
                    background:
                      filterStatus === status
                        ? status === "active"
                          ? "var(--success-color)"
                          : status === "suspended"
                          ? "var(--error-color)"
                          : "var(--accent-color)"
                        : "transparent",
                    color:
                      filterStatus === status
                        ? "white"
                        : "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                    textTransform: "capitalize",
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

          {/* Content */}
          <section
            className={styles.examsSection}
            style={{ background: "transparent", padding: 0 }}
          >
            <div
              className={styles.sectionHeader}
              style={{ marginBottom: "16px" }}
            >
              <h2
                className={styles.sectionTitle}
                style={{
                  color: "var(--text-primary)",
                  fontSize: "20px",
                  fontWeight: "600",
                  margin: 0,
                }}
              >
                Exams ({filteredExams.length})
              </h2>
              {search && (
                <span
                  className={styles.filterInfo}
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  Filtered by: &quot;{search}&quot;
                </span>
              )}
            </div>

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
              <div className={`${styles.emptyState} ${styles.glassPanel}`}>
                <div className={styles.emptyContent}>
                  <div
                    className={styles.emptyIcon}
                    style={{ fontSize: "48px", marginBottom: "16px" }}
                  >
                    {filterStatus === "suspended" ? "🚫" : "📁"}
                  </div>
                  <h3
                    className={styles.emptyTitle}
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "18px",
                      fontWeight: 600,
                      marginBottom: "8px",
                    }}
                  >
                    {filterStatus === "suspended" 
                      ? "No Suspended Exams" 
                      : filterStatus === "active"
                      ? "No Active Exams"
                      : "No Exams Found"}
                  </h3>
                  <p
                    className={styles.emptyDescription}
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "14px",
                      marginBottom: "24px",
                    }}
                  >
                    {filterStatus === "suspended"
                      ? "No exams are currently suspended or expired."
                      : search
                      ? "Try adjusting your search criteria."
                      : "Get started by creating your first exam."}
                  </p>
                  {filterStatus !== "suspended" && (
                    <button
                      onClick={() => router.push("/examiner/NewExam")}
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      <Plus size={16} /> Create Exam
                    </button>
                  )}
                </div>
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
