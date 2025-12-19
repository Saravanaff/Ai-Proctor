import React, { useState, useEffect, useMemo } from "react";
import styles from "../../styles/CreateExamPage.module.css";
import { Exam } from "../../types/exam";

import ExamsGrid from "../../components/exams/ExamsGrid";
import ExamResultsModal from "../../components/exams/ExamResultsModal";
import { ExaminerGuard } from "../../components/guards";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { configureAxiosInterceptor } from "@/utils/axiosConfig";
import { logout as authLogout, getUserName, getUserInitials } from "@/utils/auth";
import { useRouter } from "next/router";
import { LayoutDashboard, Plus, Users, CheckCircle, AlertCircle, Clock, FileText, Search } from "lucide-react";
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
    // Set theme background using CSS variables
    document.body.style.background = "var(--background)";
    document.body.style.minHeight = "100vh";
    document.documentElement.style.background = "var(--background)";

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
          background: "var(--background)",
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        {/* Top Navigation Bar */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "var(--navbar-bg)",
            borderBottom: "1px solid var(--border-color)",
            padding: "0 32px",
            height: "64px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 1px 2px var(--shadow)",
          }}
        >
          {/* Logo and Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "var(--primary-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <LayoutDashboard size={18} />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "var(--text-primary)",
                }}
              >
                Examiner Portal
              </h1>
            </div>
          </div>

          {/* Right Side - Navigation, Theme Toggle, Profile, Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            {/* Navigation Buttons */}
            <nav style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => router.push("/examiner")}
                style={{
                  padding: "8px 12px",
                  background: "var(--primary-bg-light)",
                  color: "var(--primary-color)",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Dashboard
              </button>
            </nav>

            <button
              onClick={() => router.push("/examiner/NewExam")}
              style={{
                padding: "8px 16px",
                background: "var(--primary-color)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--primary-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--primary-color)";
              }}
            >
              <Plus size={16} />
              Create Exam
            </button>

            {/* Divider */}
            <div
              style={{
                width: "1px",
                height: "24px",
                background: "var(--border-color)",
              }}
            />

            {/* User Profile */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "var(--secondary-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                {profileInitials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "var(--text-primary)",
                  }}
                >
                  {profileName || "User"}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div style={{ padding: "32px", maxWidth: "100%", margin: "0 auto" }}>
          
          <div style={{ marginBottom: "32px" }}>
             <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>Overview</h2>
             <p style={{ color: "var(--text-secondary)", margin: 0 }}>Manage your examinations and view performance stats.</p>
          </div>

          {/* Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "16px",
            marginBottom: "40px"
          }}>
            {/* Total */}
            <div style={{
              background: "var(--card-bg)",
              borderRadius: "8px",
              padding: "20px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 2px var(--shadow)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                 <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Exams</span>
                 <FileText size={16} color="var(--text-tertiary)" />
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>{stats.total}</div>
            </div>

            {/* Active */}
            <div style={{
              background: "var(--card-bg)",
              borderRadius: "8px",
              padding: "20px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 2px var(--shadow)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                 <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Active</span>
                 <Users size={16} color="var(--success-color)" />
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>{stats.active}</div>
            </div>

            {/* Suspended */}
            <div style={{
              background: "var(--card-bg)",
              borderRadius: "8px",
              padding: "20px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 2px var(--shadow)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                 <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Suspended</span>
                 <AlertCircle size={16} color="var(--error-color)" />
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>{stats.suspended}</div>
            </div>

            {/* Future */}
            <div style={{
              background: "var(--card-bg)",
              borderRadius: "8px",
              padding: "20px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 2px var(--shadow)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                 <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Scheduled</span>
                 <Clock size={16} color="var(--info-color)" />
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>{stats.future}</div>
            </div>

            {/* Completed */}
            <div style={{
              background: "var(--card-bg)",
              borderRadius: "8px",
              padding: "20px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 2px var(--shadow)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                 <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Completed</span>
                 <CheckCircle size={16} color="var(--text-secondary)" />
              </div>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>{stats.completed}</div>
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
            <div style={{ display: "flex", gap: "8px", background: "var(--input-bg)", padding: "4px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              {/* Filter Buttons */}
              {["all", "active", "suspended"].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    setFilterStatus(status as "all" | "active" | "suspended")
                  }
                  style={{
                    padding: "6px 16px",
                    borderRadius: "6px",
                    border: "none",
                    background: filterStatus === status ? "var(--secondary-bg)" : "transparent",
                    color: filterStatus === status ? "var(--text-primary)" : "var(--text-secondary)",
                    boxShadow: filterStatus === status ? "0 1px 2px var(--shadow)" : "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    transition: "all 0.2s ease",
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, maxWidth: "320px" }}>
              <div style={{ position: "relative" }}>
                 <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
                 <input 
                    type="text" 
                    placeholder="Search exams..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                       width: "100%",
                       padding: "10px 10px 10px 36px",
                       borderRadius: "8px",
                       border: "1px solid var(--border-color)",
                       fontSize: "14px",
                       outline: "none",
                       background: "var(--input-bg)",
                       color: "var(--text-primary)"
                    }}
                 />
              </div>
            </div>
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
                background: "var(--card-bg)",
                borderRadius: "12px",
                padding: "64px 32px",
                textAlign: "center",
                border: "1px solid var(--border-color)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px"
              }}>
                <div style={{ 
                   width: "64px", height: "64px", background: "var(--secondary-bg)", borderRadius: "50%", 
                   display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)"
                }}>
                   <FileText size={32} />
                </div>
                <div>
                   <h3 style={{
                     color: "var(--text-primary)",
                     fontSize: "16px",
                     fontWeight: 600,
                     marginBottom: "4px",
                   }}>
                     No exams found
                   </h3>
                   <p style={{
                     color: "var(--text-secondary)",
                     fontSize: "14px",
                     margin: 0,
                   }}>
                     {search ? "Adjust your search terms" : "Get started by creating your first exam"}
                   </p>
                </div>
                {filterStatus !== "suspended" && !search && (
                  <button
                    onClick={() => router.push("/examiner/NewExam")}
                    style={{
                      padding: "8px 16px",
                      background: "var(--primary-color)",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "8px"
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

