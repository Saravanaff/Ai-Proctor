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
    { label: 'Total', value: stats.total, color: '#ffffff' },
    { label: 'Active', value: stats.active, color: '#34d399' },
    { label: 'Draft', value: stats.draft, color: '#fbbf24' },
    { label: 'Completed', value: stats.completed, color: '#94a3b8' }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
      padding: '20px',
      background: '#0f0f0f',
      border: '1px solid #1f1f1f',
      borderRadius: '12px'
    }}>
      {statItems.map((item, index) => (
        <div 
          key={index}
          style={{
            background: '#111111',
            border: '1px solid #262626',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
            transition: 'transform 0.15s ease, border-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = '#404040';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = '#262626';
          }}
        >
          <div style={{
            fontSize: '28px',
            fontWeight: 700,
            color: item.color,
            marginBottom: '8px',
            lineHeight: 1
          }}>
            {item.value}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#a3a3a3',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 500
          }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExamStats;
