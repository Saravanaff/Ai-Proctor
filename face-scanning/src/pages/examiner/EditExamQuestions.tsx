import React, { useState, useEffect } from "react";
import styles from "../../styles/CreateExamPage.module.css";
import { useRouter } from "next/router";
import MCQQuestionEditor from "../../components/exam/MCQQuestionEditor";
import MCQQuestionList from "../../components/exam/MCQQuestionList";
import PDFQuestionUploader from "../../components/exam/PDFQuestionUploader";
import { MCQQuestion } from "../../types/mcq";
import { ThemeToggle } from "../../components/ThemeToggle";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { ExaminerGuard } from "@/components/guards";

const EditExamQuestions = () => {
  const router = useRouter();
  const { examId, examName } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [showPDFUploader, setShowPDFUploader] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<
    MCQQuestion | undefined
  >(undefined);

  // Set up axios interceptor for authentication
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const token = getTokenFromCookie();
        if (token) {
          config.headers = config.headers || {};
          config.headers["Authorization"] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  // Fetch existing questions when component mounts
  useEffect(() => {
    if (!examId) return;

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const response = await axios.get(`${base}/getExamQuestions/${examId}`);

        if (response.data?.success && response.data?.questions) {
          // Convert backend format to frontend MCQQuestion format
          const convertedQuestions: MCQQuestion[] = response.data.questions.map(
            (q: any, index: number) => ({
              id: q.id?.toString() || `q-${index}`,
              question: q.question_text,
              options:
                q.QuestionOptions?.map((opt: any, optIndex: number) => ({
                  id: opt.id?.toString() || `opt-${index}-${optIndex}`,
                  text: opt.option_text,
                })) || [],
              correctOptionId:
                q.QuestionOptions?.find(
                  (opt: any) => opt.is_correct
                )?.id?.toString() ||
                q.QuestionOptions?.[0]?.id?.toString() ||
                "",
            })
          );
          setMcqQuestions(convertedQuestions);
        }
        setExamTitle((examName as string) || "");
      } catch (error: any) {
        console.error("Error fetching questions:", error);
        alert(
          error?.response?.data?.message ||
            "Failed to load questions. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [examId, examName]);

  const handleAddQuestion = (question: MCQQuestion) => {
    if (editingQuestion) {
      setMcqQuestions((prev) =>
        prev.map((q) => (q.id === question.id ? question : q))
      );
      setEditingQuestion(undefined);
    } else {
      setMcqQuestions((prev) => [...prev, question]);
    }
    setShowQuestionEditor(false);
  };

  const handleEditQuestion = (question: MCQQuestion) => {
    setEditingQuestion(question);
    setShowQuestionEditor(true);
  };

  const handleDeleteQuestion = (id: string) => {
    setMcqQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleCancelQuestionEditor = () => {
    setShowQuestionEditor(false);
    setEditingQuestion(undefined);
  };

  const handlePDFQuestionsExtracted = (questions: MCQQuestion[]) => {
    setMcqQuestions((prev) => [...prev, ...questions]);
    setShowPDFUploader(false);
  };

  const handleCancelPDFUploader = () => {
    setShowPDFUploader(false);
  };

  const handleSaveQuestions = async () => {
    if (!examId) {
      alert("Exam ID is missing");
      return;
    }

    if (mcqQuestions.length === 0) {
      alert("Please add at least one question before saving");
      return;
    }

    try {
      setSaving(true);

      // Convert frontend format to backend format
      const questionsPayload = mcqQuestions.map((q) => {
        const correctIndex = q.options.findIndex(
          (opt) => opt.id === q.correctOptionId
        );

        return {
          question_text: q.question,
          answer: correctIndex.toString(),
          marks: 1,
          options: q.options.map((opt, idx) => ({
            option_text: opt.text,
            is_correct: opt.id === q.correctOptionId,
          })),
        };
      });

      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.put(
        `${base}/updateExamQuestions/${examId}`,
        {
          questions: questionsPayload,
        }
      );

      if (response.data?.success) {
        alert(
          `Successfully updated ${mcqQuestions.length} questions for the exam!`
        );
        router.push("/examiner/CreateExamPage");
      } else {
        alert("Failed to update questions. Please try again.");
      }
    } catch (error: any) {
      console.error("Error updating questions:", error);
      alert(
        error?.response?.data?.message ||
          "Failed to update questions. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (
      mcqQuestions.length > 0 &&
      !confirm("Are you sure you want to cancel? Unsaved changes will be lost.")
    ) {
      return;
    }
    router.push("/examiner/CreateExamPage");
  };

  if (loading) {
    return (
      <div
        className={`${styles.examinerContainer} ${styles.enterpriseRoot} theme-transition`}
        style={{
          background:
            "var(--app-bg, var(--background, var(--body-bg, #0f1115)))",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--text-primary)" }}>
          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
              animation: "spin 1s linear infinite",
            }}
          >
            ⏳
          </div>
          <p>Loading questions...</p>
        </div>
      </div>
    );
  };

  return (
    <ExaminerGuard>
    <div
      className={`${styles.examinerContainer} ${styles.enterpriseRoot} theme-transition`}
      style={{
        background: "var(--app-bg, var(--background, var(--body-bg, #0f1115)))",
        minHeight: "100vh",
        color: "var(--text-primary)",
      }}
    >
      <header className={`${styles.header} ${styles.fadeIn} theme-transition`}>
        <div className={styles.headerContent}>
          <h1
            className={`${styles.title} theme-transition`}
            style={{ color: "var(--text-primary)" }}
          >
            Edit Questions - {examTitle}
          </h1>
          <p
            className={`${styles.subtitle} theme-transition`}
            style={{ color: "var(--text-secondary)" }}
          >
            Update the questions for this exam
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={handleCancel}
            className={`${styles.btn} ${styles.btnSecondary} theme-transition`}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveQuestions}
            className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
            disabled={saving || mcqQuestions.length === 0}
            style={{ marginLeft: "8px" }}
          >
            {saving ? "Saving..." : "Save Questions"}
          </button>
        </div>
      </header>

      <section
        className={`${styles.examsSection} ${styles.fadeIn} theme-transition`}
        style={{
          background: "transparent",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          className={`${styles.glassPanel} theme-transition`}
          style={{
            padding: "24px",
            borderRadius: "12px",
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2
              className="theme-transition"
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Questions ({mcqQuestions.length})
            </h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowPDFUploader(true)}
                className={`${styles.btn} ${styles.btnSecondary} theme-transition`}
                style={{ fontSize: "14px", padding: "8px 16px" }}
              >
                📄 Upload PDF
              </button>
              <button
                onClick={() => {
                  setEditingQuestion(undefined);
                  setShowQuestionEditor(true);
                }}
                className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
                style={{ fontSize: "14px", padding: "8px 16px" }}
              >
                ➕ Add Question
              </button>
            </div>
          </div>

          {mcqQuestions.length === 0 ? (
            <div
              className="theme-transition"
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📝</div>
              <h3
                className="theme-transition"
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                }}
              >
                No questions yet
              </h3>
              <p style={{ fontSize: "14px", marginBottom: "24px" }}>
                Add questions manually or upload a PDF to get started
              </p>
            </div>
          ) : (
            <MCQQuestionList
              questions={mcqQuestions}
              onEdit={handleEditQuestion}
              onDelete={handleDeleteQuestion}
            />
          )}
        </div>
      </section>

      {/* Question Editor Modal */}
      {showQuestionEditor && (
        <MCQQuestionEditor
          initialQuestion={editingQuestion}
          onSave={handleAddQuestion}
          onCancel={handleCancelQuestionEditor}
        />
      )}

      {/* PDF Uploader Modal */}
      {showPDFUploader && (
        <PDFQuestionUploader
          onQuestionsExtracted={handlePDFQuestionsExtracted}
          onClose={handleCancelPDFUploader}
        />
      )}

      {/* Floating Theme Toggle */}
      <div
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 1200,
        }}
      >
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            padding: 8,
            boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
          }}
          className="theme-transition"
        >
          <ThemeToggle />
        </div>
      </div>
    </div>
    </ExaminerGuard>
  );
};

export default EditExamQuestions;
