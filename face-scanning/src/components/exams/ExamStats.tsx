import React from 'react';

interface ExamStatsProps {
  stats: {
    total: number;
    active: number;
    draft: number;
    completed: number;
  };
}

const ExamStats: React.FC<ExamStatsProps> = ({ stats }) => {
  const statItems = [
    { label: 'Total', value: stats.total, color: 'var(--text-primary)' },
    { label: 'Active', value: stats.active, color: 'var(--success-color)' },
    { label: 'Draft', value: stats.draft, color: 'var(--warning-color)' },
    { label: 'Completed', value: stats.completed, color: 'var(--text-secondary)' }
  ];

  return (
    <div className="theme-transition" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
      padding: '20px',
      background: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      transition: 'all 0.3s ease'
    }}>
      {statItems.map((item, index) => (
        <div 
          key={index}
          className="theme-transition"
          style={{
            background: 'var(--secondary-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            fontSize: '28px',
            fontWeight: 700,
            color: item.color,
            marginBottom: '8px',
            lineHeight: 1,
            transition: 'color 0.3s ease'
          }}>
            {item.value}
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 500,
            transition: 'color 0.3s ease'
          }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExamStats;
