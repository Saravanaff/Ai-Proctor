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
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            transition: 'all 0.15s ease',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h3 style={{
              color: '#1f2937',
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
              color: exam.status === 'draft' ? '#d97706' : exam.status === 'active' ? '#059669' : '#6b7280',
              background: exam.status === 'draft' ? '#fffbeb' : exam.status === 'active' ? '#ecfdf5' : '#f9fafb',
              border: `1px solid ${exam.status === 'draft' ? '#fed7aa' : exam.status === 'active' ? '#a7f3d0' : '#e5e7eb'}`,
              whiteSpace: 'nowrap'
            }}>
              {exam.status}
            </span>
          </div>

          {/* Exam Key */}
          <div style={{ marginBottom: '12px' }}>
            <span style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              fontWeight: '500'
            }}>
              Exam Key: 
            </span>
            <span style={{ 
              color: '#1f2937', 
              fontSize: '14px', 
              fontFamily: 'monospace',
              fontWeight: '600'
            }}>
              {(exam as any).exam_key || (exam as any).key || 'N/A'}
            </span>
          </div>

          {/* Participants */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              fontWeight: '500'
            }}>
              Participants: 
            </span>
            <span style={{ 
              color: '#1f2937', 
              fontSize: '14px', 
              fontWeight: '600'
            }}>
              {(exam as any).participants || ((exam as any).attendances ? (exam as any).attendances.length : 0)}
            </span>
          </div>


          {/* Exam ID */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ 
              color: '#6b7280', 
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
                background: '#8b5cf6',
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
                e.currentTarget.style.background = '#7c3aed';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#8b5cf6';
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
                color: '#6b7280',
                border: '1px solid #e2e8f0',
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
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#6b7280';
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
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px', fontWeight: '600' }}>
                Exam Details
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ color: '#374151' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
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
