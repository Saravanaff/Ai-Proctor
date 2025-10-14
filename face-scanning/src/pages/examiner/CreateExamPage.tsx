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
  const [videoRecording, setVideoRecording] = useState(true);
  const [tabSwitchDetection, setTabSwitchDetection] = useState(true);
  const [microphoneDetection, setMicrophoneDetection] = useState(true);
  const [safeBrowser, setSafeBrowser] = useState(true);
  const [proctorFeedToTestTaker, setProctorFeedToTestTaker] = useState(true);
  const [screenSharing, setScreenSharing] = useState(true);
  const [screenCountDetection, setScreenCountDetection] = useState(false);
  const [controlDesktopApps, setControlDesktopApps] = useState(false);
  const [normalProctoring, setNormalProctoring] = useState(true);
  const [aiPoweredProctoring, setAiPoweredProctoring] = useState(true);
  const [recordedManualProctoring, setRecordedManualProctoring] =
    useState(true);
  const [faceAuthentication, setFaceAuthentication] = useState(true);

  // Handler for AI Proctoring toggle that controls related features
  const handleAiProctoringToggle = () => {
    const newAiProctoringState = !aiPoweredProctoring;
    setAiPoweredProctoring(newAiProctoringState);

    // When AI proctoring is turned off, turn off all AI-related features
    if (!newAiProctoringState) {
      setThirdEye(false);
      setMultiPerson(false);
      setEyeBall(false);
      setObjectDetect(false);
      setHeadDirection(false);
      setFaceAuthentication(false);
    } else {
      // When AI proctoring is turned on, turn on all AI-related features (reverse the effect)
      setThirdEye(true);
      setMultiPerson(true);
      setEyeBall(true);
      setObjectDetect(true);
      setHeadDirection(true);
      setFaceAuthentication(true);
    }
  };

  // Handler for Normal Proctoring toggle that controls related features
  const handleNormalProctoringToggle = () => {
    const newNormalProctoringState = !normalProctoring;
    setNormalProctoring(newNormalProctoringState);

    // When normal proctoring is turned off, turn off basic monitoring features
    if (!newNormalProctoringState) {
      setControlDesktopApps(false);
      setScreenCountDetection(false);
      setSafeBrowser(false);
      setTabSwitchDetection(false);
      setMicrophoneDetection(false);
    } else {
      // When normal proctoring is turned on, turn on basic monitoring features (reverse the effect)
      setControlDesktopApps(true);
      setScreenCountDetection(true);
      setSafeBrowser(true);
      setTabSwitchDetection(true);
      setMicrophoneDetection(true);
    }
  };

  // Handler for Manual Proctoring toggle that controls related features
  const handleManualProctoringToggle = () => {
    const newManualProctoringState = !recordedManualProctoring;
    setRecordedManualProctoring(newManualProctoringState);

    // When manual proctoring is turned off, turn off recording features
    if (!newManualProctoringState) {
      setVideoRecording(false);
      setProctorFeedToTestTaker(false);
      setFlagNotifications(false);
    } else {
      // When manual proctoring is turned on, turn on recording features (reverse the effect)
      setVideoRecording(true);
      setProctorFeedToTestTaker(true);
      setFlagNotifications(true);
    }
  };

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
        video_recording_enabled: videoRecording,
        tab_switch_detection_enabled: tabSwitchDetection,
        microphone_detection_enabled: microphoneDetection,
        safe_browser_enabled: safeBrowser,
        proctor_feed_to_test_taker_enabled: proctorFeedToTestTaker,
        screen_sharing_enabled: screenSharing,
        screen_count_detection_enabled: screenCountDetection,
        control_desktop_apps_enabled: controlDesktopApps,
        normal_proctoring: normalProctoring,
        ai_powered_proctoring: aiPoweredProctoring,
        recorded_manual_proctoring: recordedManualProctoring,
        face_authentication_enabled: faceAuthentication,
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
    disabled = false,
  }: {
    label: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
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
        background: disabled ? "var(--secondary-bg)" : "var(--card-bg)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        className="theme-transition"
        style={{
          color: disabled ? "var(--text-secondary)" : "var(--text-primary)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        aria-pressed={enabled}
        disabled={disabled}
        className="theme-transition"
        style={{
          position: "relative",
          width: 48,
          height: 28,
          borderRadius: 999,
          border: "1px solid var(--border-color)",
          background: enabled ? "var(--accent-color)" : "var(--secondary-bg)",
          boxShadow: enabled ? "inset 0 0 0 1px rgba(255,255,255,0.2)" : "none",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 0.2s ease, box-shadow 0.2s ease",
          opacity: disabled ? 0.5 : 1,
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

  return (
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
        <>
          {/* Modal Backdrop */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(8px)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.3s ease",
            }}
            className="theme-transition"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCreateForm(false);
                setExamName("");
              }
            }}
          >
            {/* Modal Content */}
            <div
              className={`${styles.glassPanel} theme-transition`}
              style={{
                maxWidth: "900px",
                width: "90vw",
                maxHeight: "90vh",
                overflowY: "auto",
                position: "relative",
                animation: "slideIn 0.3s ease",
                margin: "20px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setExamName("");
                }}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: "var(--secondary-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "18px",
                  fontWeight: "bold",
                  zIndex: 10,
                }}
                className="theme-transition"
                title="Close"
              >
                ×
              </button>

              <div style={{ marginBottom: "20px" }}>
                <h3
                  className="theme-transition"
                  style={{
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                    fontSize: "18px",
                    fontWeight: 600,
                    transition: "color 0.3s ease",
                    paddingRight: "40px",
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

              {/* Normal Proctoring Section */}
              <div
                style={{
                  marginBottom: 24,
                  padding: 16,
                  border: "2px solid var(--border-color)",
                  borderRadius: 12,
                  background: normalProctoring
                    ? "var(--card-bg)"
                    : "var(--secondary-bg)",
                  transition: "all 0.3s ease",
                }}
                className="theme-transition"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h4
                      className="theme-transition"
                      style={{
                        margin: "0 0 4px",
                        color: "var(--text-primary)",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      Normal Proctoring
                    </h4>
                    <p
                      className="theme-transition"
                      style={{
                        margin: 0,
                        color: "var(--text-secondary)",
                        fontSize: 12,
                      }}
                    >
                      Basic monitoring and browser control features
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNormalProctoringToggle}
                    aria-pressed={normalProctoring}
                    className="theme-transition"
                    style={{
                      position: "relative",
                      width: 56,
                      height: 32,
                      borderRadius: 999,
                      border: "2px solid var(--border-color)",
                      background: normalProctoring
                        ? "var(--accent-color)"
                        : "var(--secondary-bg)",
                      boxShadow: normalProctoring
                        ? "inset 0 0 0 1px rgba(255,255,255,0.2)"
                        : "none",
                      cursor: "pointer",
                      transition: "background 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 3,
                        left: normalProctoring ? 28 : 3,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transition: "left 0.2s ease",
                      }}
                    />
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Toggle
                    label="Control Desktop Apps"
                    enabled={controlDesktopApps}
                    onToggle={() => setControlDesktopApps((v) => !v)}
                    disabled={!normalProctoring}
                  />
                  <Toggle
                    label="Screen Count Detection"
                    enabled={screenCountDetection}
                    onToggle={() => setScreenCountDetection((v) => !v)}
                    disabled={!normalProctoring}
                  />
                  <Toggle
                    label="Safe Browser"
                    enabled={safeBrowser}
                    onToggle={() => setSafeBrowser((v) => !v)}
                    disabled={!normalProctoring}
                  />
                  <Toggle
                    label="Tab Switch Detection"
                    enabled={tabSwitchDetection}
                    onToggle={() => setTabSwitchDetection((v) => !v)}
                    disabled={!normalProctoring}
                  />
                  <Toggle
                    label="Microphone Detection"
                    enabled={microphoneDetection}
                    onToggle={() => setMicrophoneDetection((v) => !v)}
                    disabled={!normalProctoring}
                  />
                </div>
              </div>

              {/* AI Powered Proctoring Section */}
              <div
                style={{
                  marginBottom: 24,
                  padding: 16,
                  border: "2px solid var(--border-color)",
                  borderRadius: 12,
                  background: aiPoweredProctoring
                    ? "var(--card-bg)"
                    : "var(--secondary-bg)",
                  transition: "all 0.3s ease",
                }}
                className="theme-transition"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h4
                      className="theme-transition"
                      style={{
                        margin: "0 0 4px",
                        color: "var(--text-primary)",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      AI Powered Proctoring
                    </h4>
                    <p
                      className="theme-transition"
                      style={{
                        margin: 0,
                        color: "var(--text-secondary)",
                        fontSize: 12,
                      }}
                    >
                      Advanced AI-based monitoring and detection
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiProctoringToggle}
                    aria-pressed={aiPoweredProctoring}
                    className="theme-transition"
                    style={{
                      position: "relative",
                      width: 56,
                      height: 32,
                      borderRadius: 999,
                      border: "2px solid var(--border-color)",
                      background: aiPoweredProctoring
                        ? "var(--accent-color)"
                        : "var(--secondary-bg)",
                      boxShadow: aiPoweredProctoring
                        ? "inset 0 0 0 1px rgba(255,255,255,0.2)"
                        : "none",
                      cursor: "pointer",
                      transition: "background 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 3,
                        left: aiPoweredProctoring ? 28 : 3,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transition: "left 0.2s ease",
                      }}
                    />
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Toggle
                    label="Third Eye"
                    enabled={thirdEye}
                    onToggle={() => setThirdEye((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="Multiple Person Detection"
                    enabled={multiPerson}
                    onToggle={() => setMultiPerson((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="EyeBall Detection"
                    enabled={eyeBall}
                    onToggle={() => setEyeBall((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="Object Detection"
                    enabled={objectDetect}
                    onToggle={() => setObjectDetect((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="Head Direction"
                    enabled={headDirection}
                    onToggle={() => setHeadDirection((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                  <Toggle
                    label="Face Authentication"
                    enabled={faceAuthentication}
                    onToggle={() => setFaceAuthentication((v) => !v)}
                    disabled={!aiPoweredProctoring}
                  />
                </div>
              </div>

              {/* Recorded Manual Proctoring Section */}
              <div
                style={{
                  marginBottom: 24,
                  padding: 16,
                  border: "2px solid var(--border-color)",
                  borderRadius: 12,
                  background: recordedManualProctoring
                    ? "var(--card-bg)"
                    : "var(--secondary-bg)",
                  transition: "all 0.3s ease",
                }}
                className="theme-transition"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h4
                      className="theme-transition"
                      style={{
                        margin: "0 0 4px",
                        color: "var(--text-primary)",
                        fontSize: 16,
                        fontWeight: 700,
                      }}
                    >
                      Recorded Manual Proctoring
                    </h4>
                    <p
                      className="theme-transition"
                      style={{
                        margin: 0,
                        color: "var(--text-secondary)",
                        fontSize: 12,
                      }}
                    >
                      Recording and manual review capabilities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleManualProctoringToggle}
                    aria-pressed={recordedManualProctoring}
                    className="theme-transition"
                    style={{
                      position: "relative",
                      width: 56,
                      height: 32,
                      borderRadius: 999,
                      border: "2px solid var(--border-color)",
                      background: recordedManualProctoring
                        ? "var(--accent-color)"
                        : "var(--secondary-bg)",
                      boxShadow: recordedManualProctoring
                        ? "inset 0 0 0 1px rgba(255,255,255,0.2)"
                        : "none",
                      cursor: "pointer",
                      transition: "background 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        top: 3,
                        left: recordedManualProctoring ? 28 : 3,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        transition: "left 0.2s ease",
                      }}
                    />
                  </button>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Toggle
                    label="Flag Notifications"
                    enabled={flagNotifications}
                    onToggle={() => setFlagNotifications((v) => !v)}
                    disabled={!recordedManualProctoring}
                  />
                  <Toggle
                    label="Video Recording"
                    enabled={videoRecording}
                    onToggle={() => setVideoRecording((v) => !v)}
                    disabled={!recordedManualProctoring}
                  />
                  <Toggle
                    label="Proctor Feed to Test Taker"
                    enabled={proctorFeedToTestTaker}
                    onToggle={() => setProctorFeedToTestTaker((v) => !v)}
                    disabled={!recordedManualProctoring}
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
                      isCreating || !examName.trim()
                        ? "not-allowed"
                        : "pointer",
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
          </div>

          {/* Add CSS animations */}
          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
        </>
      )}

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
