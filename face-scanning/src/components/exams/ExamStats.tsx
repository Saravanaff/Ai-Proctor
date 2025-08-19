import React from 'react';
import styles from '../../styles/CreateExamPage.module.css';

interface Stats {
  total: number;
  active: number;
  draft: number;
  completed: number;
}

const ExamStats: React.FC<{ stats: Stats }> = ({ stats }) => (
  <section className={`${styles.statsRow} ${styles.fadeIn}`}>
    <div className={styles.statCard}>
      <span className={styles.statLabel}>Total</span>
      <span className={styles.statValue}>{stats.total}</span>
    </div>
    <div className={`${styles.statCard} ${styles.statActive}`}>
      <span className={styles.statLabel}>Active</span>
      <span className={styles.statValue}>{stats.active}</span>
    </div>
    <div className={`${styles.statCard} ${styles.statDraft}`}>
      <span className={styles.statLabel}>Draft</span>
      <span className={styles.statValue}>{stats.draft}</span>
    </div>
    <div className={`${styles.statCard} ${styles.statCompleted}`}>
      <span className={styles.statLabel}>Completed</span>
      <span className={styles.statValue}>{stats.completed}</span>
    </div>
  </section>
);

export default ExamStats;
