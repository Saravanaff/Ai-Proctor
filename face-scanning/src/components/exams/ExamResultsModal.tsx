import React, { useState, useEffect, useMemo } from "react";
import styles from "../../styles/ExamResultsModal.module.css";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";

interface Student {
  user_id: number;
  name: string;
  email: string;
  total_answered: number;
  total_questions?: number;
  correct_answers: number;
  obtained_score?: number;
  max_score?: number;
  score_percentage: string;
}

interface QuestionDetail {
  id: number;
  question_text: string;
  marks: number;
  QuestionOptions: {
    id: number;
    option_text: string;
    is_correct: boolean;
  }[];
}

interface UserAnswer {
  question_id: number;
  option_id: number | null;
  written_answer: string | null;
}

interface StudentDetail {
  answers: {
    question: QuestionDetail;
    userAnswer: UserAnswer | null;
    selectedOption: any;
    correctOption: any;
    isCorrect: boolean;
  }[];
  stats: {
    totalQuestions: number;
    answered: number;
    correct: number;
    wrong: number;
    unanswered: number;
    score: string;
    obtainedScore?: number;
    maxScore?: number;
  };
}

interface ExamResultsModalProps {
  examId: number;
  examName: string;
  onClose: () => void;
}

const ExamResultsModal: React.FC<ExamResultsModalProps> = ({
  examId,
  examName,
  onClose,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch exam results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const token = getTokenFromCookie();
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await axios.get(`${base}/exam/${examId}/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success && res.data?.results) {
          setStudents(res.data.results);
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [examId]);

  // Fetch student detailed answers
  const fetchStudentDetails = async (student: Student) => {
    try {
      setDetailLoading(true);
      setSelectedStudent(student);
      setError(null); // Clear previous errors
      const token = getTokenFromCookie();
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;

      // Fetch questions
      const questionsRes = await axios.get(
        `${base}/getExamQuestions/${examId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Fetch user answers using the new endpoint for examiners
      const answersRes = await axios.get(
        `${base}/exam/${examId}/student/${student.user_id}/answers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📋 Questions response:", questionsRes.data);
      console.log("📝 Answers response:", answersRes.data);

      const questions: QuestionDetail[] = questionsRes.data.questions || [];
      const userAnswers: UserAnswer[] = answersRes.data.data?.answers || [];

      console.log(
        `✅ Loaded ${questions.length} questions, ${userAnswers.length} answers`
      );

      // Map questions with user answers
      const detailedAnswers = questions.map((question) => {
        // Ensure QuestionOptions exists and is an array
        const options = Array.isArray(question.QuestionOptions)
          ? question.QuestionOptions
          : [];

        const userAnswer = userAnswers.find(
          (ans) => ans.question_id === question.id
        );

        const selectedOption = userAnswer
          ? options.find((opt) => opt.id === userAnswer.option_id)
          : null;

        const correctOption = options.find((opt) => opt.is_correct);

        const isCorrect = selectedOption?.is_correct || false;

        return {
          question: {
            ...question,
            QuestionOptions: options, // Ensure it's always an array
          },
          userAnswer: userAnswer || null,
          selectedOption,
          correctOption,
          isCorrect,
        };
      });

      const stats = {
        totalQuestions: questions.length,
        answered: userAnswers.length,
        correct: detailedAnswers.filter((a) => a.isCorrect).length,
        wrong: detailedAnswers.filter((a) => a.userAnswer && !a.isCorrect)
          .length,
        unanswered: questions.length - userAnswers.length,
        score: student.score_percentage,
        obtainedScore: detailedAnswers.reduce(
          (acc, a) => acc + (a.isCorrect ? a.question.marks || 1 : 0),
          0
        ),
        maxScore: detailedAnswers.reduce(
          (acc, a) => acc + (a.question.marks || 1),
          0
        ),
      };

      setStudentDetail({
        answers: detailedAnswers,
        stats,
      });

      console.log("✅ Student details loaded successfully");
    } catch (err: any) {
      console.error("❌ Error fetching student details:", err);
      console.error("Error details:", {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
      });

      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load student details";

      setError(errorMessage);
      setStudentDetail(null); // Clear any partial data
    } finally {
      setDetailLoading(false);
    }
  };

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContent} theme-transition`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Exam Results Dashboard</h2>
            <p className={styles.examName}>{examName}</p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Left panel: Student list */}
          <div className={styles.studentListPanel}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${styles.searchInput} theme-transition`}
              />
            </div>

            {loading ? (
              <div className={styles.loadingState}>Loading students...</div>
            ) : error ? (
              <div className={styles.errorState}>{error}</div>
            ) : filteredStudents.length === 0 ? (
              <div className={styles.emptyState}>
                {searchTerm ? "No students found" : "No students attended"}
              </div>
            ) : (
              <div className={styles.studentList}>
                {filteredStudents.map((student) => (
                  <div
                    key={student.user_id}
                    className={`${styles.studentCard} ${
                      selectedStudent?.user_id === student.user_id
                        ? styles.selected
                        : ""
                    } theme-transition`}
                    onClick={() => fetchStudentDetails(student)}
                  >
                    <div className={styles.studentInfo}>
                      <div className={styles.studentAvatar}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.studentDetails}>
                        <h4 className={styles.studentName}>{student.name}</h4>
                        <p className={styles.studentEmail}>{student.email}</p>
                      </div>
                    </div>
                    <div className={styles.studentScore}>
                      <div
                        className={`${styles.scoreCircle} ${
                          parseFloat(student.score_percentage) >= 70
                            ? styles.scoreHigh
                            : parseFloat(student.score_percentage) >= 50
                            ? styles.scoreMedium
                            : styles.scoreLow
                        }`}
                      >
                        {student.score_percentage}%
                      </div>
                      <div className={styles.scoreDetails}>
                        {student.obtained_score !== undefined
                          ? `${student.obtained_score}/${student.max_score}`
                          : `${student.correct_answers}/${student.total_answered}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: Student details */}
          <div className={styles.detailPanel}>
            {!selectedStudent ? (
              <div className={styles.noSelectionState}>
                <div className={styles.noSelectionIcon}>📊</div>
                <p>Select a student to view detailed results</p>
              </div>
            ) : detailLoading ? (
              <div className={styles.loadingState}>Loading details...</div>
            ) : studentDetail ? (
              <div className={styles.detailContent}>
                {/* Stats summary */}
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Score</div>
                    <div className={`${styles.statValue} ${styles.scoreHigh}`}>
                      {studentDetail.stats.obtainedScore !== undefined
                        ? `${studentDetail.stats.obtainedScore}/${studentDetail.stats.maxScore}`
                        : studentDetail.stats.score + "%"}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Questions</div>
                    <div className={styles.statValue}>
                      {studentDetail.stats.totalQuestions}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Correct</div>
                    <div className={`${styles.statValue} ${styles.correct}`}>
                      {studentDetail.stats.correct}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Wrong</div>
                    <div className={`${styles.statValue} ${styles.wrong}`}>
                      {studentDetail.stats.wrong}
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Unanswered</div>
                    <div className={`${styles.statValue} ${styles.unanswered}`}>
                      {studentDetail.stats.unanswered}
                    </div>
                  </div>
                </div>

                {/* Questions list */}
                <div className={styles.questionsContainer}>
                  <h3 className={styles.questionsTitle}>Question Details</h3>
                  {studentDetail.answers.map((item, index) => (
                    <div
                      key={item.question.id}
                      className={`${styles.questionCard} ${
                        item.isCorrect
                          ? styles.correctAnswer
                          : item.userAnswer
                          ? styles.wrongAnswer
                          : styles.notAnswered
                      } theme-transition`}
                    >
                      <div className={styles.questionHeader}>
                        <span className={styles.questionNumber}>
                          Q{index + 1}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            marginLeft: "8px",
                          }}
                        >
                          ({item.question.marks || 1} marks)
                        </span>
                        <span
                          className={`${styles.questionStatus} ${
                            item.isCorrect
                              ? styles.statusCorrect
                              : item.userAnswer
                              ? styles.statusWrong
                              : styles.statusUnanswered
                          }`}
                        >
                          {item.isCorrect
                            ? "✓ Correct"
                            : item.userAnswer
                            ? "✗ Wrong"
                            : "— Not Answered"}
                        </span>
                      </div>

                      <div className={styles.questionText}>
                        {item.question.question_text}
                      </div>

                      <div className={styles.optionsList}>
                        {Array.isArray(item.question.QuestionOptions) &&
                          item.question.QuestionOptions.map((option) => (
                            <div
                              key={option.id}
                              className={`${styles.optionItem} ${
                                option.is_correct
                                  ? styles.correctOption
                                  : option.id === item.userAnswer?.option_id
                                  ? styles.selectedOption
                                  : ""
                              }`}
                            >
                              <span className={styles.optionText}>
                                {option.option_text}
                              </span>
                              {option.is_correct && (
                                <span className={styles.correctBadge}>
                                  ✓ Correct Answer
                                </span>
                              )}
                              {!option.is_correct &&
                                option.id === item.userAnswer?.option_id && (
                                  <span className={styles.selectedBadge}>
                                    Your Answer
                                  </span>
                                )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamResultsModal;
