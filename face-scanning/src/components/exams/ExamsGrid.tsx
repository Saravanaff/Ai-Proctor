import React, { useState } from "react";
import { useRouter } from "next/router";
import { Exam } from "../../types/exam";
import ExamCard from "./ExamCard";
import styles from "./ExamsGrid.module.css";

interface ExamsGridProps {
  exams: Exam[];
  formatRange: (start?: string, end?: string) => string;
}

const ExamsGrid: React.FC<ExamsGridProps> = ({ exams, formatRange }) => {
  const router = useRouter();
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const handleViewDetails = (exam: any) => {
    // Navigate to exam details page with exam ID as query parameter
    router.push(`/examiner/exam-details?examId=${exam.id}`);
  };

  const handleEdit = (exam: any) => {
    // Navigate to edit questions page with exam ID and name
    router.push(
      `/examiner/EditExamQuestions?examId=${
        exam.id
      }&examName=${encodeURIComponent(exam.exam_name || exam.name || "Exam")}`
    );
  };

  const handleManageModal = (exam: any) => {
    // Show modal for quick overview (existing functionality)
    setSelectedExam(exam);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedExam(null);
  };

  // Helper functions for modal
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "var(--success-color)";
      case "draft":
        return "var(--warning-color)";
      case "completed":
        return "var(--info-color)";
      case "cancelled":
        return "var(--error-color)";
      default:
        return "var(--text-secondary)";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "active":
        return "var(--success-bg)";
      case "draft":
        return "var(--warning-bg)";
      case "completed":
        return "var(--info-bg)";
      case "cancelled":
        return "var(--error-bg)";
      default:
        return "var(--card-bg)";
    }
  };

  return (
    <>
      <div className={styles.examsGrid}>
        {exams.map((exam) => (
          <ExamCard
            key={exam.id}
            exam={exam}
            formatRange={formatRange}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onManage={handleManageModal}
          />
        ))}
      </div>

      {/* Enhanced Modal for exam details */}
      {showModal && selectedExam && (
        <div className={styles.modal} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {(selectedExam as any).exam_name ||
                  selectedExam.name ||
                  "Exam Details"}
              </h2>
              <button
                className={styles.modalCloseButton}
                onClick={closeModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalDetail}>
                <span className={styles.modalDetailLabel}>Status:</span>
                <span
                  className={styles.statusBadge}
                  style={{
                    color: getStatusColor(selectedExam.status),
                    backgroundColor: getStatusBg(selectedExam.status),
                    borderColor: getStatusColor(selectedExam.status),
                  }}
                >
                  {selectedExam.status}
                </span>
              </div>

              <div className={styles.modalDetail}>
                <span className={styles.modalDetailLabel}>Exam Key:</span>
                <span className={styles.modalDetailValue}>
                  {(selectedExam as any).exam_key ||
                    (selectedExam as any).key ||
                    "N/A"}
                </span>
              </div>

              <div className={styles.modalDetail}>
                <span className={styles.modalDetailLabel}>Participants:</span>
                <span className={styles.modalDetailValue}>
                  {(selectedExam as any).participants ||
                    ((selectedExam as any).attendances
                      ? (selectedExam as any).attendances.length
                      : 0)}
                </span>
              </div>

              <div className={styles.modalDetail}>
                <span className={styles.modalDetailLabel}>Exam ID:</span>
                <span className={styles.modalDetailValue}>
                  {selectedExam.id}
                </span>
              </div>

              {(selectedExam as any).attendances &&
                (selectedExam as any).attendances.length > 0 && (
                  <div className={styles.participantsList}>
                    <h3 className={styles.participantsListTitle}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      Enrolled Students
                    </h3>
                    {(selectedExam as any).attendances.map(
                      (attendance: any, idx: number) => (
                        <div key={idx} className={styles.participantItem}>
                          {attendance.user?.name ||
                            attendance.student_name ||
                            `Student ${idx + 1}`}
                        </div>
                      )
                    )}
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
