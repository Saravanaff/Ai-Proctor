import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/CreateExamPage.module.css";
import { ThemeToggle } from "../../components/ThemeToggle";
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
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
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
    router.push("/superAdmin/dashboard");
  };

  const filtered = exams.filter((exam) =>
    exam.exam_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.examinerContainer} style={{ minHeight: "100vh" }}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <button
            onClick={handleBack}
            className={`${styles.btn} ${styles.btnGhost}`}
            style={{ marginRight: "16px" }}
          >
            ← Back
          </button>
          <div>
            <h1 className={styles.title}>
              {admin?.name || "Admin Profile"}
            </h1>
            <p style={{ margin: "4px 0 0 0", opacity: 0.7, fontSize: "14px" }}>
              {admin?.email}
            </p>
          </div>
        </div>
      </header>

      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
          Exams Created ({exams.length})
        </h2>
        <input
          type="text"
          placeholder="Search exams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            background: "var(--card-bg)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading exams...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ opacity: 0.7 }}>
            {search ? "No exams found matching your search" : "No exams created yet"}
          </p>
        </div>
      ) : (
        <div className={styles.examsGrid}>
          {filtered.map((exam) => (
            <div
              key={exam.id}
              className={styles.examCard}
              onClick={() => handleExamClick(exam.id)}
              style={{ cursor: "pointer" }}
            >
              <div style={{ marginBottom: "12px" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "600" }}>
                  {exam.exam_name}
                </h3>
                <p style={{ margin: "0", opacity: 0.7, fontSize: "14px" }}>
                  Exam Key: {exam.key}
                </p>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    background: "var(--accent-color)",
                    borderRadius: "12px",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  {exam.totalParticipants} Participant{exam.totalParticipants !== 1 ? "s" : ""}
                </div>
              </div>

              <div style={{ fontSize: "13px", opacity: 0.6, marginBottom: "12px" }}>
                <p style={{ margin: "4px 0" }}>
                  Created: {new Date(exam.createdAt).toLocaleDateString()}
                </p>
                <p style={{ margin: "4px 0" }}>
                  Updated: {new Date(exam.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <div style={{ fontSize: "12px", opacity: 0.7 }}>
                <p style={{ margin: "4px 0", fontWeight: "500" }}>Features Enabled:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                  {exam.settings.third_eye_enabled && (
                    <span style={{ padding: "2px 8px", background: "rgba(52, 211, 153, 0.2)", borderRadius: "4px" }}>
                      Third Eye
                    </span>
                  )}
                  {exam.settings.multiple_person_detection_enabled && (
                    <span style={{ padding: "2px 8px", background: "rgba(52, 211, 153, 0.2)", borderRadius: "4px" }}>
                      Multi-Person
                    </span>
                  )}
                  {exam.settings.eyeball_detection_enabled && (
                    <span style={{ padding: "2px 8px", background: "rgba(52, 211, 153, 0.2)", borderRadius: "4px" }}>
                      Eye Tracking
                    </span>
                  )}
                  {exam.settings.object_detection_enabled && (
                    <span style={{ padding: "2px 8px", background: "rgba(52, 211, 153, 0.2)", borderRadius: "4px" }}>
                      Object Detection
                    </span>
                  )}
                  {exam.settings.head_direction_enabled && (
                    <span style={{ padding: "2px 8px", background: "rgba(52, 211, 153, 0.2)", borderRadius: "4px" }}>
                      Head Direction
                    </span>
                  )}
                  {exam.settings.video_recording_enabled && (
                    <span style={{ padding: "2px 8px", background: "rgba(52, 211, 153, 0.2)", borderRadius: "4px" }}>
                      Recording
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ThemeToggle />
    </div>
  );
};

export default AdminProfilePage;
