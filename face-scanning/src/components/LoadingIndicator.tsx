import React from "react";
import styles from "./LoadingIndicator.module.css";

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} />
      <div className={styles.message}>{message}</div>
    </div>
  );
};

export default LoadingIndicator;
