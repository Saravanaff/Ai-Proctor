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
import { getUserId, getTokenFromCookie } from "@/constants/AuthStore";
import { useRouter } from "next/router";

const CreateExam = () => {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState("");
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
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  useEffect(() => {
    let cancelled = false;
    const fetchExams = async () => {
      setLoading(true);
      setError(null);
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await axios.get(`${base}/exam`);
        console.log("re", res);
        if (!cancelled && res.data?.success && res.data?.exams) {
          const examsWithParticipants = res.data.exams.map((exam: any) => ({
            ...exam,
            participants: exam.attendances ? exam.attendances.length : 0,
            status: exam.status || "draft", // Default status if not provided
            exam_key: exam.key || exam.exam_key, // Normalize key field
            startTime: exam.startTime || exam.start_time,
            endTime: exam.endTime || exam.end_time,
          }));
          setExams(examsWithParticipants);
        }
      } catch (e: any) {
        if (!cancelled)
          setError(
            e?.response?.data?.message || e.message || "Failed to load exams"
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchExams();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredExams = useMemo(
    () =>
      exams.filter((e) => {
        const examName = (e as any).exam_name || (e as any).name || "";
        return examName.toLowerCase().includes(search.toLowerCase());
      }),
    [exams, search]
  );
  const stats = useMemo(
    () => ({
      total: exams.length,
      active: exams.filter((e) => e.status === "active").length,
      draft: exams.filter((e) => e.status === "draft").length,
      completed: exams.filter((e) => e.status === "completed").length,
    }),
    [exams]
  );

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
    } catch (err) {}
  }, []);

  const handleViewResults = (exam: Exam) => {
    const examName = (exam as any).exam_name || (exam as any).name || "Exam";
    setSelectedExamForResults({
      id: Number(exam.id),
      name: examName,
    });
  };

  const handleCloseResultsModal = () => {
    setSelectedExamForResults(null);
  };

  return (
    <ExaminerGuard>
      <div
        className={`${styles.examinerContainer} ${styles.enterpriseRoot} theme-transition`}
        style={{
          // Ensure background adapts to dark/light theme
          background: "var(--app-bg, var(--background, var(--body-bg, #0f1115)))",
        minHeight: "100vh",
        color: "var(--text-primary)",
      }}
    >
      <div className={styles.pageBackdrop} style={{ display: "none" }} />
      <header className={`${styles.header} ${styles.fadeIn} theme-transition`}>
        <div className={styles.headerContent}>
          <h1
            className={`${styles.title} theme-transition`}
            style={{ color: "var(--text-primary)" }}
          >
            Exam Management Console
          </h1>
          <p
            className={`${styles.subtitle} theme-transition`}
            style={{ color: "var(--text-secondary)" }}
          >
            Create, monitor and manage assessments
          </p>
        </div>
        <div className={styles.headerActions}>
          <SearchBar value={search} onChange={setSearch} />
          <button
            onClick={() => router.push("/examiner/NewExam")}
            className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
          >
            + New Exam
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary} theme-transition`}
            style={{ marginLeft: "8px" }}
          >
            Join Exam
          </button>

          {/* Logout button - transparent with accent color */}
          <button
            onClick={handleLogout}
            className={`${styles.btn} theme-transition`}
            style={{
              marginLeft: "8px",
              background: "transparent",
              border: "none",
              color: "var(--accent-color)",
              padding: "8px 12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Log out"
          >
            Logout
          </button>

          {/* Profile avatar (moved to top-right) */}
          <div
            title={profileName || "User"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "var(--accent-color)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              marginLeft: 12,
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              cursor: "default",
            }}
            className="theme-transition"
          >
            {profileInitials}
          </div>
        </div>
      </header>

      <ExamStats stats={stats} />

      <section
        className={`${styles.examsSection} ${styles.fadeIn} theme-transition`}
        style={{ background: "transparent" }}
      >
        <div className={`${styles.sectionHeader} theme-transition`}>
          <h2
            className={`${styles.sectionTitle} theme-transition`}
            style={{
              color: "var(--text-primary)",
              fontSize: "20px",
              fontWeight: "600",
              margin: 0,
              transition: "color 0.3s ease",
            }}
          >
            Exams ({filteredExams.length})
          </h2>
          {search && (
            <span
              className={`${styles.filterInfo} theme-transition`}
              style={{
                color: "var(--text-secondary)",
                fontSize: "14px",
                transition: "color 0.3s ease",
              }}
            >
              Filtered by: "{search}"
            </span>
          )}
        </div>{" "}
        {loading && (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`${styles.examCard} ${styles.skeletonCard} ${styles.shimmer} theme-transition`}
              />
            ))}
          </div>
        )}
        {!loading && filteredExams.length === 0 && (
          <div
            className={`${styles.emptyState} ${styles.glassPanel} theme-transition`}
          >
            <div className={styles.emptyContent}>
              <div
                className={styles.emptyIcon}
                style={{ fontSize: "48px", marginBottom: "16px" }}
              >
                📁
              </div>
              <h3
                className={`${styles.emptyTitle} theme-transition`}
                style={{
                  color: "var(--text-primary)",
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  transition: "color 0.3s ease",
                }}
              >
                No exams match
              </h3>
              <p
                className={`${styles.emptyDescription} theme-transition`}
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  marginBottom: "24px",
                  transition: "color 0.3s ease",
                }}
              >
                Try adjusting your search or create a new exam.
              </p>
              <button
                onClick={() => router.push("/examiner/NewExam")}
                className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
              >
                ➕ Create Exam
              </button>
            </div>
          </div>
        )}
        {!loading && filteredExams.length > 0 && (
          <ExamsGrid
            exams={filteredExams}
            formatRange={formatRange}
            onViewResults={handleViewResults}
          />
        )}
      </section>

      {/* Exam Results Modal */}
      {selectedExamForResults && (
        <ExamResultsModal
          examId={selectedExamForResults.id}
          examName={selectedExamForResults.name}
          onClose={handleCloseResultsModal}
        />
      )}

      {/* Floating controls: Theme toggle in bottom-right (avatar removed) */}
      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          zIndex: 1200,
        }}
      >
        {/* Theme toggle (keeps existing ThemeToggle component) */}
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            padding: 8,
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
          }}
          className="theme-transition"
        >
          <ThemeToggle />
        </div>
      </div>
    </div>
    </ExaminerGuard>
  );
};

export default CreateExam;
