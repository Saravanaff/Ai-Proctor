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
    {exams.map(e => <ExamCard key={e.id} exam={e} formatRange={formatRange} />)}
  </div>
);

export default ExamsGrid;
