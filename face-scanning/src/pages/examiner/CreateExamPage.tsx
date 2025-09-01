import React, { useState, useEffect, useMemo } from "react";
import styles from "../../styles/CreateExamPage.module.css";
import { Exam } from "../../types/exam";
import SearchBar from "../../components/exams/SearchBar";
import ExamStats from "../../components/exams/ExamStats";
import ExamsGrid from "../../components/exams/ExamsGrid";
import { ThemeToggle } from "../../components/ThemeToggle";
import axios from "axios";
import { getUserId, getTokenFromCookie } from "@/constants/AuthStore";
const CreateExam = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examName, setExamName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [connectionError, setConnectionError] = useState(""); // if you added earlier, else ignore
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileInitials, setProfileInitials] = useState<string>("U");

  // Proctoring feature toggles (defaults ON)
  const [thirdEye, setThirdEye] = useState(true);
  const [multiPerson, setMultiPerson] = useState(true);
  const [eyeBall, setEyeBall] = useState(true);
  const [objectDetect, setObjectDetect] = useState(true);
  const [headDirection, setHeadDirection] = useState(true);
  const [flagNotifications, setFlagNotifications] = useState(true);

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
        const base =process.env.NEXT_PUBLIC_BACKEND_URL;
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

  const handleCreateExam = async () => {
    if (!examName.trim()) return;
    console.log(getTokenFromCookie());
    setIsCreating(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const payload = {
        exam_name: examName.trim(),
        third_eye_enabled: thirdEye,
        multiple_person_detection_enabled: multiPerson,
        eyeball_detection_enabled: eyeBall,
        object_detection_enabled: objectDetect,
        head_direction_enabled: headDirection,
        flag_notifications_enabled: flagNotifications,
      };
      const res = await axios.post<Exam>(`${base}/examCreate`, payload);
      console.log("hi", res);

      const refreshRes = await axios.get(`${base}/exam`);
      if (refreshRes.data?.success && refreshRes.data?.exams) {
        const examsWithParticipants = refreshRes.data.exams.map(
          (exam: any) => ({
            ...exam,
            participants: exam.attendances ? exam.attendances.length : 0,
            status: exam.status || "draft",
            exam_key: exam.key || exam.exam_key,
            startTime: exam.startTime || exam.start_time,
            endTime: exam.endTime || exam.end_time,
          })
        );
        setExams(examsWithParticipants);
      }

      setExamName("");
      setShowCreateForm(false);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e.message || "Failed to create exam"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const Toggle = ({
    label,
    enabled,
    onToggle,
  }: {
    label: string;
    enabled: boolean;
    onToggle: () => void;
  }) => (
    <div
      className="theme-transition"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 12px",
        border: "1px solid var(--border-color)",
        borderRadius: 12,
        background: "var(--card-bg)",
      }}
    >
      <span
        className="theme-transition"
        style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 600 }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={enabled}
        className="theme-transition"
        style={{
          position: "relative",
          width: 48,
          height: 28,
          borderRadius: 999,
          border: "1px solid var(--border-color)",
          background: enabled ? "var(--accent-color)" : "var(--secondary-bg)",
          boxShadow: enabled ? "inset 0 0 0 1px rgba(255,255,255,0.2)" : "none",
          cursor: "pointer",
          transition: "background 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 24 : 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            transition: "left 0.2s ease",
          }}
        />
      </button>
    </div>
  );

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
      document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
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
        decoded?.name || decoded?.fullname || decoded?.username || decoded?.email || null;
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
      // silent failure, keep defaults
    }
  }, []);

  return (
    <div
      className={`${styles.examinerContainer} ${styles.enterpriseRoot} theme-transition`}
    >
      <div className={styles.pageBackdrop} style={{ display: "none" }} />
      <header className={`${styles.header} ${styles.fadeIn} theme-transition`}>
        <div className={styles.headerContent}>
          <h1 className={`${styles.title} theme-transition`}>
            Exam Management Console
          </h1>
          <p className={`${styles.subtitle} theme-transition`}>
            Create, monitor and manage assessments
          </p>
        </div>
        <div className={styles.headerActions}>
          <SearchBar value={search} onChange={setSearch} />
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
          >
            {showCreateForm ? "Close" : "+ New Exam"}
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

      {showCreateForm && (
        <div className={`${styles.glassPanel} theme-transition`}>
          <div style={{ marginBottom: "20px" }}>
            <h3
              className="theme-transition"
              style={{
                color: "var(--text-primary)",
                marginBottom: "8px",
                fontSize: "18px",
                fontWeight: 600,
                transition: "color 0.3s ease",
              }}
            >
              Create New Exam
            </h3>
            <p
              className="theme-transition"
              style={{
                color: "var(--text-secondary)",
                fontSize: "14px",
                margin: 0,
                transition: "color 0.3s ease",
              }}
            >
              Enter a name for your new exam
            </p>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              className="theme-transition"
              style={{
                display: "block",
                marginBottom: "8px",
                color: "var(--text-secondary)",
                fontWeight: 500,
                fontSize: "14px",
                transition: "color 0.3s ease",
              }}
            >
              Exam Name
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Enter exam name"
              className="input-theme theme-transition"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          {/* Proctoring Features */}
          <div style={{ marginBottom: 16 }}>
            <h4
              className="theme-transition"
              style={{
                margin: "0 0 8px",
                color: "var(--text-primary)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Proctoring Features
            </h4>
            <p
              className="theme-transition"
              style={{
                margin: "0 0 12px",
                color: "var(--text-secondary)",
                fontSize: 12,
              }}
            >
              Choose which monitoring features to enable for this exam.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              <Toggle
                label="Third Eye"
                enabled={thirdEye}
                onToggle={() => setThirdEye((v) => !v)}
              />
              <Toggle
                label="Multiple Person Detection"
                enabled={multiPerson}
                onToggle={() => setMultiPerson((v) => !v)}
              />
              <Toggle
                label="EyeBall Detection"
                enabled={eyeBall}
                onToggle={() => setEyeBall((v) => !v)}
              />
              <Toggle
                label="Object Detection"
                enabled={objectDetect}
                onToggle={() => setObjectDetect((v) => !v)}
              />
              <Toggle
                label="Head Direction"
                enabled={headDirection}
                onToggle={() => setHeadDirection((v) => !v)}
              />
              <Toggle
                label="Flag Notifications"
                enabled={flagNotifications}
                onToggle={() => setFlagNotifications((v) => !v)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleCreateExam}
              disabled={isCreating || !examName.trim()}
              className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
              style={{
                flex: 1,
                padding: "12px 18px",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 600,
                opacity: isCreating || !examName.trim() ? 0.6 : 1,
                cursor:
                  isCreating || !examName.trim() ? "not-allowed" : "pointer",
              }}
            >
              {isCreating ? "Creating..." : "Create Exam"}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setExamName("");
              }}
              className={`${styles.btn} ${styles.btnGhost} theme-transition`}
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section
        className={`${styles.examsSection} ${styles.fadeIn} theme-transition`}
      >
        <div className={`${styles.sectionHeader} theme-transition`}>
          <h2
            className={`${styles.sectionTitle} theme-transition`}
            style={{
              color: "#1f2937",
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
                color: "#6b7280",
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
                onClick={() => setShowCreateForm(true)}
                className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
              >
                ➕ Create Exam
              </button>
            </div>
          </div>
        )}
        {!loading && filteredExams.length > 0 && (
          <ExamsGrid exams={filteredExams} formatRange={formatRange} />
        )}
      </section>

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
  );
};

export default CreateExam;
