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
      case 'active': return 'var(--success-color)';
      case 'draft': return 'var(--warning-color)';
      case 'completed': return 'var(--text-secondary)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return 'var(--success-bg)';
      case 'draft': return 'var(--warning-bg)';
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
          className={`${styles.examCard} theme-transition`}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            transition: 'all 0.15s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px var(--shadow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <h3 style={{
              color: 'var(--text-primary)',
              fontSize: '16px',
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.3,
              transition: 'color 0.3s ease',
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
              <span className="theme-transition" style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '12px', 
                fontWeight: 500,
                transition: 'color 0.3s ease'
              }}>
                Exam Key: 
              </span>
              <span className="theme-transition" style={{ 
                color: 'var(--text-primary)', 
                fontSize: '13px', 
                fontFamily: 'monospace',
                background: 'var(--secondary-bg)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                transition: 'all 0.3s ease'
              }}>
                {(exam as any).exam_key || (exam as any).key || 'N/A'}
              </span>
            </div>

            {/* Participants count */}
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" className="theme-transition" style={{ transition: 'stroke 0.3s ease' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span className="theme-transition" style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '12px', 
                fontWeight: 500,
                transition: 'color 0.3s ease'
              }}>
                Participants: 
              </span>
              <span className="theme-transition" style={{ 
                color: 'var(--text-primary)', 
                fontSize: '12px', 
                fontWeight: 600,
                transition: 'color 0.3s ease'
              }}>
                {(exam as any).participants || ((exam as any).attendances ? (exam as any).attendances.length : 0)}
              </span>
            </div>

            {/* Show participant names if available */}
            {(exam as any).attendances && (exam as any).attendances.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <span className="theme-transition" style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '11px', 
                  fontWeight: 500,
                  transition: 'color 0.3s ease'
                }}>
                  Enrolled: 
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {(exam as any).attendances.slice(0, 3).map((attendance: any, index: number) => (
                    <span key={index} className="theme-transition" style={{
                      background: 'var(--secondary-bg)',
                      border: '1px solid var(--border-color)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.3s ease'
                    }}>
                      {attendance.user?.name || `User ${attendance.user_id}`}
                    </span>
                  ))}
                  {(exam as any).attendances.length > 3 && (
                    <span className="theme-transition" style={{
                      background: 'var(--secondary-bg)',
                      border: '1px solid var(--border-color)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.3s ease'
                    }}>
                      +{(exam as any).attendances.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {(exam as any).description && (
              <p className="theme-transition" style={{
                color: 'var(--text-secondary)',
                fontSize: '13px',
                margin: '8px 0 0 0',
                lineHeight: 1.4,
                transition: 'color 0.3s ease'
              }}>
                {(exam as any).description}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="theme-transition" style={{ 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            transition: 'border-color 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" className="theme-transition" style={{ transition: 'stroke 0.3s ease' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="theme-transition" style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '12px',
                transition: 'color 0.3s ease'
              }}>
                {formatRange((exam as any).start_time || exam.startTime, (exam as any).end_time || exam.endTime)}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="theme-transition" style={{ 
                color: 'var(--text-primary)', 
                fontSize: '12px', 
                fontWeight: 600,
                background: 'var(--secondary-bg)',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                transition: 'all 0.3s ease'
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
            <button className="theme-transition" style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--accent-color)',
              border: '1px solid var(--accent-color)',
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
            onClick={() => handleViewDetails(exam)}
            >
              View Details
            </button>
            <button className="theme-transition" style={{
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--button-hover)'}
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
      <div className="modal-overlay theme-transition" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--overlay-bg)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        transition: 'background-color 0.3s ease'
      }}>
        <div className="theme-transition" style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 50px var(--shadow)',
          transition: 'all 0.3s ease'
        }}>
          {/* Modal Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="theme-transition" style={{ 
              color: 'var(--text-primary)', 
              fontSize: '20px', 
              fontWeight: 600, 
              margin: 0,
              transition: 'color 0.3s ease'
            }}>
              Exam Details: {selectedExam.exam_name}
            </h2>
            <button
              onClick={closeModal}
              className="theme-transition"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
                transition: 'all 0.3s ease',
                borderRadius: '4px'
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
              ×
            </button>
          </div>

          {/* Exam Info */}
          <div className="theme-transition" style={{ 
            marginBottom: '20px', 
            padding: '16px', 
            background: 'var(--secondary-bg)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <span className="theme-transition" style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '12px', 
                  fontWeight: 500,
                  transition: 'color 0.3s ease'
                }}>
                  Exam Key: 
                </span>
                <span className="theme-transition" style={{ 
                  color: 'var(--text-primary)', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  transition: 'color 0.3s ease'
                }}>
                  {selectedExam.exam_key || selectedExam.key}
                </span>
              </div>
              <div>
                <span className="theme-transition" style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '12px', 
                  fontWeight: 500,
                  transition: 'color 0.3s ease'
                }}>
                  Status: 
                </span>
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
                <span className="theme-transition" style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '12px', 
                  fontWeight: 500,
                  transition: 'color 0.3s ease'
                }}>
                  Participants: 
                </span>
                <span className="theme-transition" style={{ 
                  color: 'var(--text-primary)', 
                  fontSize: '14px', 
                  fontWeight: 600,
                  transition: 'color 0.3s ease'
                }}>
                  {selectedExam.attendances ? selectedExam.attendances.length : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Participants List */}
          <div>
            <h3 className="theme-transition" style={{ 
              color: 'var(--text-primary)', 
              fontSize: '16px', 
              fontWeight: 600, 
              marginBottom: '12px',
              transition: 'color 0.3s ease'
            }}>
              Enrolled Participants ({selectedExam.attendances ? selectedExam.attendances.length : 0})
            </h3>
            
            {selectedExam.attendances && selectedExam.attendances.length > 0 ? (
              <div style={{ display: 'grid', gap: '8px' }}>
                {selectedExam.attendances.map((attendance: any, index: number) => (
                  <div key={index} className="theme-transition" style={{
                    background: 'var(--secondary-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.3s ease'
                  }}>
                    <div className="theme-transition" style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 600
                    }}>
                      {attendance.user?.name ? attendance.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="theme-transition" style={{ 
                        color: 'var(--text-primary)', 
                        fontSize: '14px', 
                        fontWeight: 500,
                        transition: 'color 0.3s ease'
                      }}>
                        {attendance.user?.name || `User ${attendance.user_id}`}
                      </div>
                      <div className="theme-transition" style={{ 
                        color: 'var(--text-secondary)', 
                        fontSize: '12px',
                        transition: 'color 0.3s ease'
                      }}>
                        {attendance.user?.email || 'No email provided'}
                      </div>
                    </div>
                    <div className="theme-transition" style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      transition: 'all 0.3s ease'
                    }}>
                      ID: {attendance.user_id}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="theme-transition" style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                transition: 'color 0.3s ease'
              }}>
                No participants enrolled yet
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={closeModal}
              className="theme-transition"
              style={{
                background: 'var(--accent-color)',
                border: '1px solid var(--accent-color)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
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
