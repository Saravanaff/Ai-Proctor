"use client";

import React, { useState, useEffect } from "react";
import styles from "../../styles/EditExamQuestions.module.css"; // UPDATED IMPORT
import { useRouter } from "next/router";
import MCQQuestionEditor from "../../components/exam/MCQQuestionEditor";
// Note: Assuming MCQQuestionList is not used in the final render based on the original code (it used QuestionTableEditor)
import QuestionTableEditor from "../../components/exam/QuestionTableEditor";
import PDFQuestionUploader from "../../components/exam/PDFQuestionUploader";
import { MCQQuestion } from "../../types/mcq";
import axios from "axios";
import * as XLSX from 'xlsx';
import { downloadQuestionsTemplate } from "@/utils/excelUtils";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { ExaminerGuard } from "@/components/guards";
import { 
  Plus, 
  FileText, 
  Upload, 
  Download, 
  FolderOpen, 
  PenLine, 
  Trash2, 
  X, 
  FileSpreadsheet, 
  AlertTriangle,
  ChevronLeft
} from "lucide-react";

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

  // Removed the manual body style manipulation useEffect as we now use a wrapper class

  // Fetch existing questions when component mounts
  useEffect(() => {
    if (!examId) return;

    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const response = await axios.get(`${base}/getExamQuestions/${examId}`);

        if (response.data?.success && response.data?.questions) {
          const convertedQuestions: MCQQuestion[] = response.data.questions.map(
            (q: any, index: number) => {
              const backendOptions = q.options || q.QuestionOptions || [];
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

  // Loading State
  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
          <p>Loading questions for {examName}...</p>
        </div>
      </div>
    );
  }

  return (
    <ExaminerGuard>
      <div className={styles.pageWrapper}>
        <div className={styles.mainLayout}> 
          
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  onClick={handleCancel}
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: 'var(--text-tertiary)', display: 'flex' 
                  }}
                >
                  <ChevronLeft />
                </button>
                <div>
                  <h1>Edit Questions</h1>
                  <p>{examTitle || "Update exam questions"}</p>
                </div>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button
                onClick={handleCancel}
                className={`${styles.btn} ${styles.btnSecondary}`}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuestions}
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={saving || mcqQuestions.length === 0}
              >
                {saving ? "Saving..." : "Save Questions"}
              </button>
            </div>
          </header>

          {/* Main Content Card */}
          <main className={styles.contentCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitleGroup}>
                <div className={styles.iconBox}>
                  <FileText size={24} />
                </div>
                <div className={styles.cardTitle}>
                  <h2>Questions</h2>
                  <span>{mcqQuestions.length} added</span>
                </div>
              </div>

              {/* Toolbar Actions */}
              <div className={styles.headerActions}>
                {mcqQuestions.length > 0 && (
                  <button
                    onClick={handleDeleteAllQuestions}
                    className={`${styles.btn} ${styles.btnDanger}`}
                  >
                    <Trash2 size={16} /> Delete All
                  </button>
                )}
                <button
                  onClick={() => setShowAddOptionsPopup(true)}
                  className={`${styles.btn} ${styles.btnPrimary}`}
                >
                  <Plus size={18} /> Add Questions
                </button>
              </div>
            </div>

            <div className={styles.cardBody}>
              {mcqQuestions.length === 0 ? (
                // Empty State
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <FileSpreadsheet size={32} />
                  </div>
                  <h3 className={styles.emptyStateTitle}>No questions yet</h3>
                  <p className={styles.emptyStateText}>
                    Get started by uploading an Excel file, a PDF, or manually adding questions to this exam.
                  </p>
                  <div className={styles.emptyStateActions}>
                    <button
                      onClick={() => setShowUploadPopup(true)}
                      className={`${styles.btn} ${styles.btnPrimary}`}
                    >
                      <Upload size={18} /> Upload Excel
                    </button>
                    <button
                      onClick={() => setShowPDFUploader(true)}
                      className={`${styles.btn} ${styles.btnSecondary}`}
                    >
                      <FileText size={18} /> Upload PDF
                    </button>
                    <button
                      onClick={() => {
                        setEditingQuestion(undefined);
                        setShowQuestionEditor(true);
                      }}
                      className={`${styles.btn} ${styles.btnSecondary}`}
                    >
                      <PenLine size={18} /> Add Manually
                    </button>
                  </div>
                </div>
              ) : (
                // Question Table
                <QuestionTableEditor
                  questions={mcqQuestions}
                  onUpdate={(updatedQuestions) => setMcqQuestions(updatedQuestions)}
                  onDelete={handleDeleteQuestion}
                />
              )}
            </div>
          </main>
        </div>

        {/* --- Modals --- */}

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

        {/* Upload Excel Popup */}
        {showUploadPopup && (
          <div className={styles.modalOverlay} onClick={() => setShowUploadPopup(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className={styles.iconBox} style={{ width: 36, height: 36, borderRadius: '8px' }}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <h3 className={styles.modalTitle}>Upload Excel/CSV</h3>
                </div>
                <button
                  onClick={() => setShowUploadPopup(false)}
                  className={styles.modalClose}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  style={{ width: '100%', marginBottom: '1.5rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                >
                  <Download size={18} /> Download Sample Template
                </button>

                {uploadError && (
                  <div style={{
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--danger-light)',
                    color: 'var(--danger)',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <AlertTriangle size={16} /> {uploadError}
                  </div>
                )}

                <div
                  className={styles.uploadArea}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.backgroundColor = "var(--primary-light)";
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.backgroundColor = "var(--bg-page)";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.backgroundColor = "var(--bg-page)";
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
                    <FolderOpen size={48} color="var(--primary)" strokeWidth={1.5} style={{ marginBottom: "1rem" }} />
                    <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "var(--text-main)" }}>
                      Click to upload or drag and drop
                    </p>
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
                      Excel (.xlsx, .xls) or CSV files
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Options Popup */}
        {showAddOptionsPopup && (
          <div className={styles.modalOverlay} onClick={() => setShowAddOptionsPopup(false)}>
            <div className={styles.modalContent} style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Add Questions</h3>
                <button
                  onClick={() => setShowAddOptionsPopup(false)}
                  className={styles.modalClose}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.optionMenu}>
                  {/* Option 1: Excel */}
                  <button
                    className={styles.optionItem}
                    onClick={() => {
                      setShowAddOptionsPopup(false);
                      setShowUploadPopup(true);
                    }}
                  >
                    <div className={styles.optionIcon} style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                      <Upload size={20} />
                    </div>
                    <div className={styles.optionText}>
                      <h4>Upload Excel/CSV</h4>
                      <p>Import multiple questions from a spreadsheet</p>
                    </div>
                  </button>

                  {/* Option 2: PDF */}
                  <button
                    className={styles.optionItem}
                    onClick={() => {
                      setShowAddOptionsPopup(false);
                      setShowPDFUploader(true);
                    }}
                  >
                    <div className={styles.optionIcon} style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                      <FileText size={20} />
                    </div>
                    <div className={styles.optionText}>
                      <h4>Upload PDF</h4>
                      <p>Extract questions automatically from a PDF document</p>
                    </div>
                  </button>

                  {/* Option 3: Manual */}
                  <button
                    className={styles.optionItem}
                    onClick={() => {
                      setShowAddOptionsPopup(false);
                      setEditingQuestion(undefined);
                      setShowQuestionEditor(true);
                    }}
                  >
                    <div className={styles.optionIcon} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                      <PenLine size={20} />
                    </div>
                    <div className={styles.optionText}>
                      <h4>Add Manually</h4>
                      <p>Create questions one by one using the editor</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ExaminerGuard>
  );
};

export default EditExamQuestions;