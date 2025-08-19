import React from 'react';
import { Exam } from '../../types/exam';
import styles from '../../styles/CreateExamPage.module.css';

interface Props {
  exam: Exam;
  formatRange: (s?: string, e?: string) => string;
}

const ExamCard: React.FC<Props> = ({ exam, formatRange }) => (
  <div className={`${styles.examCard} ${styles.glassPanel} ${styles.hoverLift}`}>
    <div className={styles.examHeader}>
      <h4 className={styles.examTitle} title={exam.name}>{exam.name}</h4>
      <span className={styles.statusBadge} data-status={exam.status}>{exam.status}</span>
    </div>
    <div className={styles.examMetaRow}>
      <span className={styles.metaItem}>📅 {new Date(exam.createdAt).toLocaleDateString()}</span>
      <span className={styles.metaItem}>👥 {exam.studentsCount}</span>
    </div>
    <div className={styles.examWindow}>
      <span className={styles.metaItem}>⏰ {formatRange(exam.startTime, exam.endTime)}</span>
    </div>
    <div className={styles.examActions}>
      <button className={`${styles.btn} ${styles.btnGhost} ${styles.smallBtn}`}>Manage</button>
      <button className={`${styles.btn} ${styles.btnOutline} ${styles.smallBtn}`}>Analytics</button>
    </div>
  </div>
);

export default ExamCard;
