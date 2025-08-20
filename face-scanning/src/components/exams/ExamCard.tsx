import React, { useState } from 'react';
import { Exam } from '../../types/exam';
import styles from '../../styles/CreateExamPage.module.css';

interface Props {
  exam: Exam;
  formatRange: (s?: string, e?: string) => string;
}

const ExamCard: React.FC<Props> = ({ exam, formatRange }) => {
  const [copied, setCopied] = useState(false);
  
  // Handle different property names flexibly
  const examName = (exam as any).exam_name || (exam as any).name || 'Untitled Exam';
  const createdAt = (exam as any).created_at || (exam as any).createdAt || new Date();
  const studentsCount = (exam as any).students_count || (exam as any).studentsCount || 0;
  const startTime = (exam as any).start_time || (exam as any).startTime;
  const endTime = (exam as any).end_time || (exam as any).endTime;
  const status = (exam as any).status || 'draft';
  const examKey = (exam as any).key || (exam as any).exam_key || (exam as any).id;

  const copyToClipboard = async () => {
    if (examKey) {
      try {
        await navigator.clipboard.writeText(examKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  };

  return (
    <div className={`${styles.examCard} ${styles.glassPanel} ${styles.hoverLift}`}>
      <div className={styles.examHeader}>
        <h4 className={styles.examTitle} title={examName}>{examName}</h4>
        <span className={styles.statusBadge} data-status={status}>{status}</span>
      </div>
      
      {examKey && (
        <div className={styles.examKeyRow} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '8px 0', 
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>Key:</span>
          <code style={{ 
            fontSize: '11px', 
            background: 'rgba(255,255,255,0.1)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {examKey}
          </code>
          <button
            onClick={copyToClipboard}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            title={copied ? 'Copied!' : 'Copy exam key'}
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
      )}
      
      <div className={styles.examMetaRow}>
        <span className={styles.metaItem}>📅 {new Date(createdAt).toLocaleDateString()}</span>
        <span className={styles.metaItem}>👥 {studentsCount}</span>
      </div>
      <div className={styles.examWindow}>
        <span className={styles.metaItem}>⏰ {formatRange(startTime, endTime)}</span>
      </div>
      <div className={styles.examActions}>
        <button className={`${styles.btn} ${styles.btnGhost} ${styles.smallBtn}`}>Manage</button>
        <button className={`${styles.btn} ${styles.btnOutline} ${styles.smallBtn}`}>Analytics</button>
      </div>
    </div>
  );
};

export default ExamCard;
