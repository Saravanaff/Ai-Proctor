import React from "react";
import { getSeverityColor } from "../../utils/participantUtils";
import styles from "../../styles/ParticipantDetailsPage.module.css";

interface TooltipState {
  visible: boolean;
  content: string;
  title: string;
  severity: string;
  x: number;
  y: number;
}

interface TooltipProviderProps {
  tooltip: TooltipState;
}

const TooltipProvider: React.FC<TooltipProviderProps> = ({ tooltip }) => {
  if (!tooltip.visible) {
    return null;
  }

  return (
    <div
      className={styles.violationTooltip}
      style={{
        left: tooltip.x - 150,
        top: tooltip.y - 80,
      }}
    >
      <span className={styles.tooltipTitle}>{tooltip.title}</span>
      <div className={styles.tooltipDescription}>{tooltip.content}</div>
      <span
        className={styles.tooltipSeverity}
        style={{
          backgroundColor: getSeverityColor(tooltip.severity),
          color: "white",
        }}
      >
        {tooltip.severity} risk
      </span>
    </div>
  );
};

export default TooltipProvider;