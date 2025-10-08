import React from "react";
import styles from "../../styles/ParticipantDetailsPage.module.css";

type TabType = "overview" | "timeline" | "review";

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  violationsCount: number;
  hasVideoData: boolean;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  violationsCount,
  hasVideoData,
}) => {
  const tabs: { id: TabType; label: string; badge?: number; disabled?: boolean }[] = [
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "timeline",
      label: "Timeline",
      badge: violationsCount,
    },
    {
      id: "review",
      label: "Video Review",
      disabled: !hasVideoData,
    },
  ];

  return (
    <div className={styles.tabNavigation}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tabButton} ${
            activeTab === tab.id ? styles.activeTab : ""
          } ${tab.disabled ? styles.disabledTab : ""}`}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
          title={
            tab.disabled
              ? "No video data available for this participant"
              : `Switch to ${tab.label} tab`
          }
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className={styles.tabBadge}>{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;