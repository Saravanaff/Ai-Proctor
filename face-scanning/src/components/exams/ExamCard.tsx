import React, { useState } from "react";
import { Exam } from "../../types/exam";
import styles from "../../styles/CreateExamPage.module.css";

interface Props {
  exam: Exam;
  formatRange: (s?: string, e?: string) => string;
}

const ExamCard: React.FC<Props> = ({ exam, formatRange }) => {
  const [copied, setCopied] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);

  // Handle different property names flexibly
  const examName =
    (exam as any).exam_name || (exam as any).name || "Untitled Exam";
  const createdAt =
    (exam as any).created_at || (exam as any).createdAt || new Date();
  const studentsCount =
    (exam as any).students_count || (exam as any).studentsCount || 0;
  const startTime = (exam as any).start_time || (exam as any).startTime;
  const endTime = (exam as any).end_time || (exam as any).endTime;
  const status = (exam as any).status || "draft";
  const examKey =
    (exam as any).key || (exam as any).exam_key || (exam as any).id;
  const attendees = (exam as any).Attends || (exam as any).attendances || [];

  const copyToClipboard = async () => {
    if (examKey) {
      try {
        await navigator.clipboard.writeText(examKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy: ", err);
      }
    }
  };

  const StudentsModal = () => {
    if (!showStudentsModal) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            backgroundColor: "#1f2937",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "500px",
            maxHeight: "80vh",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "#f9fafb",
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                📚 {examName}
              </h3>
              <p
                style={{
                  margin: "4px 0 0 0",
                  color: "#9ca3af",
                  fontSize: "14px",
                }}
              >
                {attendees.length}{" "}
                {attendees.length === 1 ? "student" : "students"} registered
              </p>
            </div>
            <button
              onClick={() => setShowStudentsModal(false)}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: "8px",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#9ca3af",
                fontSize: "16px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--button-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              ✕
            </button>
          </div>

          {/* Modal Body */}
          <div
            style={{
              padding: "0",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {attendees.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    color: "var(--text-secondary)",
                  }}
                >
                  No Students Yet
                </h4>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  Share the exam key <strong>{examKey}</strong> with students to
                  get started
                </p>
              </div>
            ) : (
              <div style={{ padding: "8px 0" }}>
                {attendees.map((attendance: any, index: number) => {
                  const student = attendance.User || attendance.user;
                  return (
                    <div
                      key={index}
                      style={{
                        padding: "16px 24px",
                        borderBottom:
                          index < attendees.length - 1
                            ? "1px solid rgba(255, 255, 255, 0.05)"
                            : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "rgba(255, 255, 255, 0.02)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "600",
                          fontSize: "16px",
                          flexShrink: 0,
                        }}
                      >
                        {(student?.name || "U").charAt(0).toUpperCase()}
                      </div>

                      {/* Student Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: "#f9fafb",
                            fontWeight: "500",
                            fontSize: "15px",
                            marginBottom: "2px",
                          }}
                        >
                          {student?.name || "Unknown Student"}
                        </div>
                        <div
                          style={{
                            color: "#9ca3af",
                            fontSize: "13px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {student?.email || "No email provided"}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div
                        style={{
                          padding: "4px 8px",
                          borderRadius: "12px",
                          backgroundColor: "rgba(34, 197, 94, 0.1)",
                          border: "1px solid rgba(34, 197, 94, 0.2)",
                          color: "#22c55e",
                          fontSize: "11px",
                          fontWeight: "500",
                        }}
                      >
                        Enrolled
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          {attendees.length > 0 && (
            <div
              style={{
                padding: "16px 24px",
                borderTop: "1px solid var(--border-color)",
                backgroundColor: "var(--secondary-bg)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                Exam Key:{" "}
                <code
                  style={{
                    backgroundColor: "var(--code-bg)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {examKey}
                </code>
              </div>
              <button
                onClick={copyToClipboard}
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: "#60a5fa",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {copied ? "✓ Copied" : "📋 Copy Key"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        className={`${styles.examCard} ${styles.glassPanel} ${styles.hoverLift}`}
      >
        <div className={styles.examHeader}>
          <h4 className={styles.examTitle} title={examName}>
            {examName}
          </h4>
          <span className={styles.statusBadge} data-status={status}>
            {status}
          </span>
        </div>

        {examKey && (
          <div
            className={styles.examKeyRow}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "12px", opacity: 0.7 }}>Key:</span>
            <code
              style={{
                fontSize: "11px",
                background: "rgba(255,255,255,0.1)",
                padding: "2px 6px",
                borderRadius: "4px",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {examKey}
            </code>
            <button
              onClick={copyToClipboard}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                opacity: 0.7,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
              title={copied ? "Copied!" : "Copy exam key"}
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
        )}

        <div className={styles.examMetaRow}>
          <span className={styles.metaItem}>
            📅 {new Date(createdAt).toLocaleDateString()}
          </span>
          <span
            className={styles.metaItem}
            style={{ cursor: "pointer" }}
            onClick={() => setShowStudentsModal(true)}
            title="Click to view students"
          >
            👥 {attendees.length}{" "}
            {attendees.length === 1 ? "student" : "students"}
          </span>
        </div>

        <div className={styles.examWindow}>
          <span className={styles.metaItem}>
            ⏰ {formatRange(startTime, endTime)}
          </span>
        </div>
        <div className={styles.examActions}>
          <button
            className={`${styles.btn} ${styles.btnGhost} ${styles.smallBtn}`}
          >
            Manage
          </button>
          <button
            className={`${styles.btn} ${styles.btnOutline} ${styles.smallBtn}`}
          >
            Analytics
          </button>
        </div>
      </div>

      <StudentsModal />
    </>
  );
};

export default ExamCard;
