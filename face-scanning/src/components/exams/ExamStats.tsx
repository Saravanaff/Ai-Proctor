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
      colorClass: 'total'
    },
    { 
      label: 'ACTIVE', 
      value: stats.active, 
      colorClass: 'active'
    },
    { 
      label: 'DRAFT', 
      value: stats.draft, 
      colorClass: 'draft'
    },
    { 
      label: 'COMPLETED', 
      value: stats.completed, 
      colorClass: 'completed'
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
          className={`theme-transition stat-card stat-card--${item.colorClass}`}
          style={{
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            transition: 'all 0.3s ease',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 16px var(--shadow)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 32px var(--shadow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px var(--shadow)';
          }}
        >
          <div style={{
            fontSize: '36px',
            fontWeight: '700',
            color: item.colorClass === 'total' ? 'var(--text-primary)' : 
                   item.colorClass === 'active' ? 'var(--success-color)' :
                   item.colorClass === 'draft' ? 'var(--warning-color)' :
                   'var(--text-secondary)',
            marginBottom: '8px',
            lineHeight: 1
          }}>
            {item.value}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: item.colorClass === 'total' ? 'var(--text-primary)' : 
                   item.colorClass === 'active' ? 'var(--success-color)' :
                   item.colorClass === 'draft' ? 'var(--warning-color)' :
                   'var(--text-secondary)',
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
