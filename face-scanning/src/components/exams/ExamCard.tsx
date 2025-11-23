import React, { useState } from "react";
import { Exam } from "../../types/exam";
import styles from "./ExamCard.module.css";

interface Props {
  exam: Exam;
  formatRange: (s?: string, e?: string) => string;
  onViewDetails?: (exam: Exam) => void;
  onEdit?: (exam: Exam) => void;
  onManage?: (exam: Exam) => void;
  onViewResults?: (exam: Exam) => void;
  onStatusChange?: (examId: number, newStatus: string) => void;
}

const ExamCard: React.FC<Props> = ({
  exam,
  formatRange,
  onViewDetails,
  onEdit,
  onManage,
  onViewResults,
  onStatusChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  // Handle different property names flexibly
  const examName =
    (exam as any).exam_name || (exam as any).name || "Untitled Exam";
  const createdAt =
    (exam as any).crparticeated_at || (exam as any).createdAt || new Date();
  const startTime = (exam as any).start_time || (exam as any).startTime;
  const endTime = (exam as any).end_time || (exam as any).endTime;
  const rawStatus = (exam as any).status || "draft";
  const examKey =
    (exam as any).key || (exam as any).exam_key || (exam as any).id;
  const attendees = (exam as any).Attends || (exam as any).attendances || [];
  const participantCount = (exam as any).participants || attendees.length || 0;

  // Determine display status
  const isSuspended = rawStatus === "suspended";
  const isFuture = !isSuspended && startTime && new Date(startTime) > new Date();
  
  let displayStatus = rawStatus;
  if (isSuspended) displayStatus = "suspended";
  else if (isFuture) displayStatus = "future";
  else if (rawStatus === "active") displayStatus = "active";

  // Theme-aware status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "var(--success-color)";
      case "future":
        return "var(--info-color)";
      case "suspended":
        return "var(--error-color)";
      case "draft":
        return "var(--warning-color)";
      case "completed":
        return "var(--text-secondary)";
      case "cancelled":
        return "var(--error-color)";
      default:
        return "var(--text-secondary)";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "active":
        return "var(--success-bg)";
      case "future":
        return "var(--info-bg)";
      case "suspended":
        return "var(--error-bg)";
      case "draft":
        return "var(--warning-bg)";
      case "completed":
        return "var(--card-bg)";
      case "cancelled":
        return "var(--error-bg)";
      default:
        return "var(--card-bg)";
    }
  };

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
          backgroundColor: "var(--overlay-bg)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
        onClick={() => setShowStudentsModal(false)}
      >
        <div
          style={{
            background: "var(--modal-bg)",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "500px",
            maxHeight: "80vh",
            overflow: "hidden",
            boxShadow: "0 25px 50px var(--shadow)",
            border: "1px solid var(--border-color)",
            backdropFilter: "blur(20px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "var(--text-primary)",
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                📚 {examName}
              </h3>
              <p
                style={{
                  margin: "4px 0 0 0",
                  color: "var(--text-secondary)",
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
                background: "var(--button-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "16px",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: "0", maxHeight: "400px", overflowY: "auto" }}>
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
                  Share the exam key{" "}
                  <strong style={{ color: "var(--accent-color)" }}>
                    {examKey}
                  </strong>{" "}
                  with students
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
                            ? "1px solid var(--border-color)"
                            : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        transition: "background-color 0.2s",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, var(--accent-color), var(--success-color))",
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: "500",
                            fontSize: "15px",
                            marginBottom: "2px",
                          }}
                        >
                          {student?.name || "Unknown Student"}
                        </div>
                        <div
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "13px",
                          }}
                        >
                          {student?.email || "No email available"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={styles.examCard}>
        {/* Status Badge */}
        <div className={styles.statusContainer}>
          <span
            className={styles.statusBadge}
            style={{
              color: getStatusColor(displayStatus),
              backgroundColor: getStatusBg(displayStatus),
              borderColor: getStatusColor(displayStatus),
            }}
          >
            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
          </span>
        </div>

        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title} title={examName}>
            {examName}
          </h3>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Exam Key */}
          <div className={styles.infoRow}>
            <span className={styles.label}>Exam Key:</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className={styles.value}>{examKey}</span>
              <button
                onClick={copyToClipboard}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  transition: "all 0.2s ease",
                }}
                title={copied ? "Copied!" : "Copy exam key"}
              >
                {copied ? "✓" : "📋"}
              </button>
            </div>
          </div>

          {/* Participants */}
          <div className={styles.infoRow}>
            <div className={styles.iconText}>
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span
                className={styles.label}
                style={{ cursor: onManage ? "pointer" : "default" }}
                onClick={onManage ? () => onManage(exam) : undefined}
              >
                Participants:
              </span>
            </div>
            <span
              className={styles.participantCount}
              onClick={onManage ? () => onManage(exam) : undefined}
              style={{ cursor: onManage ? "pointer" : "default" }}
              title={
                onManage ? "Click to view participants" : "Participants count"
              }
            >
              {participantCount}
            </span>
          </div>

          {/* Created Date */}
          <div className={styles.infoRow}>
            <div className={styles.iconText}>
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className={styles.label}>Created:</span>
            </div>
            <span className={styles.value}>
              {new Date(createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Time Range */}
          {(startTime || endTime) && (
            <div className={styles.infoRow}>
              <div className={styles.iconText}>
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                <span className={styles.label}>Schedule:</span>
              </div>
              <span className={styles.value}>
                {formatRange(startTime, endTime)}
              </span>
            </div>
          )}

          {/* Exam ID */}
          <div className={styles.examId}>
            <span className={styles.idLabel}>ID: {exam.id}</span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {onViewDetails && (
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(exam);
              }}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              View Details
            </button>
          )}

          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onManage) {
                onManage(exam);
              }
            }}
          >
            <svg
              className={styles.buttonIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Manage
          </button>

          {onEdit && (
            <button
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(exam);
              }}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </button>
          )}

          {isSuspended && onStatusChange && (
            <button
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={(e) => {
                e.stopPropagation();
                setIsReactivating(true);
                onStatusChange(exam.id, "active");
                setTimeout(() => setIsReactivating(false), 1000);
              }}
              disabled={isReactivating}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              {isReactivating ? "Activating..." : "Reactivate"}
            </button>
          )}

          {onViewResults && (
            <button
              className={`${styles.button} ${styles.resultsButton}`}
              onClick={(e) => {
                e.stopPropagation();
                onViewResults(exam);
              }}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              View Results
            </button>
          )}
        </div>
      </div>

      <StudentsModal />
    </>
  );
};

export default ExamCard;
