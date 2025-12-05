"use client";

import React, { useState, useEffect } from "react";
import styles from "../../styles/CreateExamPage.module.css";
import { useRouter } from "next/router";
import MCQQuestionEditor from "../../components/exam/MCQQuestionEditor";
import MCQQuestionList from "../../components/exam/MCQQuestionList";
import QuestionTableEditor from "../../components/exam/QuestionTableEditor";
import PDFQuestionUploader from "../../components/exam/PDFQuestionUploader";
import { MCQQuestion } from "../../types/mcq";
import { ThemeToggle } from "../../components/ThemeToggle";
import axios from "axios";
import * as XLSX from 'xlsx';
import { downloadQuestionsTemplate } from "@/utils/excelUtils";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { ExaminerGuard } from "@/components/guards";
import { Plus, FileText, Upload, Download, FolderOpen, PenLine, Trash2, X, FileSpreadsheet, AlertTriangle } from "lucide-react";

const EditExamQuestions = () => {
  const router = useRouter();
  const { examId, examName } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [showPDFUploader, setShowPDFUploader] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showAddOptionsPopup, setShowAddOptionsPopup] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [editingQuestion, setEditingQuestion] = useState<
    MCQQuestion | undefined
  >(undefined);

  // Set up axios interceptor for authentication
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const token = getTokenFromCookie();
        if (token) {
          // Ensure headers exists and use a safe cast so TypeScript accepts setting the Authorization header
          if (!config.headers) {
            config.headers = {} as any;
          }
          (config.headers as any)["Authorization"] = `Bearer ${token}`;
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
          // Log raw backend data for debugging
          console.log('Backend Questions:', JSON.stringify(response.data.questions, null, 2));
          
          // Convert backend format to frontend MCQQuestion format
          const convertedQuestions: MCQQuestion[] = response.data.questions.map(
            (q: any, index: number) => {
              // Get existing options or create empty array
              // Backend sends "options" not "QuestionOptions"
              const backendOptions = q.options || q.QuestionOptions || [];
              
              console.log(`Question ${index + 1} backend options:`, backendOptions);
              
              // Ensure we always have exactly 4 options
              const options = [];
              for (let i = 0; i < 4; i++) {
                if (backendOptions[i]) {
                  options.push({
                    id: backendOptions[i].id?.toString() || `opt-${index}-${i}`,
                    text: backendOptions[i].option_text || '',
                  });
                } else {
                  options.push({
                    id: `opt-${Date.now()}-${index}-${i}`,
                    text: '',
                  });
                }
              }
              
              console.log(`Question ${index + 1} converted options:`, options);
              
              // Find correct option ID
              const correctOption = backendOptions.find((opt: any) => opt.is_correct);
              const correctOptionId = correctOption?.id?.toString() || options[0]?.id || '';
              
              return {
                id: q.id?.toString() || `q-${index}`,
                question: q.question_text || '',
                options,
                correctOptionId,
                marks: q.marks || 1,
              };
            }
          );
          
          console.log('Final converted questions:', JSON.stringify(convertedQuestions, null, 2));
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

  const handleDeleteAllQuestions = () => {
    if (window.confirm(`Are you sure you want to delete all ${mcqQuestions.length} questions? This action cannot be undone.`)) {
      setMcqQuestions([]);
      setShowAddOptionsPopup(false);
    }
  };

  const handleCancelQuestionEditor = () => {
    setShowQuestionEditor(false);
    setEditingQuestion(undefined);
  };

  const downloadSampleTemplate = () => {
    downloadQuestionsTemplate();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      setUploadError('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setUploadError('No data found in the file');
          event.target.value = '';
          return;
        }

        const extractedQuestions: MCQQuestion[] = [];
        const errors: string[] = [];

        jsonData.forEach((row: any, index: number) => {
          const question = row['Question'] || row['question'];
          const option1 = row['Option 1'] || row['option1'] || row['Option1'];
          const option2 = row['Option 2'] || row['option2'] || row['Option2'];
          const option3 = row['Option 3'] || row['option3'] || row['Option3'];
          const option4 = row['Option 4'] || row['option4'] || row['Option4'];
          const correctAnswer = row['Correct Answer'] || row['correct_answer'] || row['CorrectAnswer'] || row['Answer'] || row['answer'];
          const marks = row['Marks'] || row['marks'] || 1;

          if (!question || !option1 || !option2) {
            errors.push(`Row ${index + 2}: Missing required fields (Question, Option 1, Option 2)`);
            return;
          }

          const options = [
            { id: `opt-${Date.now()}-${index}-1`, text: option1.toString() },
            { id: `opt-${Date.now()}-${index}-2`, text: option2.toString() },
          ];

          if (option3) options.push({ id: `opt-${Date.now()}-${index}-3`, text: option3.toString() });
          if (option4) options.push({ id: `opt-${Date.now()}-${index}-4`, text: option4.toString() });

          let correctOptionId = options[0].id;
          if (correctAnswer) {
            const answerStr = correctAnswer.toString().toUpperCase().trim();
            if (answerStr === 'A' || answerStr === '1') correctOptionId = options[0].id;
            else if (answerStr === 'B' || answerStr === '2') correctOptionId = options[1]?.id || options[0].id;
            else if (answerStr === 'C' || answerStr === '3') correctOptionId = options[2]?.id || options[0].id;
            else if (answerStr === 'D' || answerStr === '4') correctOptionId = options[3]?.id || options[0].id;
          }

          extractedQuestions.push({
            id: `q-${Date.now()}-${index}`,
            question: question.toString(),
            options,
            correctOptionId,
            marks: parseInt(marks) || 1,
          });
        });

        if (extractedQuestions.length > 0) {
          setMcqQuestions(prev => [...prev, ...extractedQuestions]);
          setShowUploadPopup(false);
          setUploadError('');
        } else if (errors.length > 0) {
          setUploadError(`Failed to parse questions:\n${errors.slice(0, 3).join('\n')}`);
        }

        event.target.value = '';
      } catch (error) {
        console.error('Error parsing file:', error);
        setUploadError('Failed to parse file. Please check the format.');
        event.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
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
          width: "100%",
          maxWidth: "100%",
          margin: "0",
          padding: "28px 60px",
        }}
      >
        <div
          className={`${styles.glassPanel} theme-transition`}
          style={{
            padding: "40px",
            borderRadius: "16px",
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            minHeight: "calc(100vh - 180px)",
            display: "flex",
            flexDirection: "column",
            width:"100%",
            maxWidth: "100%"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "28px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ 
                width: "52px", 
                height: "52px", 
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <FileText size={28} color="#0ea5e9" />
              </div>
              <div>
                <h2
                  className="theme-transition"
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  Questions ({mcqQuestions.length})
                </h2>
                <span style={{ fontSize: "15px", color: "var(--text-secondary)" }}>
                  Click cells to edit directly
                </span>
              </div>
            </div>
            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              {mcqQuestions.length > 0 && (
                <button
                  onClick={handleDeleteAllQuestions}
                  className={`${styles.btn} theme-transition`}
                  style={{ 
                    fontSize: "15px", 
                    padding: "12px 24px", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "10px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#ef4444",
                  }}
                >
                  <Trash2 size={18} /> Delete All
                </button>
              )}
              <button
                onClick={() => setShowAddOptionsPopup(true)}
                className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
                style={{ fontSize: "15px", padding: "12px 24px", display: "flex", alignItems: "center", gap: "10px" }}
              >
                <Plus size={18} /> Add More Questions
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {mcqQuestions.length === 0 ? (
              <div
                className="theme-transition"
                style={{
                  textAlign: "center",
                  padding: "80px 40px",
                  color: "var(--text-secondary)",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--secondary-bg)",
                  borderRadius: "16px",
                  border: "2px dashed var(--border-color)",
                }}
              >
                <FileSpreadsheet size={64} color="var(--text-tertiary)" strokeWidth={1.5} style={{ marginBottom: "24px" }} />
                <h3
                  className="theme-transition"
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: "12px",
                  }}
                >
                  No questions yet
                </h3>
                <p style={{ fontSize: "16px", marginBottom: "32px", maxWidth: "400px" }}>
                  Upload an Excel/CSV file, PDF, or add questions manually to get started
                </p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowUploadPopup(true)}
                    className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 28px", fontSize: "15px" }}
                  >
                    <Upload size={20} /> Upload Excel/CSV
                  </button>
                  <button
                    onClick={() => setShowPDFUploader(true)}
                    className={`${styles.btn} ${styles.btnSecondary} theme-transition`}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 28px", fontSize: "15px" }}
                  >
                    📄 Upload PDF
                  </button>
                  <button
                    onClick={() => {
                      setEditingQuestion(undefined);
                      setShowQuestionEditor(true);
                    }}
                    className={`${styles.btn} ${styles.btnSecondary} theme-transition`}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 28px", fontSize: "15px" }}
                  >
                    <PenLine size={20} /> Add Manually
                  </button>
                </div>
              </div>
            ) : (
              <QuestionTableEditor
                questions={mcqQuestions}
                onUpdate={(updatedQuestions) => setMcqQuestions(updatedQuestions)}
                onDelete={handleDeleteQuestion}
              />
            )}
          </div>
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

      {/* Upload Excel Popup Modal */}
      {showUploadPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setShowUploadPopup(false);
            setUploadError('');
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card-bg)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "900px",
              width: "90%",
              maxHeight: "85vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ 
                  width: "44px", 
                  height: "44px", 
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <FileSpreadsheet size={24} color="#0ea5e9" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--text-primary)" }}>Upload Questions</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>Excel or CSV file</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUploadPopup(false);
                  setUploadError('');
                }}
                style={{
                  background: "var(--secondary-bg)",
                  border: "none",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Download Template */}
            <button
              type="button"
              onClick={downloadSampleTemplate}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: "10px",
                border: "1px solid var(--accent-color)",
                background: "rgba(14, 165, 233, 0.1)",
                color: "var(--accent-color)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <Download size={18} /> Download Sample Template
            </button>

            {uploadError && (
              <div
                style={{
                  padding: "14px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "10px",
                  color: "#ef4444",
                  fontSize: "13px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AlertTriangle size={18} /> {uploadError}
              </div>
            )}

            {/* File Drop Zone */}
            <div
              style={{
                border: "2px dashed var(--accent-color)",
                borderRadius: "12px",
                padding: "40px",
                textAlign: "center",
                background: "var(--secondary-bg)",
                cursor: "pointer",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = "rgba(14, 165, 233, 0.1)";
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.background = "var(--secondary-bg)";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = "var(--secondary-bg)";
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  const input = document.getElementById('popup-file-upload') as HTMLInputElement;
                  if (input) {
                    input.files = files;
                    handleFileUpload({ target: input } as any);
                  }
                }
              }}
            >
              <input
                id="popup-file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <label htmlFor="popup-file-upload" style={{ cursor: "pointer", display: "block" }}>
                <FolderOpen size={52} color="var(--accent-color)" strokeWidth={1.5} style={{ marginBottom: "16px" }} />
                <p style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Click to upload or drag and drop
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)" }}>
                  Excel (.xlsx, .xls) or CSV files
                </p>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Add Options Popup Modal */}
      {showAddOptionsPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddOptionsPopup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--card-bg)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "520px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>Add Questions</h3>
              <button
                onClick={() => setShowAddOptionsPopup(false)}
                style={{
                  background: "var(--secondary-bg)",
                  border: "none",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Upload Excel Option */}
              <button
                onClick={() => {
                  setShowAddOptionsPopup(false);
                  setShowUploadPopup(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  background: "var(--secondary-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-color)";
                  e.currentTarget.style.background = "rgba(14, 165, 233, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.background = "var(--secondary-bg)";
                }}
              >
                <div style={{ 
                  width: "44px", height: "44px", borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <Upload size={22} color="#0ea5e9" />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>Upload Excel/CSV</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Import questions from spreadsheet</div>
                </div>
              </button>

              {/* Upload PDF Option */}
              <button
                onClick={() => {
                  setShowAddOptionsPopup(false);
                  setShowPDFUploader(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  background: "var(--secondary-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-color)";
                  e.currentTarget.style.background = "rgba(14, 165, 233, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.background = "var(--secondary-bg)";
                }}
              >
                <div style={{ 
                  width: "44px", height: "44px", borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.05) 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <FileText size={22} color="#a855f7" />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>Upload PDF</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Extract questions from PDF file</div>
                </div>
              </button>

              {/* Add Manually Option */}
              <button
                onClick={() => {
                  setShowAddOptionsPopup(false);
                  setEditingQuestion(undefined);
                  setShowQuestionEditor(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  background: "var(--secondary-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-color)";
                  e.currentTarget.style.background = "rgba(14, 165, 233, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.background = "var(--secondary-bg)";
                }}
              >
                <div style={{ 
                  width: "44px", height: "44px", borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <PenLine size={22} color="#22c55e" />
                </div>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>Add Manually</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Create questions one by one</div>
                </div>
              </button>
            </div>
          </div>
        </div>
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
