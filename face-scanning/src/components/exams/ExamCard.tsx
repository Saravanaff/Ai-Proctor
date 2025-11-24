import React, { useState } from "react";
import { Exam } from "../../types/exam";
import styles from "./ExamCard.module.css";
import { getTokenFromCookie } from "../../constants/AuthStore";

interface Props {
  exam: Exam;
  formatRange: (s?: string, e?: string) => string;
  onViewDetails?: (exam: Exam) => void;
  onEdit?: (exam: Exam) => void;
  onManage?: (exam: Exam) => void;
  onViewResults?: (exam: Exam) => void;
  onStatusChange?: (examId: number, newStatus: string) => void;
  onDelete?: (examId: number) => void;
}

const ExamCard: React.FC<Props> = ({
  exam,
  formatRange,
  onViewDetails,
  onEdit,
  onManage,
  onViewResults,
  onStatusChange,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    durationMinutes: 0,
    // Normal Proctoring
    controlDesktopApps: false,
    screenCountDetection: false,
    safeBrowser: false,
    tabSwitchDetection: false,
    microphoneDetection: false,
    normalProctoring: true,
    // AI Powered Proctoring
    thirdEye: true,
    multiPerson: true,
    eyeBall: true,
    objectDetect: true,
    headDirection: true,
    faceAuthentication: true,
    aiPoweredProctoring: true,
    // Recorded Manual Proctoring
    flagNotifications: true,
    videoRecording: true,
    proctorFeedToTestTaker: true,
    screenSharing: true,
    recordedManualProctoring: true,
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [useDuration, setUseDuration] = useState(false);

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
  const now = new Date();
  const isSuspended = rawStatus === "suspended";
  const isExpired = endTime && new Date(endTime) < now;
  const isFuture =
    !isSuspended && !isExpired && startTime && new Date(startTime) > now;

  let displayStatus = rawStatus;
  if (isSuspended || (rawStatus === "active" && isExpired)) {
    displayStatus = "suspended";
  } else if (isFuture) {
    displayStatus = "future";
  } else if (rawStatus === "active") {
    displayStatus = "active";
  }

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

  const openEditDetailsModal = () => {
    // Format dates for datetime-local input
    const formatForInput = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Calculate duration if both times exist
    let durationMins = 0;
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      durationMins = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    }

    setEditFormData({
      name: examName,
      startTime: formatForInput(startTime),
      endTime: formatForInput(endTime),
      durationMinutes: durationMins > 0 ? durationMins : ((exam as any).duration || 60),
      // Normal Proctoring (map from snake_case backend fields)
      controlDesktopApps: (exam as any).control_desktop_apps_enabled ?? false,
      screenCountDetection: (exam as any).screen_count_detection_enabled ?? false,
      safeBrowser: (exam as any).safe_browser_enabled ?? false,
      tabSwitchDetection: (exam as any).tab_switch_detection_enabled ?? false,
      microphoneDetection: (exam as any).microphone_detection_enabled ?? false,
      normalProctoring: (exam as any).normal_proctoring ?? true,
      // AI Powered Proctoring (map from snake_case backend fields)
      thirdEye: (exam as any).third_eye_enabled ?? true,
      multiPerson: (exam as any).multiple_person_detection_enabled ?? true,
      eyeBall: (exam as any).eyeball_detection_enabled ?? true,
      objectDetect: (exam as any).object_detection_enabled ?? true,
      headDirection: (exam as any).head_direction_enabled ?? true,
      faceAuthentication: (exam as any).face_authentication_enabled ?? true,
      aiPoweredProctoring: (exam as any).ai_powered_proctoring ?? true,
      // Recorded Manual Proctoring (map from snake_case backend fields)
      flagNotifications: (exam as any).flag_notifications_enabled ?? true,
      videoRecording: (exam as any).video_recording_enabled ?? true,
      proctorFeedToTestTaker: (exam as any).proctor_feed_to_test_taker_enabled ?? true,
      screenSharing: (exam as any).screen_sharing_enabled ?? true,
      recordedManualProctoring: (exam as any).recorded_manual_proctoring ?? true,
    });
    setUseDuration(false);
    setShowEditDetailsModal(true);
  };

  const handleSaveExamDetails = async () => {
    if (!editFormData.name.trim()) {
      alert('Exam name is required');
      return;
    }

    // Validate based on mode
    if (useDuration) {
      if (editFormData.durationMinutes <= 0) {
        alert('Duration must be greater than 0');
        return;
      }
    } else {
      if (editFormData.startTime && editFormData.endTime) {
        const start = new Date(editFormData.startTime);
        const end = new Date(editFormData.endTime);
        if (end <= start) {
          alert('End time must be after start time');
          return;
        }
      }
    }

    try {
      setIsSavingDetails(true);
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const token = getTokenFromCookie('authToken');

      if (!baseUrl) {
        alert('Backend URL not configured');
        console.error('NEXT_PUBLIC_BACKEND_URL is not set');
        return;
      }

      if (!token) {
        alert('You are not logged in. Please login first.');
        console.error('Auth token not found in cookies');
        return;
      }

      const payload: any = {
        exam_name: editFormData.name,
        // Normal Proctoring
        controlDesktopApps: editFormData.controlDesktopApps,
        screenCountDetection: editFormData.screenCountDetection,
        safeBrowser: editFormData.safeBrowser,
        tabSwitchDetection: editFormData.tabSwitchDetection,
        microphoneDetection: editFormData.microphoneDetection,
        normalProctoring: editFormData.normalProctoring,
        // AI Powered Proctoring
        thirdEye: editFormData.thirdEye,
        multiPerson: editFormData.multiPerson,
        eyeBall: editFormData.eyeBall,
        objectDetect: editFormData.objectDetect,
        headDirection: editFormData.headDirection,
        faceAuthentication: editFormData.faceAuthentication,
        aiPoweredProctoring: editFormData.aiPoweredProctoring,
        // Recorded Manual Proctoring
        flagNotifications: editFormData.flagNotifications,
        videoRecording: editFormData.videoRecording,
        proctorFeedToTestTaker: editFormData.proctorFeedToTestTaker,
        screenSharing: editFormData.screenSharing,
        recordedManualProctoring: editFormData.recordedManualProctoring,
      };

      if (useDuration) {
        // Use duration mode
        payload.durationMinutes = editFormData.durationMinutes;
      } else {
        // Use start/end time mode
        if (editFormData.startTime) {
          payload.startTime = new Date(editFormData.startTime).toISOString();
        }
        if (editFormData.endTime) {
          payload.endTime = new Date(editFormData.endTime).toISOString();
        }
      }

      console.log('📤 Sending update request:', {
        url: `${baseUrl}/exam/${exam.id}`,
        payload
      });

      const response = await fetch(`${baseUrl}/exam/${exam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Server error:', errorData);
        throw new Error(errorData.message || 'Failed to update exam details');
      }

      alert('Exam details updated successfully!');
      setShowEditDetailsModal(false);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating exam details:', error);
      alert('Failed to update exam details. Please try again.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const calculateDuration = () => {
    if (useDuration) {
      const hours = Math.floor(editFormData.durationMinutes / 60);
      const minutes = editFormData.durationMinutes % 60;
      return `${hours}h ${minutes}m`;
    } else {
      if (!editFormData.startTime || !editFormData.endTime) return '';
      const start = new Date(editFormData.startTime);
      const end = new Date(editFormData.endTime);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs <= 0) return 'Invalid';
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
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

          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={(e) => {
              e.stopPropagation();
              openEditDetailsModal();
            }}
            title="Edit exam details (name, time, duration)"
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
            Edit Details
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
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Edit Questions
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

          {onDelete && (
            <button
              className={`${styles.button} ${styles.deleteButton}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(exam.id);
              }}
              title="Delete exam"
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>

      <StudentsModal />

      {/* Edit Exam Details Modal */}
      {showEditDetailsModal && (
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
          onClick={() => setShowEditDetailsModal(false)}
        >
          <div
            style={{
              background: "var(--modal-bg)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
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
                    fontSize: "20px",
                    fontWeight: "700",
                  }}
                >
                  ✏️ Edit Exam Details
                </h3>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  Update exam name, start time, end time, and duration
                </p>
              </div>
              <button
                onClick={() => setShowEditDetailsModal(false)}
                disabled={isSavingDetails}
                style={{
                  background: "var(--button-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  width: "40px",
                  height: "40px",
                  cursor: isSavingDetails ? "not-allowed" : "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "20px",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isSavingDetails ? 0.5 : 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "24px",
                maxHeight: "calc(90vh - 180px)",
                overflowY: "auto",
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveExamDetails();
                }}
              >
                {/* Exam Name */}
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--text-primary)",
                    }}
                  >
                    Exam Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    disabled={isSavingDetails}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "var(--secondary-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent-color)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border-color)")
                    }
                    placeholder="Enter exam name"
                  />
                </div>

                {/* Scheduling Mode Toggle */}
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "8px",
                      background: "var(--secondary-bg)",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setUseDuration(false)}
                      disabled={isSavingDetails}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: !useDuration ? "var(--accent-color)" : "transparent",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: !useDuration ? "white" : "var(--text-secondary)",
                        cursor: isSavingDetails ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      📅 Start/End Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseDuration(true)}
                      disabled={isSavingDetails}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: useDuration ? "var(--accent-color)" : "transparent",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: useDuration ? "white" : "var(--text-secondary)",
                        cursor: isSavingDetails ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      ⏱️ Duration
                    </button>
                  </div>
                </div>

                {!useDuration ? (
                  <>
                    {/* Start Time */}
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--text-primary)",
                        }}
                      >
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editFormData.startTime}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            startTime: e.target.value,
                          })
                        }
                        disabled={isSavingDetails}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          background: "var(--secondary-bg)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          fontSize: "14px",
                          color: "var(--text-primary)",
                          outline: "none",
                          transition: "border-color 0.2s",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "var(--accent-color)")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "var(--border-color)")
                        }
                      />
                    </div>

                    {/* End Time */}
                    <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--text-primary)",
                    }}
                  >
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.endTime}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        endTime: e.target.value,
                      })
                    }
                    disabled={isSavingDetails}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "var(--secondary-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent-color)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border-color)")
                    }
                      />
                    </div>

                    {/* Duration Display for Start/End Time Mode */}
                    {editFormData.startTime && editFormData.endTime && (
                      <div
                        style={{
                          marginBottom: "20px",
                          padding: "16px",
                          background: "var(--info-bg)",
                          border: "1px solid var(--info-color)",
                          borderRadius: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--info-color)",
                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12,6 12,12 16,14"></polyline>
                          </svg>
                          <span>Duration: {calculateDuration()}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Duration Input Mode */}
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--text-primary)",
                        }}
                      >
                        Exam Duration
                      </label>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "6px",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Hours
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            value={Math.floor(editFormData.durationMinutes / 60)}
                            onChange={(e) => {
                              const hours = parseInt(e.target.value) || 0;
                              const minutes = editFormData.durationMinutes % 60;
                              setEditFormData({
                                ...editFormData,
                                durationMinutes: hours * 60 + minutes,
                              });
                            }}
                            disabled={isSavingDetails}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              background: "var(--secondary-bg)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "10px",
                              fontSize: "14px",
                              color: "var(--text-primary)",
                              outline: "none",
                              transition: "border-color 0.2s",
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) =>
                              (e.currentTarget.style.borderColor = "var(--accent-color)")
                            }
                            onBlur={(e) =>
                              (e.currentTarget.style.borderColor = "var(--border-color)")
                            }
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "6px",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Minutes
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={editFormData.durationMinutes % 60}
                            onChange={(e) => {
                              const hours = Math.floor(editFormData.durationMinutes / 60);
                              const minutes = parseInt(e.target.value) || 0;
                              setEditFormData({
                                ...editFormData,
                                durationMinutes: hours * 60 + minutes,
                              });
                            }}
                            disabled={isSavingDetails}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              background: "var(--secondary-bg)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "10px",
                              fontSize: "14px",
                              color: "var(--text-primary)",
                              outline: "none",
                              transition: "border-color 0.2s",
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) =>
                              (e.currentTarget.style.borderColor = "var(--accent-color)")
                            }
                            onBlur={(e) =>
                              (e.currentTarget.style.borderColor = "var(--border-color)")
                            }
                          />
                        </div>
                      </div>
                      {/* Total Duration Display */}
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "12px 16px",
                          background: "var(--info-bg)",
                          border: "1px solid var(--info-color)",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12,6 12,12 16,14"></polyline>
                        </svg>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "var(--info-color)",
                          }}
                        >
                          Total: {calculateDuration()} ({editFormData.durationMinutes} minutes)
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Proctoring Settings Section */}
                <div style={{ marginTop: "32px", marginBottom: "20px" }}>
                  <h4
                    style={{
                      margin: "0 0 20px 0",
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Proctoring Settings
                  </h4>

                  {/* Normal Proctoring */}
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "16px",
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>🖥️</span>
                        <div>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "var(--text-primary)",
                            }}
                          >
                            Normal Proctoring
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Basic monitoring and browser control features
                          </div>
                        </div>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: isSavingDetails ? "not-allowed" : "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editFormData.normalProctoring}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setEditFormData({
                              ...editFormData,
                              normalProctoring: enabled,
                              controlDesktopApps: enabled,
                              screenCountDetection: enabled,
                              safeBrowser: enabled,
                              tabSwitchDetection: enabled,
                              microphoneDetection: enabled,
                            });
                          }}
                          disabled={isSavingDetails}
                          style={{
                            width: "20px",
                            height: "20px",
                            cursor: isSavingDetails ? "not-allowed" : "pointer",
                          }}
                        />
                      </label>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "10px",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      {[
                        {
                          key: "controlDesktopApps",
                          label: "Control Desktop Apps",
                          icon: "🖥️",
                        },
                        {
                          key: "screenCountDetection",
                          label: "Screen Count Detection",
                          icon: "📺",
                        },
                        { key: "safeBrowser", label: "Safe Browser", icon: "🔒" },
                        {
                          key: "tabSwitchDetection",
                          label: "Tab Switch Detection",
                          icon: "🔄",
                        },
                        {
                          key: "microphoneDetection",
                          label: "Microphone Detection",
                          icon: "🎤",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px",
                            background: "var(--secondary-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            cursor:
                              isSavingDetails || !editFormData.normalProctoring
                                ? "not-allowed"
                                : "pointer",
                            opacity: !editFormData.normalProctoring ? 0.5 : 1,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSavingDetails && editFormData.normalProctoring) {
                              e.currentTarget.style.borderColor =
                                "var(--accent-color)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-color)";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              editFormData[
                                item.key as keyof typeof editFormData
                              ] as boolean
                            }
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                [item.key]: e.target.checked,
                              })
                            }
                            disabled={
                              isSavingDetails || !editFormData.normalProctoring
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              cursor:
                                isSavingDetails || !editFormData.normalProctoring
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* AI Powered Proctoring */}
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "16px",
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>🤖</span>
                        <div>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "var(--text-primary)",
                            }}
                          >
                            AI Powered Proctoring
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Advanced AI-based monitoring and detection
                          </div>
                        </div>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: isSavingDetails ? "not-allowed" : "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editFormData.aiPoweredProctoring}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setEditFormData({
                              ...editFormData,
                              aiPoweredProctoring: enabled,
                              thirdEye: enabled,
                              multiPerson: enabled,
                              eyeBall: enabled,
                              objectDetect: enabled,
                              headDirection: enabled,
                              faceAuthentication: enabled,
                            });
                          }}
                          disabled={isSavingDetails}
                          style={{
                            width: "20px",
                            height: "20px",
                            cursor: isSavingDetails ? "not-allowed" : "pointer",
                          }}
                        />
                      </label>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "10px",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      {[
                        { key: "thirdEye", label: "Third Eye", icon: "👁️" },
                        {
                          key: "multiPerson",
                          label: "Multiple Person Detection",
                          icon: "👥",
                        },
                        { key: "eyeBall", label: "Eyeball Detection", icon: "👀" },
                        { key: "objectDetect", label: "Object Detection", icon: "📦" },
                        { key: "headDirection", label: "Head Direction", icon: "🔄" },
                        {
                          key: "faceAuthentication",
                          label: "Face Authentication",
                          icon: "🔐",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px",
                            background: "var(--secondary-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            cursor:
                              isSavingDetails || !editFormData.aiPoweredProctoring
                                ? "not-allowed"
                                : "pointer",
                            opacity: !editFormData.aiPoweredProctoring ? 0.5 : 1,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (
                              !isSavingDetails &&
                              editFormData.aiPoweredProctoring
                            ) {
                              e.currentTarget.style.borderColor =
                                "var(--accent-color)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-color)";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              editFormData[
                                item.key as keyof typeof editFormData
                              ] as boolean
                            }
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                [item.key]: e.target.checked,
                              })
                            }
                            disabled={
                              isSavingDetails || !editFormData.aiPoweredProctoring
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              cursor:
                                isSavingDetails || !editFormData.aiPoweredProctoring
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Recorded Manual Proctoring */}
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "16px",
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>📹</span>
                        <div>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "var(--text-primary)",
                            }}
                          >
                            Recorded Manual Proctoring
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Recording and manual review capabilities
                          </div>
                        </div>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: isSavingDetails ? "not-allowed" : "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editFormData.recordedManualProctoring}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setEditFormData({
                              ...editFormData,
                              recordedManualProctoring: enabled,
                              flagNotifications: enabled,
                              videoRecording: enabled,
                              proctorFeedToTestTaker: enabled,
                              screenSharing: enabled,
                            });
                          }}
                          disabled={isSavingDetails}
                          style={{
                            width: "20px",
                            height: "20px",
                            cursor: isSavingDetails ? "not-allowed" : "pointer",
                          }}
                        />
                      </label>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "10px",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      {[
                        {
                          key: "flagNotifications",
                          label: "Flag Notifications",
                          icon: "🚩",
                        },
                        {
                          key: "videoRecording",
                          label: "Video Recording",
                          icon: "🎥",
                        },
                        {
                          key: "proctorFeedToTestTaker",
                          label: "Proctor Feed to Test Taker",
                          icon: "📹",
                        },
                        {
                          key: "screenSharing",
                          label: "Screen Sharing",
                          icon: "🖥️",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px",
                            background: "var(--secondary-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            cursor:
                              isSavingDetails ||
                              !editFormData.recordedManualProctoring
                                ? "not-allowed"
                                : "pointer",
                            opacity: !editFormData.recordedManualProctoring ? 0.5 : 1,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (
                              !isSavingDetails &&
                              editFormData.recordedManualProctoring
                            ) {
                              e.currentTarget.style.borderColor =
                                "var(--accent-color)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-color)";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              editFormData[
                                item.key as keyof typeof editFormData
                              ] as boolean
                            }
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                [item.key]: e.target.checked,
                              })
                            }
                            disabled={
                              isSavingDetails ||
                              !editFormData.recordedManualProctoring
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              cursor:
                                isSavingDetails ||
                                !editFormData.recordedManualProctoring
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px 16px",
                    background: "var(--warning-bg)",
                    border: "1px solid var(--warning-color)",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                  }}
                >
                  <strong style={{ color: "var(--warning-color)" }}>Note:</strong>{" "}
                  Changing the exam schedule may affect students who have already
                  registered. Make sure to notify them of any changes.
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowEditDetailsModal(false)}
                disabled={isSavingDetails}
                style={{
                  padding: "12px 24px",
                  background: "var(--button-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                  cursor: isSavingDetails ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: isSavingDetails ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExamDetails}
                disabled={isSavingDetails}
                style={{
                  padding: "12px 24px",
                  background: isSavingDetails
                    ? "var(--text-secondary)"
                    : "var(--accent-color)",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                  cursor: isSavingDetails ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {isSavingDetails ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "14px",
                        height: "14px",
                        border: "2px solid white",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default ExamCard;
