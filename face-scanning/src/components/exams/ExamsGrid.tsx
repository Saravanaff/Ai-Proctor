import React, { useState } from 'react';
import { Exam } from '../../types/exam';

interface ExamsGridProps {
  exams: Exam[];
  formatRange: (start?: string, end?: string) => string;
}

const ExamsGrid: React.FC<ExamsGridProps> = ({ exams, formatRange }) => {
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // Debug: Log exam data to see what's available
  console.log('ExamsGrid received exams:', exams);
  
  const handleViewDetails = (exam: any) => {
    setSelectedExam(exam);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedExam(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#34d399';
      case 'draft': return '#fbbf24';
      case 'completed': return '#94a3b8';
      default: return '#737373';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return 'rgba(52, 211, 153, 0.1)';
      case 'draft': return 'rgba(251, 191, 36, 0.1)';
      case 'completed': return 'rgba(148, 163, 184, 0.1)';
      default: return 'rgba(115, 115, 115, 0.1)';
    }
  };

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
      {exams.map((exam) => (
        <div
          key={exam.id}
          style={{
            background: '#0f0f0f',
            border: '1px solid #1f1f1f',
            borderRadius: '12px',
            padding: '20px',
            transition: 'all 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2a2a2a';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1f1f1f';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <h3 style={{
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.3,
              flex: 1,
              marginRight: '12px'
            }}>
              {(exam as any).exam_name || exam.name || 'Untitled Exam'}
            </h3>
            <span style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              color: getStatusColor(exam.status),
              background: getStatusBg(exam.status),
              border: `1px solid ${getStatusColor(exam.status)}33`,
              whiteSpace: 'nowrap'
            }}>
              {exam.status}
            </span>
          </div>

          {/* Content */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#737373', fontSize: '12px', fontWeight: 500 }}>Exam Key: </span>
              <span style={{ 
                color: '#ffffff', 
                fontSize: '13px', 
                fontFamily: 'monospace',
                background: '#111111',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #262626'
              }}>
                {(exam as any).exam_key || (exam as any).key || 'N/A'}
              </span>
            </div>

            {/* Participants count */}
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span style={{ color: '#737373', fontSize: '12px', fontWeight: 500 }}>Participants: </span>
              <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 600 }}>
                {(exam as any).participants || ((exam as any).attendances ? (exam as any).attendances.length : 0)}
              </span>
            </div>

            {/* Show participant names if available */}
            {(exam as any).attendances && (exam as any).attendances.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#737373', fontSize: '11px', fontWeight: 500 }}>Enrolled: </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {(exam as any).attendances.slice(0, 3).map((attendance: any, index: number) => (
                    <span key={index} style={{
                      background: '#111111',
                      border: '1px solid #262626',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: '#a3a3a3'
                    }}>
                      {attendance.user?.name || `User ${attendance.user_id}`}
                    </span>
                  ))}
                  {(exam as any).attendances.length > 3 && (
                    <span style={{
                      background: '#111111',
                      border: '1px solid #262626',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: '#737373'
                    }}>
                      +{(exam as any).attendances.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {(exam as any).description && (
              <p style={{
                color: '#a3a3a3',
                fontSize: '13px',
                margin: '8px 0 0 0',
                lineHeight: 1.4
              }}>
                {(exam as any).description}
              </p>
            )}
          </div>

          {/* Footer */}
          <div style={{ 
            borderTop: '1px solid #1f1f1f', 
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span style={{ color: '#737373', fontSize: '12px' }}>
                {formatRange((exam as any).start_time || exam.startTime, (exam as any).end_time || exam.endTime)}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                color: '#ffffff', 
                fontSize: '12px', 
                fontWeight: 600,
                background: '#111111',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #262626'
              }}>
                ID: {exam.id}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ 
            marginTop: '12px',
            display: 'flex',
            gap: '8px'
          }}>
            <button style={{
              flex: 1,
              padding: '8px 12px',
              background: '#ffffff',
              border: '1px solid #ffffff',
              color: '#0a0a0a',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
            onClick={() => handleViewDetails(exam)}
            >
              View Details
            </button>
            <button style={{
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid #2c2c2c',
              color: '#e5e5e5',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* Participants Modal */}
    {showModal && selectedExam && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: '#0f0f0f',
          border: '1px solid #1f1f1f',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
        }}>
          {/* Modal Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 600, margin: 0 }}>
              Exam Details: {selectedExam.exam_name}
            </h2>
            <button
              onClick={closeModal}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#737373',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* Exam Info */}
          <div style={{ marginBottom: '20px', padding: '16px', background: '#111111', border: '1px solid #262626', borderRadius: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <span style={{ color: '#737373', fontSize: '12px', fontWeight: 500 }}>Exam Key: </span>
                <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>{selectedExam.exam_key || selectedExam.key}</span>
              </div>
              <div>
                <span style={{ color: '#737373', fontSize: '12px', fontWeight: 500 }}>Status: </span>
                <span style={{ 
                  color: getStatusColor(selectedExam.status), 
                  fontSize: '14px', 
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  {selectedExam.status || 'Draft'}
                </span>
              </div>
              <div>
                <span style={{ color: '#737373', fontSize: '12px', fontWeight: 500 }}>Participants: </span>
                <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>
                  {selectedExam.attendances ? selectedExam.attendances.length : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Participants List */}
          <div>
            <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
              Enrolled Participants ({selectedExam.attendances ? selectedExam.attendances.length : 0})
            </h3>
            
            {selectedExam.attendances && selectedExam.attendances.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {selectedExam.attendances.map((attendance: any, index: number) => (
                  <div key={index} style={{
                    background: '#111111',
                    border: '1px solid #262626',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#262626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 600
                    }}>
                      {attendance.user?.name ? attendance.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>
                        {attendance.user?.name || `User ${attendance.user_id}`}
                      </div>
                      <div style={{ color: '#737373', fontSize: '12px' }}>
                        {attendance.user?.email || 'No email provided'}
                      </div>
                    </div>
                    <div style={{
                      background: '#0a0a0a',
                      border: '1px solid #262626',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: '#a3a3a3'
                    }}>
                      ID: {attendance.user_id}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#737373',
                fontSize: '14px'
              }}>
                No participants enrolled yet
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={closeModal}
              style={{
                background: '#ffffff',
                border: '1px solid #ffffff',
                color: '#0a0a0a',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default ExamsGrid;
