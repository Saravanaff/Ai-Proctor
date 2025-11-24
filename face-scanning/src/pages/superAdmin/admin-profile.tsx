import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/CreateExamPage.module.css";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SuperAdminGuard } from "../../components/guards";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";

interface Exam {
  id: number;
  exam_name: string;
  key: number;
  createdAt: string;
  updatedAt: string;
  totalParticipants: number;
  settings: {
    third_eye_enabled: boolean;
    multiple_person_detection_enabled: boolean;
    eyeball_detection_enabled: boolean;
    object_detection_enabled: boolean;
    head_direction_enabled: boolean;
    video_recording_enabled: boolean;
    screen_sharing_enabled: boolean;
  };
}

interface AdminData {
  id: number;
  name: string;
  email: string;
}

const AdminProfilePage = () => {
  const router = useRouter();
  const { adminEmail } = router.query;

  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  axios.interceptors.request.use((config) => {
    const token = getTokenFromCookie();
    if (token) {
      config.headers = config.headers || ({} as any);
      (config.headers as any)["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  const fetchAdminExams = async () => {
    if (!adminEmail) return;

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.get(`${base}/admin/${adminEmail}/exams`);

      if (res.data?.success) {
        setAdmin(res.data.data.admin);
        setExams(res.data.data.exams);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to fetch admin exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminExams();
  }, [adminEmail]);

  const handleExamClick = (examId: number) => {
    router.push(`/examiner/exam-details?examId=${examId}`);
  };

  const handleBack = () => {
    router.push("/superAdmin/admins");
  };

  const filtered = exams.filter((exam) =>
    exam.exam_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminGuard>
      <div
        className={styles.examinerContainer}
        style={{ minHeight: "100vh", background: "var(--background)" }}
      >
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
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "24px" }}>
            <button
              onClick={handleBack}
              className={`${styles.btn} ${styles.btnGhost}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 20px",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "14px",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              ← Back to Dashboard
            </button>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "var(--success-bg)",
                color: "var(--success-color)",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                border: "1.5px solid var(--success-color)",
              }}
            >
              ✓ Active
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "32px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "42px",
                fontWeight: "700",
                color: "white",
                boxShadow: "0 12px 32px rgba(14, 165, 233, 0.4)",
                flexShrink: 0,
              }}
            >
              {admin?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div style={{ flex: 1, minWidth: "280px" }}>
              <h1
                style={{
                  margin: "0 0 12px 0",
                  fontSize: "32px",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                  lineHeight: "1.2",
                  letterSpacing: "-0.02em",
                }}
              >
                {admin?.name || "Admin Profile"}
              </h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    background: "var(--info-bg)",
                    color: "var(--text-secondary)",
                    borderRadius: "10px",
                    fontSize: "15px",
                    fontWeight: "500",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📧</span>
                  {admin?.email}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    background: "var(--primary-bg-light)",
                    color: "var(--accent-color)",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: "600",
                    border: "1px solid var(--accent-color)",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>👤</span>
                  Administrator
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    background: "var(--secondary-bg)",
                    color: "var(--text-primary)",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: "600",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📝</span>
                  {exams.length} Exams
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "600",
              margin: 0,
              color: "var(--text-primary)",
            }}
          >
            Examinations
            <span
              style={{
                marginLeft: "12px",
                fontSize: "16px",
                fontWeight: "500",
                color: "var(--text-secondary)",
                background: "var(--info-bg)",
                padding: "4px 12px",
                borderRadius: "12px",
                border: "1px solid var(--border-color)",
              }}
            >
              {exams.length}
            </span>
          </h2>
        </div>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search examinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 20px",
              marginBottom: "20px",
              borderRadius: "12px",
              border: "2px solid var(--border-color)",
              background: "var(--input-bg)",
              color: "var(--text-primary)",
              fontSize: "15px",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 8px var(--shadow)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent-color)";
              e.target.style.boxShadow = "0 4px 16px rgba(14, 165, 233, 0.2)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border-color)";
              e.target.style.boxShadow = "0 2px 8px var(--shadow)";
            }}
          />
        </div>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--card-bg)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
          }}
        >
          <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
            Loading examinations...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--card-bg)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
          }}
        >
          <p
            style={{
              color: "var(--text-primary)",
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            {search ? "No Results Found" : "No Examinations"}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            {search
              ? "Please refine your search criteria and try again"
              : "This administrator has not created any examinations"}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            overflow: "hidden",
            boxShadow: "0 4px 20px var(--shadow)",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 120px",
              padding: "16px 24px",
              background: "var(--secondary-bg)",
              borderBottom: "1px solid var(--border-color)",
              fontWeight: "700",
              fontSize: "13px",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            <div>Exam Name</div>
            <div>Key</div>
            <div>Participants</div>
            <div>Created</div>
            <div style={{ textAlign: "center" }}>Actions</div>
          </div>

          {/* Table Body */}
          {filtered.map((exam) => (
            <div
              key={exam.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 120px",
                padding: "20px 24px",
                borderBottom: "1px solid var(--border-color)",
                alignItems: "center",
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onClick={() => handleExamClick(exam.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--secondary-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Exam Name */}
              <div>
                <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "15px", marginBottom: "4px" }}>
                  {exam.exam_name}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                  {exam.settings.third_eye_enabled && (
                    <span
                      style={{
                        padding: "4px 8px",
                        background: "var(--success-bg)",
                        color: "var(--success-color)",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: "600",
                        border: "1px solid var(--success-color)",
                      }}
                    >
                      Third Eye
                    </span>
                  )}
                  {exam.settings.eyeball_detection_enabled && (
                    <span
                      style={{
                        padding: "4px 8px",
                        background: "var(--success-bg)",
                        color: "var(--success-color)",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: "600",
                        border: "1px solid var(--success-color)",
                      }}
                    >
                      Eye Track
                    </span>
                  )}
                  {exam.settings.object_detection_enabled && (
                    <span
                      style={{
                        padding: "4px 8px",
                        background: "var(--success-bg)",
                        color: "var(--success-color)",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: "600",
                        border: "1px solid var(--success-color)",
                      }}
                    >
                      Object Detect
                    </span>
                  )}
                  {exam.settings.video_recording_enabled && (
                    <span
                      style={{
                        padding: "4px 8px",
                        background: "var(--success-bg)",
                        color: "var(--success-color)",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: "600",
                        border: "1px solid var(--success-color)",
                      }}
                    >
                      Recording
                    </span>
                  )}
                </div>
              </div>

              {/* Key Badge */}
              <div>
                <span
                  style={{
                    display: "inline-flex",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "700",
                    background: "var(--secondary-bg)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {exam.key}
                </span>
              </div>

              {/* Participants Badge */}
              <div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "600",
                    background: "var(--info-bg)",
                    color: "var(--accent-color)",
                    border: "1px solid var(--accent-color)",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>👥</span>
                  {exam.totalParticipants}
                </span>
              </div>

              {/* Created Date */}
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                {new Date(exam.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              {/* Actions */}
              <div style={{ textAlign: "center" }}>
                <button
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExamClick(exam.id);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent-color)";
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = "var(--accent-color)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ThemeToggle />
    </div>
    </SuperAdminGuard>
  );
};

export default AdminProfilePage;
