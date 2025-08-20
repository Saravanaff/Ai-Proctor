import React from 'react';
import { Exam } from '../../types/exam';
import ExamCard from './ExamCard';
import styles from '../../styles/CreateExamPage.module.css';

interface Props {
  exams: Exam[];
  formatRange: (s?: string, e?: string) => string;
}

const ExamsGrid: React.FC<Props> = ({ exams, formatRange }) => (
  <div className={styles.examsGrid}>
    {exams.map((exam) => {
      // Use the exam key from backend or fall back to other unique identifiers
      const uniqueKey = (exam as any).key || (exam as any).id || (exam as any).exam_name;
      return (
        <ExamCard
          key={uniqueKey}
          exam={exam}
          formatRange={formatRange}
        />
      );
    })}
  </div>
);

export default ExamsGrid;
