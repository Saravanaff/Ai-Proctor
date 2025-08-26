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
    { 
      label: 'TOTAL', 
      value: stats.total, 
      color: '#1f2937',
      bgColor: '#f8fafc'
    },
    { 
      label: 'ACTIVE', 
      value: stats.active, 
      color: '#059669',
      bgColor: '#ecfdf5'
    },
    { 
      label: 'DRAFT', 
      value: stats.draft, 
      color: '#d97706',
      bgColor: '#fffbeb'
    },
    { 
      label: 'COMPLETED', 
      value: stats.completed, 
      color: '#6b7280',
      bgColor: '#f9fafb'
    }
  ];

  return (
    <div className="theme-transition" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '24px',
      marginBottom: '32px',
      transition: 'all 0.3s ease'
    }}>
      {statItems.map((item, index) => (
        <div 
          key={index}
          className="theme-transition"
          style={{
            background: item.bgColor,
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            transition: 'all 0.15s ease',
            border: '1px solid rgba(226, 232, 240, 0.5)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            fontSize: '36px',
            fontWeight: '700',
            color: item.color,
            marginBottom: '8px',
            lineHeight: 1
          }}>
            {item.value}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: item.color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExamStats;
