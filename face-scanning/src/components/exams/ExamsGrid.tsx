import React, { useState } from 'react';
import { Exam } from '../../types/exam';
import styles from '../../styles/CreateExamPage.module.css';

interface ExamsGridProps {
  exams: Exam[];
  formatRange: (start?: string, end?: string) => string;
}

const ExamsGrid: React.FC<ExamsGridProps> = ({ exams, formatRange }) => {
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const handleViewDetails = (exam: any) => {
    setSelectedExam(exam);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedExam(null);
  };

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '24px'
      }}>
      {exams.map((exam) => (
        <div
          key={exam.id}
          className={`${styles.examCard} theme-transition`}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
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
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h3 style={{
              color: 'var(--text-primary)',
              fontSize: '18px',
              fontWeight: '600',
              margin: 0,
              lineHeight: 1.3,
              flex: 1,
              marginRight: '12px'
            }}>
              {(exam as any).exam_name || exam.name || 'Untitled Exam'}
            </h3>
            <span style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              color: exam.status === 'draft' ? 'var(--warning-color)' : exam.status === 'active' ? 'var(--success-color)' : 'var(--text-secondary)',
              background: exam.status === 'draft' ? 'var(--warning-bg)' : exam.status === 'active' ? 'var(--success-bg)' : 'var(--card-bg)',
              border: `1px solid ${exam.status === 'draft' ? 'var(--warning-color)' : exam.status === 'active' ? 'var(--success-color)' : 'var(--border-color)'}`,
              whiteSpace: 'nowrap'
            }}>
              {exam.status}
            </span>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <span style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14px', 
              fontWeight: '500'
            }}>
              Exam Key: 
            </span>
            <span style={{ 
              color: 'var(--text-primary)', 
              fontSize: '14px', 
              fontFamily: 'monospace',
              fontWeight: '600',
              background: 'var(--secondary-bg)',
              padding: '2px 6px',
              borderRadius: '4px',
              marginLeft: '4px'
            }}>
              {(exam as any).exam_key || (exam as any).key || 'N/A'}
            </span>
          </div>

          {/* Participants */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '14px', 
              fontWeight: '500'
            }}>
              Participants: 
            </span>
            <span style={{ 
              color: 'var(--text-primary)', 
              fontSize: '14px', 
              fontWeight: '600'
            }}>
              {(exam as any).participants || ((exam as any).attendances ? (exam as any).attendances.length : 0)}
            </span>
          </div>


          {/* Exam ID */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '12px', 
              fontWeight: '500'
            }}>
              ID: {exam.id}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetails(exam);
              }}
              style={{
                flex: 1,
                background: 'var(--accent-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--success-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-color)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              View Details
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Handle edit action
              }}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--button-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit
            </button>
          </div>
        </div>
      ))}
      </div>

      {/* Modal for exam details */}
      {showModal && selectedExam && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              background: 'var(--modal-bg)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 40px var(--shadow)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ 
                margin: 0, 
                color: 'var(--text-primary)', 
                fontSize: '24px', 
                fontWeight: '700'
              }}>
                Exam Details
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'var(--button-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--button-hover)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--button-bg)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ color: 'var(--text-primary)' }}>
              <h3 style={{ 
                margin: '0 0 20px 0', 
                fontSize: '20px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                {(selectedExam as any).exam_name || selectedExam.name || 'Untitled Exam'}
              </h3>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>Status:</strong> {selectedExam.status}
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>Exam Key:</strong> {(selectedExam as any).exam_key || (selectedExam as any).key || 'N/A'}
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>Participants:</strong> {(selectedExam as any).participants || ((selectedExam as any).attendances ? (selectedExam as any).attendances.length : 0)}
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong>ID:</strong> {selectedExam.id}
              </div>
              
              {(selectedExam as any).attendances && (selectedExam as any).attendances.length > 0 && (
                <div>
                  <strong>Enrolled Students:</strong>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {(selectedExam as any).attendances.map((attendance: any, idx: number) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        {attendance.user?.name || attendance.student_name || `Student ${idx + 1}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExamsGrid;
