import React from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

const SearchBar: React.FC<Props> = ({ value, onChange }) => (
  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
    <svg
      style={{
        position: "absolute",
        left: "12px",
        width: "16px",
        height: "16px",
        color: 'var(--text-secondary)',
        pointerEvents: "none",
        transition: "color 0.3s ease",
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
      className="input-theme theme-transition"
      style={{
        width: "240px",
        padding: "10px 12px 10px 40px",
        border: '1px solid var(--border-color)',
        borderRadius: "12px",
        background: 'var(--input-bg)',
        color: 'var(--text-primary)',
        fontSize: "14px",
        outline: "none",
        transition: "all 0.3s ease",
        boxShadow: '0 2px 8px var(--shadow)'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = "var(--accent-color)";
        e.target.style.boxShadow = "0 0 0 2px rgba(139, 92, 246, 0.2)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'var(--border-color)';
        e.target.style.boxShadow = '0 2px 8px var(--shadow)';
      }}
    />
  </div>
);

export default SearchBar;
