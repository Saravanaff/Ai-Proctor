import React from "react";
import { ViolationEvent, getSeverityColor, formatTimestamp } from "../../utils/participantUtils";
import styles from "../../styles/ParticipantDetailsPage.module.css";

interface ViolationsListProps {
  violations: ViolationEvent[];
  examStartTime: Date | null;
  onViolationClick: (timestamp: string) => void;
  onTooltipShow: (e: React.MouseEvent, violationType: string) => void;
  onTooltipHide: () => void;
}

const ViolationsList: React.FC<ViolationsListProps> = ({
  violations,
  examStartTime,
  onViolationClick,
  onTooltipShow,
  onTooltipHide,
}) => {
  // Helper function to get relative time from exam start
  const getRelativeTimeFromExamStart = (timestamp: string): string => {
    if (!examStartTime) return "Unknown";

    try {
      const violationTime = new Date(timestamp);
      const diffInSeconds = (violationTime.getTime() - examStartTime.getTime()) / 1000;

      if (diffInSeconds < 0) return "Before exam start";

      const hours = Math.floor(diffInSeconds / 3600);
      const minutes = Math.floor((diffInSeconds % 3600) / 60);
      const seconds = Math.floor(diffInSeconds % 60);

      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else {
        return `${seconds}s`;
      }
    } catch (error) {
      return "Unknown";
    }
  };

  if (violations.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 40px",
          color: "var(--text-secondary)",
          fontStyle: "italic",
          background: "var(--card-bg)",
          borderRadius: "12px",
          border: "1px dashed var(--border-color)",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "16px" }}>
          <div
            className={styles.iconContainer}
            style={{
              fontSize: "2rem",
              width: "40px",
              height: "40px",
            }}
          >
            <div
              className={styles.checkIcon}
              style={{
                width: "32px",
                height: "32px",
                border: "4px solid var(--success-color)",
              }}
            ></div>
          </div>
        </div>
        <h4
          style={{
            margin: "0 0 8px 0",
            color: "var(--text-primary)",
          }}
        >
          No Violations Recorded
        </h4>
        <p style={{ margin: "0", fontSize: "0.9rem" }}>
          Great! No violations were detected during this exam session.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.violationsList}>
      {violations.map((violation) => (
        <div
          key={violation.id}
          className={styles.violationItem}
          onClick={() => {
            console.log(
              `Seeking to violation: ${violation.type} at ${violation.timestamp}`
            );
            onViolationClick(violation.timestamp);
          }}
          style={{
            cursor: "pointer",
            transition: "all 0.3s ease",
            border: "1px solid transparent",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "8px",
            background: "var(--card-bg)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0,123,255,0.05)";
            e.currentTarget.style.borderColor = "var(--primary-color)";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,123,255,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--card-bg)";
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
          }}
          title={`Click to jump to ${violation.type} at ${formatTimestamp(violation.timestamp)}`}
        >
          <div className={styles.violationHeader}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <span
                className={styles.violationSeverity}
                style={{
                  backgroundColor: getSeverityColor(violation.severity),
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {violation.severity}
              </span>
              <span
                className={styles.violationType}
                style={{
                  fontWeight: "600",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  cursor: "help",
                }}
                onMouseEnter={(e) => onTooltipShow(e, violation.type)}
                onMouseLeave={onTooltipHide}
              >
                {violation.type}
              </span>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div
                  className={styles.violationTime}
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--primary-color)",
                    fontWeight: "500",
                  }}
                >
                  <div className={styles.iconContainer}>
                    <div className={styles.clockIcon}></div>
                  </div>
                  {formatTimestamp(violation.timestamp)}
                </div>
                <small
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.75rem",
                    display: "block",
                    marginTop: "2px",
                  }}
                >
                  +{getRelativeTimeFromExamStart(violation.timestamp)} from start
                </small>
              </div>
            </div>
          </div>

          <div className={styles.violationContent}>
            <p
              className={styles.violationDescription}
              style={{
                margin: "8px 0 0 0",
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
                lineHeight: "1.4",
              }}
            >
              {violation.description}
            </p>
            <div
              style={{
                marginTop: "8px",
                fontSize: "0.8rem",
                color: "var(--primary-color)",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <div className={styles.iconContainer}>
                <div className={styles.playIcon}></div>
              </div>
              Click to jump to video timestamp
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ViolationsList;