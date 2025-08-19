import React from 'react';
import styles from '../../styles/CreateExamPage.module.css';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const SearchBar: React.FC<Props> = ({ value, onChange }) => (
  <div className={styles.searchWrapper}>
    <input
      type="text"
      placeholder="Search exams..."
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${styles.input} ${styles.searchInput}`}
      aria-label="Search exams"
    />
  </div>
);

export default SearchBar;
