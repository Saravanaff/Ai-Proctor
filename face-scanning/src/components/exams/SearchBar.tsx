import React from 'react';
import styles from '../../styles/CreateExamPage.module.css';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const SearchBar: React.FC<Props> = ({ value, onChange }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
    <svg
      style={{
        position: 'absolute',
        left: '12px',
        width: '16px',
        height: '16px',
        color: '#737373',
        pointerEvents: 'none',
      }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search exams..."
      style={{
        width: '240px',
        padding: '10px 12px 10px 40px',
        border: '1px solid #262626',
        borderRadius: '8px',
        background: '#0a0a0a',
        color: '#fafafa',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.15s ease',
      }}
      onFocus={(e) => (e.target.style.borderColor = '#404040')}
      onBlur={(e) => (e.target.style.borderColor = '#262626')}
    />
  </div>
);

export default SearchBar;
