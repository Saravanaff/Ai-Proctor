import React, { useState, useEffect } from "react";
import styles from "../../styles/CreateExamPage.module.css";
import { useRouter } from "next/router";
import MCQQuestionEditor from "../../components/exam/MCQQuestionEditor";
import MCQQuestionList from "../../components/exam/MCQQuestionList";
import { MCQQuestion } from "../../types/mcq";
import { ThemeToggle } from "../../components/ThemeToggle";
import LatexRenderer from "../../components/exam/LatexRenderer";
import { ExaminerGuard } from "@/components/guards";
import * as XLSX from 'xlsx';
import { AlertTriangle, PenLine, Monitor, HelpCircle, Bot, Video, FileSpreadsheet } from "lucide-react";

const NewExam = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1); // 1: Name & Questions, 2: Settings
  const [examName, setExamName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("");

  // Section collapse states
  const [normalProctoringOpen, setNormalProctoringOpen] = useState(true);
  const [aiProctoringOpen, setAiProctoringOpen] = useState(true);
  const [manualProctoringOpen, setManualProctoringOpen] = useState(true);
  const [mcqSectionOpen, setMcqSectionOpen] = useState(true);

  // Proctoring feature toggles (defaults ON)
  const [thirdEye, setThirdEye] = useState(true);
  const [multiPerson, setMultiPerson] = useState(true);
  const [eyeBall, setEyeBall] = useState(true);
  const [objectDetect, setObjectDetect] = useState(true);
  const [headDirection, setHeadDirection] = useState(true);
  const [flagNotifications, setFlagNotifications] = useState(true);
  const [videoRecording, setVideoRecording] = useState(true);
  const [tabSwitchDetection, setTabSwitchDetection] = useState(true);
  const [microphoneDetection, setMicrophoneDetection] = useState(true);
  const [safeBrowser, setSafeBrowser] = useState(true);
  const [proctorFeedToTestTaker, setProctorFeedToTestTaker] = useState(true);
  const [screenSharing, setScreenSharing] = useState(true);
  const [screenCountDetection, setScreenCountDetection] = useState(false);
  const [controlDesktopApps, setControlDesktopApps] = useState(false);
  const [normalProctoring, setNormalProctoring] = useState(true);
  const [aiPoweredProctoring, setAiPoweredProctoring] = useState(true);
  const [recordedManualProctoring, setRecordedManualProctoring] =
    useState(true);
  const [faceAuthentication, setFaceAuthentication] = useState(true);

  // MCQ Questions state
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<
    MCQQuestion | undefined
  >(undefined);
  const [uploadError, setUploadError] = useState<string>("");

  // Restore data from sessionStorage when component mounts (for back navigation from preview)
  useEffect(() => {
    const storedData = sessionStorage.getItem("examPreviewData");
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setExamName(data.examName || "");
        setStartTime(data.startTime || "");
        setEndTime(data.endTime || "");
        setDuration(data.duration || "");
        setThirdEye(data.thirdEye ?? true);
        setMultiPerson(data.multiPerson ?? true);
        setEyeBall(data.eyeBall ?? true);
        setObjectDetect(data.objectDetect ?? true);
        setHeadDirection(data.headDirection ?? true);
        setFlagNotifications(data.flagNotifications ?? true);
        setVideoRecording(data.videoRecording ?? true);
        setTabSwitchDetection(data.tabSwitchDetection ?? true);
        setMicrophoneDetection(data.microphoneDetection ?? true);
        setSafeBrowser(data.safeBrowser ?? true);
        setProctorFeedToTestTaker(data.proctorFeedToTestTaker ?? true);
        setScreenSharing(data.screenSharing ?? true);
        setScreenCountDetection(data.screenCountDetection ?? false);
        setControlDesktopApps(data.controlDesktopApps ?? false);
        setNormalProctoring(data.normalProctoring ?? true);
        setAiPoweredProctoring(data.aiPoweredProctoring ?? true);
        setRecordedManualProctoring(data.recordedManualProctoring ?? true);
        setFaceAuthentication(data.faceAuthentication ?? true);
        setMcqQuestions(data.mcqQuestions || []);

        // Always start on step 1 (questions page)
        setCurrentStep(1);
      } catch (error) {
        console.error("Error restoring exam data:", error);
      }
    }
  }, []);

  // Handler for AI Proctoring toggle that controls related features
  const handleAiProctoringToggle = () => {
    const newState = !aiPoweredProctoring;
    setAiPoweredProctoring(newState);
    if (!newState) {
      setThirdEye(false);
      setMultiPerson(false);
      setEyeBall(false);
      setObjectDetect(false);
      setHeadDirection(false);
      setFaceAuthentication(false);
    } else {
      setThirdEye(true);
      setMultiPerson(true);
      setEyeBall(true);
      setObjectDetect(true);
      setHeadDirection(true);
      setFaceAuthentication(true);
    }
  };

  const handleNormalProctoringToggle = () => {
    const newState = !normalProctoring;
    setNormalProctoring(newState);
    if (!newState) {
      setControlDesktopApps(false);
      setScreenCountDetection(false);
      setSafeBrowser(false);
      setTabSwitchDetection(false);
      setMicrophoneDetection(false);
    } else {
      setControlDesktopApps(true);
      setScreenCountDetection(true);
      setSafeBrowser(true);
      setTabSwitchDetection(true);
      setMicrophoneDetection(true);
    }
  };

  const handleManualProctoringToggle = () => {
    const newState = !recordedManualProctoring;
    setRecordedManualProctoring(newState);
    if (!newState) {
      setFlagNotifications(false);
      setVideoRecording(false);
      setProctorFeedToTestTaker(false);
      setScreenSharing(false);
    } else {
      setFlagNotifications(true);
      setVideoRecording(true);
      setProctorFeedToTestTaker(true);
      setScreenSharing(true);
    }
  };

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      setUploadError('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          setUploadError('No data found in file');
          return;
        }

        const extractedQuestions: MCQQuestion[] = [];
        
        jsonData.forEach((row, index) => {
          const questionText = row['Question'] || row['question'];
          const option1 = row['Option 1'] || row['option1'] || row['Option1'];
          const option2 = row['Option 2'] || row['option2'] || row['Option2'];
          const option3 = row['Option 3'] || row['option3'] || row['Option3'];
          const option4 = row['Option 4'] || row['option4'] || row['Option4'];
          const correctAnswer = (row['Correct Answer'] || row['correctAnswer'] || row['CorrectAnswer'] || '').toString().toUpperCase();
          const marks = parseFloat(row['Marks'] || row['marks'] || '1');

          if (!questionText) {
            console.warn(`Row ${index + 2}: Missing question text`);
            return;
          }

          if (!option1 || !option2) {
            console.warn(`Row ${index + 2}: Insufficient options`);
            return;
          }

          if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
            console.warn(`Row ${index + 2}: Invalid correct answer (must be A, B, C, or D)`);
            return;
          }

          const options = [
            { id: `${Date.now()}-${index}-1`, text: option1, isCorrect: correctAnswer === 'A' },
            { id: `${Date.now()}-${index}-2`, text: option2, isCorrect: correctAnswer === 'B' },
          ];

          if (option3) {
            options.push({ id: `${Date.now()}-${index}-3`, text: option3, isCorrect: correctAnswer === 'C' });
          }
          if (option4) {
            options.push({ id: `${Date.now()}-${index}-4`, text: option4, isCorrect: correctAnswer === 'D' });
          }

          const correctOption = options.find(opt => opt.isCorrect);
          
          extractedQuestions.push({
            id: `q-${Date.now()}-${index}`,
            question: questionText,
            options: options.map(opt => ({ id: opt.id, text: opt.text })),
            correctOptionId: correctOption?.id || options[0].id,
          });
        });

        if (extractedQuestions.length === 0) {
          setUploadError('No valid questions found. Please check the format.');
          return;
        }

        setMcqQuestions((prev) => [...prev, ...extractedQuestions]);
        setShowFileUploader(false);
        setUploadError('');
        
        // Reset file input
        event.target.value = '';
      } catch (error) {
        console.error('Error parsing file:', error);
        setUploadError('Error parsing file. Please check the format.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Question': 'What is 2 + 2?',
        'Option 1': '3',
        'Option 2': '4',
        'Option 3': '5',
        'Option 4': '6',
        'Correct Answer': 'B',
        'Marks': 1
      },
      {
        'Question': 'Which planet is known as the Red Planet?',
        'Option 1': 'Venus',
        'Option 2': 'Mars',
        'Option 3': 'Jupiter',
        'Option 4': 'Saturn',
        'Correct Answer': 'B',
        'Marks': 2
      },
      {
        'Question': 'What is the capital of France?',
        'Option 1': 'London',
        'Option 2': 'Berlin',
        'Option 3': 'Paris',
        'Option 4': 'Rome',
        'Correct Answer': 'C',
        'Marks': 1
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 50 }, // Question
      { wch: 20 }, // Option 1
      { wch: 20 }, // Option 2
      { wch: 20 }, // Option 3
      { wch: 20 }, // Option 4
      { wch: 15 }, // Correct Answer
      { wch: 10 }  // Marks
    ];

    XLSX.writeFile(workbook, 'exam_questions_template.xlsx');
  };

  const handlePreview = () => {
    // Move to step 2 (Settings)
    setCurrentStep(2);
  };

  const handleBackToQuestions = () => {
    setCurrentStep(1);
  };

  const handleFinalSubmit = () => {
    sessionStorage.setItem(
      "examPreviewData",
      JSON.stringify({
        examName,
        startTime,
        endTime,
        duration,
        thirdEye,
        multiPerson,
        eyeBall,
        objectDetect,
        headDirection,
        flagNotifications,
        videoRecording,
        tabSwitchDetection,
        microphoneDetection,
        safeBrowser,
        proctorFeedToTestTaker,
        screenSharing,
        screenCountDetection,
        controlDesktopApps,
        normalProctoring,
        aiPoweredProctoring,
        recordedManualProctoring,
        faceAuthentication,
        mcqQuestions,
      })
    );
    router.push("/examiner/ExamPreview");
  };

  const Toggle = ({
    label,
    enabled,
    onToggle,
    disabled = false,
  }: {
    label: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderRadius: 8,
        background: "var(--secondary-bg)",
        border: "1px solid var(--border-color)",
        transition: "all 0.2s ease",
      }}
      className="theme-transition"
    >
      <span
        className="theme-transition"
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
          transition: "color 0.3s ease",
        }}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        aria-pressed={enabled}
        disabled={disabled}
        className="theme-transition"
        style={{
          position: "relative",
          width: 48,
          height: 26,
          borderRadius: 999,
          border: "none",
          background: enabled ? "var(--accent-color)" : "#ddd",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 0.2s ease",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 2,
            left: enabled ? 24 : 2,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            transition: "left 0.2s ease",
          }}
        />
      </button>
    </div>
  );

  const CollapsibleSection = ({
    title,
    subtitle,
    isOpen,
    onToggle,
    masterToggle,
    masterEnabled,
    onMasterToggle,
    children,
    icon,
  }: {
    title: string;
    subtitle: string;
    isOpen: boolean;
    onToggle: () => void;
    masterToggle?: boolean;
    masterEnabled?: boolean;
    onMasterToggle?: () => void;
    children: React.ReactNode;
    icon: React.ReactNode;
  }) => (
    <div
      className="theme-transition"
      style={{
        marginBottom: 16,
        border: "2px solid var(--border-color)",
        borderRadius: 14,
        background: "var(--card-bg)",
        overflow: "hidden",
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: isOpen ? "var(--secondary-bg)" : "transparent",
          borderBottom: isOpen ? "1px solid var(--border-color)" : "none",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
          }}
        >
          <span style={{ fontSize: "24px" }}>{icon}</span>
          <div>
            <h3
              className="theme-transition"
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {title}
            </h3>
            <p
              className="theme-transition"
              style={{
                margin: 0,
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: "12px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {masterToggle && (
            <button
              type="button"
              onClick={onMasterToggle}
              className="theme-transition"
              style={{
                position: "relative",
                width: 52,
                height: 28,
                borderRadius: 999,
                border: "none",
                background: masterEnabled ? "var(--accent-color)" : "#ddd",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: masterEnabled ? 26 : 2,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  transition: "left 0.2s ease",
                }}
              />
            </button>
          )}
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s ease",
            }}
          >
            ▼
          </button>
        </div>
      </div>

      {/* Content */}
      {isOpen && <div style={{ padding: "20px" }}>{children}</div>}
    </div>
  );

  const getEnabledFeaturesCount = () => {
    let count = 0;
    if (normalProctoring)
      count += [
        controlDesktopApps,
        screenCountDetection,
        safeBrowser,
        tabSwitchDetection,
        microphoneDetection,
      ].filter(Boolean).length;
    if (aiPoweredProctoring)
      count += [
        thirdEye,
        multiPerson,
        eyeBall,
        objectDetect,
        headDirection,
        faceAuthentication,
      ].filter(Boolean).length;
    if (recordedManualProctoring)
      count += [
        flagNotifications,
        videoRecording,
        proctorFeedToTestTaker,
      ].filter(Boolean).length;
    return count;
  };

  return (
    <ExaminerGuard>
      <div
        className="theme-transition"
        style={{
          minHeight: "100vh",
          background: "var(--primary-bg)",
          transition: "background 0.3s ease",
        }}
      >
        {/* Header */}
        <header
          className="theme-transition"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "var(--card-bg)",
            borderBottom: "1px solid var(--border-color)",
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
              onClick={() => router.push("/examiner/CreateExamPage")}
              className="theme-transition"
              style={{
                background: "var(--secondary-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
            >
              <span>←</span> Back
            </button>
            <div>
              <h1
                className="theme-transition"
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  marginBottom: "4px",
                }}
              >
                Create New Exam - Step {currentStep} of 2
              </h1>
              <p
                className="theme-transition"
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  margin: 0,
                }}
              >
                {currentStep === 1 && "Setup exam name and questions"}
                {currentStep === 2 &&
                  `Configure exam settings • ${
                    mcqQuestions.length
                  } questions • ${getEnabledFeaturesCount()} features enabled`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Step Indicator */}
            <div style={{ display: "flex", gap: "8px", marginRight: "16px" }}>
              {[1, 2].map((step) => (
                <div
                  key={step}
                  style={{
                    width: currentStep === step ? "32px" : "10px",
                    height: "10px",
                    borderRadius: "5px",
                    background:
                      currentStep >= step
                        ? "var(--accent-color)"
                        : "var(--border-color)",
                    transition: "all 0.3s ease",
                  }}
                />
              ))}
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content */}
        <main
          style={{
            display: "flex",
            gap: "24px",
            padding: "32px",
            maxWidth: "1200px",
            margin: "0 auto",
            alignItems: "flex-start",
          }}
        >
          {/* Form */}
          <div
            style={{
              flex: "1",
              maxWidth: "100%",
            }}
          >
            {/* STEP 1: Exam Name & Questions */}
            {currentStep === 1 && (
              <>
                {/* Exam Name */}
                <div
                  className={`${styles.glassPanel} theme-transition`}
                  style={{
                    padding: "24px",
                    borderRadius: "14px",
                    marginBottom: "16px",
                  }}
                >
                  <label
                    className="theme-transition"
                    style={{
                      display: "block",
                      marginBottom: "12px",
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      fontSize: "15px",
                    }}
                  >
                    📝 Exam Name *
                  </label>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="Enter exam name (e.g., Midterm Mathematics Exam)"
                    className="input-theme theme-transition"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      borderRadius: "10px",
                      fontSize: "15px",
                      outline: "none",
                      border: "2px solid var(--border-color)",
                      background: "var(--secondary-bg)",
                    }}
                  />
                </div>

                {/* Exam Schedule & Duration */}
                <div
                  className={`${styles.glassPanel} theme-transition`}
                  style={{
                    padding: "24px",
                    borderRadius: "14px",
                    marginBottom: "16px",
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "20px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>📅</span>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      Schedule & Timing
                    </h3>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "24px",
                    }}
                  >
                    {/* Start Time */}
                    <div style={{ position: "relative" }}>
                      <label
                        className="theme-transition"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          color: "var(--text-secondary)",
                          fontWeight: 500,
                          fontSize: "14px",
                        }}
                      >
                        Start Date & Time
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="input-theme theme-transition"
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "1px solid var(--border-color)",
                            background: "var(--secondary-bg)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            outline: "none",
                            transition: "all 0.2s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* End Time */}
                    <div style={{ position: "relative" }}>
                      <label
                        className="theme-transition"
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          color: "var(--text-secondary)",
                          fontWeight: 500,
                          fontSize: "14px",
                        }}
                      >
                        End Date & Time
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="datetime-local"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="input-theme theme-transition"
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: "10px",
                            border: "1px solid var(--border-color)",
                            background: "var(--secondary-bg)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            outline: "none",
                            transition: "all 0.2s ease",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duration Input */}
                  <div style={{ marginTop: "24px" }}>
                    <label
                      className="theme-transition"
                      style={{
                        display: "block",
                        marginBottom: "12px",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                        fontSize: "14px",
                      }}
                    >
                      Exam Duration
                    </label>
                    <div
                      style={{
                        display: "flex",
                        gap: "20px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: "0 0 120px" }}>
                        <label
                          style={{
                            fontSize: "12px",
                            color: "var(--text-tertiary)",
                            marginBottom: "6px",
                            display: "block",
                          }}
                        >
                          Hours
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={Math.floor(Number(duration || 0) / 60)}
                          onChange={(e) => {
                            const h = Math.max(
                              0,
                              parseInt(e.target.value) || 0
                            );
                            const m = Number(duration || 0) % 60;
                            setDuration((h * 60 + m).toString());
                          }}
                          className="input-theme theme-transition"
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "10px",
                            border: "1px solid var(--border-color)",
                            background: "var(--secondary-bg)",
                            color: "var(--text-primary)",
                            fontSize: "16px",
                            textAlign: "center",
                            outline: "none",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          paddingTop: "32px",
                          color: "var(--text-tertiary)",
                          fontWeight: "bold",
                        }}
                      >
                        :
                      </div>
                      <div style={{ flex: "0 0 120px" }}>
                        <label
                          style={{
                            fontSize: "12px",
                            color: "var(--text-tertiary)",
                            marginBottom: "6px",
                            display: "block",
                          }}
                        >
                          Minutes
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={Number(duration || 0) % 60}
                          onChange={(e) => {
                            const m = Math.max(
                              0,
                              Math.min(59, parseInt(e.target.value) || 0)
                            );
                            const h = Math.floor(Number(duration || 0) / 60);
                            setDuration((h * 60 + m).toString());
                          }}
                          className="input-theme theme-transition"
                          style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "10px",
                            border: "1px solid var(--border-color)",
                            background: "var(--secondary-bg)",
                            color: "var(--text-primary)",
                            fontSize: "16px",
                            textAlign: "center",
                            outline: "none",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          height: "80px",
                          paddingLeft: "20px",
                        }}
                      >
                        <div
                          style={{
                            background: "var(--secondary-bg)",
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span style={{ fontSize: "20px" }}>⏱</span>
                          <div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--text-tertiary)",
                              }}
                            >
                              Total Duration
                            </div>
                            <div
                              style={{
                                color: "var(--accent-color)",
                                fontWeight: 700,
                                fontSize: "16px",
                              }}
                            >
                              {duration || 0} minutes
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Questions Section */}
                <CollapsibleSection
                  title="MCQ Questions"
                  subtitle={`Add multiple choice questions (${mcqQuestions.length} questions added)`}
                  icon={<HelpCircle size={24} color="var(--accent-color)" />}
                  isOpen={mcqSectionOpen}
                  onToggle={() => setMcqSectionOpen(!mcqSectionOpen)}
                >
                  {showFileUploader && (
                    <div
                      className="theme-transition"
                      style={{
                        padding: "24px",
                        background: "var(--secondary-bg)",
                        borderRadius: "12px",
                        border: "2px dashed var(--border-color)",
                        marginBottom: "16px",
                      }}
                    >
                      <div style={{ marginBottom: "20px" }}>
                        <h4
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "16px",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <FileSpreadsheet size={18} /> Upload Excel/CSV File
                        </h4>
                        <p
                          style={{
                            margin: "0 0 16px 0",
                            fontSize: "13px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Upload an Excel (.xlsx, .xls) or CSV file with your questions. 
                          Download the sample template to see the required format.
                        </p>

                        {/* Sample Format Info */}
                        <div
                          style={{
                            background: "var(--card-bg)",
                            padding: "16px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            marginBottom: "16px",
                          }}
                        >
                          <h5
                            style={{
                              margin: "0 0 12px 0",
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            Required Format:
                          </h5>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "11px",
                              }}
                            >
                              <thead>
                                <tr style={{ background: "var(--secondary-bg)" }}>
                                  <th style={{ padding: "8px", textAlign: "left", border: "1px solid var(--border-color)" }}>Column Name</th>
                                  <th style={{ padding: "8px", textAlign: "left", border: "1px solid var(--border-color)" }}>Description</th>
                                  <th style={{ padding: "8px", textAlign: "left", border: "1px solid var(--border-color)" }}>Example</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)", fontWeight: 600 }}>Question</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>The question text</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>What is 2 + 2?</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)", fontWeight: 600 }}>Option 1</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>First option (required)</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>3</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)", fontWeight: 600 }}>Option 2</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>Second option (required)</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>4</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)", fontWeight: 600 }}>Option 3</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>Third option (optional)</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>5</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)", fontWeight: 600 }}>Option 4</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>Fourth option (optional)</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>6</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)", fontWeight: 600 }}>Correct Answer</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>A, B, C, or D</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>B</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)", fontWeight: 600 }}>Marks</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>Points for question</td>
                                  <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>1</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Download Template Button */}
                        <button
                          type="button"
                          onClick={downloadSampleTemplate}
                          className="theme-transition"
                          style={{
                            padding: "10px 16px",
                            borderRadius: "8px",
                            border: "1px solid var(--accent-color)",
                            background: "var(--accent-color)",
                            color: "white",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            marginBottom: "16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <span>📥</span> Download Sample Template
                        </button>

                        {uploadError && (
                          <div
                            style={{
                              padding: "12px",
                              background: "#fee",
                              border: "1px solid #fcc",
                              borderRadius: "8px",
                              color: "#c33",
                              fontSize: "13px",
                              marginBottom: "16px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <AlertTriangle size={16} /> {uploadError}
                          </div>
                        )}

                        {/* File Input */}
                        <div
                          style={{
                            border: "2px dashed var(--accent-color)",
                            borderRadius: "8px",
                            padding: "32px",
                            textAlign: "center",
                            background: "var(--card-bg)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.background = "var(--secondary-bg)";
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.background = "var(--card-bg)";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.background = "var(--card-bg)";
                            const files = e.dataTransfer.files;
                            if (files.length > 0) {
                              const input = document.getElementById('file-upload') as HTMLInputElement;
                              if (input) {
                                input.files = files;
                                handleFileUpload({ target: input } as any);
                              }
                            }
                          }}
                        >
                          <input
                            id="file-upload"
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            style={{ display: "none" }}
                          />
                          <label
                            htmlFor="file-upload"
                            style={{
                              cursor: "pointer",
                              display: "block",
                            }}
                          >
                            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📁</div>
                            <p
                              style={{
                                margin: "0 0 8px 0",
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "var(--text-primary)",
                              }}
                            >
                              Click to upload or drag and drop
                            </p>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "12px",
                                color: "var(--text-secondary)",
                              }}
                            >
                              Excel (.xlsx, .xls) or CSV files
                            </p>
                          </label>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowFileUploader(false);
                            setUploadError('');
                          }}
                          className="theme-transition"
                          style={{
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            background: "var(--secondary-bg)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            fontWeight: 600,
                            cursor: "pointer",
                            flex: 1,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {showQuestionEditor && (
                    <MCQQuestionEditor
                      onSave={handleAddQuestion}
                      onCancel={handleCancelQuestionEditor}
                      initialQuestion={editingQuestion}
                    />
                  )}

                  {!showQuestionEditor &&
                    !showFileUploader &&
                    mcqQuestions.length > 0 && (
                      <MCQQuestionList
                        questions={mcqQuestions}
                        onEdit={handleEditQuestion}
                        onDelete={handleDeleteQuestion}
                      />
                    )}

                  {!showQuestionEditor &&
                    !showFileUploader &&
                    mcqQuestions.length === 0 && (
                      <div
                        className="theme-transition"
                        style={{
                          textAlign: "center",
                          padding: "40px 20px",
                          color: "var(--text-secondary)",
                          fontSize: "14px",
                        }}
                      >
                        No questions added yet. Upload an Excel/CSV file or add questions
                        manually.
                      </div>
                    )}

                  {!showQuestionEditor && !showFileUploader && (
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: mcqQuestions.length > 0 ? 16 : 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowFileUploader(true)}
                        className="theme-transition"
                        style={{
                          padding: "12px 20px",
                          borderRadius: 10,
                          border: "2px dashed var(--accent-color)",
                          background: "transparent",
                          color: "var(--accent-color)",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          flex: 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        � Upload Excel/CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQuestionEditor(true)}
                        className="theme-transition"
                        style={{
                          padding: "12px 20px",
                          borderRadius: 10,
                          border: "2px dashed var(--accent-color)",
                          background: "transparent",
                          color: "var(--accent-color)",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          flex: 1,
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <PenLine size={16} /> Add Manually
                      </button>
                    </div>
                  )}
                </CollapsibleSection>

                {/* Action Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "24px",
                  }}
                >
                  <button
                    onClick={() => router.push("/examiner/CreateExamPage")}
                    className={`${styles.btn} ${styles.btnGhost} theme-transition`}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={!examName.trim() || mcqQuestions.length === 0}
                    className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      opacity:
                        !examName.trim() || mcqQuestions.length === 0 ? 0.6 : 1,
                      cursor:
                        !examName.trim() || mcqQuestions.length === 0
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    Next: Settings →
                  </button>
                </div>
              </>
            )}

            {/* STEP 2: Exam Settings */}
            {currentStep === 2 && (
              <>
                {/* Proctoring Sections */}
                <CollapsibleSection
                  title="Normal Proctoring"
                  subtitle="Basic monitoring and browser control features"
                  icon={<Monitor size={24} color="var(--accent-color)" />}
                  isOpen={normalProctoringOpen}
                  onToggle={() =>
                    setNormalProctoringOpen(!normalProctoringOpen)
                  }
                  masterToggle
                  masterEnabled={normalProctoring}
                  onMasterToggle={handleNormalProctoringToggle}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(250px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <Toggle
                      label="Control Desktop Apps"
                      enabled={controlDesktopApps}
                      onToggle={() => setControlDesktopApps((v) => !v)}
                      disabled={!normalProctoring}
                    />
                    <Toggle
                      label="Screen Count Detection"
                      enabled={screenCountDetection}
                      onToggle={() => setScreenCountDetection((v) => !v)}
                      disabled={!normalProctoring}
                    />
                    <Toggle
                      label="Safe Browser"
                      enabled={safeBrowser}
                      onToggle={() => setSafeBrowser((v) => !v)}
                      disabled={!normalProctoring}
                    />
                    <Toggle
                      label="Tab Switch Detection"
                      enabled={tabSwitchDetection}
                      onToggle={() => setTabSwitchDetection((v) => !v)}
                      disabled={!normalProctoring}
                    />
                    <Toggle
                      label="Microphone Detection"
                      enabled={microphoneDetection}
                      onToggle={() => setMicrophoneDetection((v) => !v)}
                      disabled={!normalProctoring}
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="AI Powered Proctoring"
                  subtitle="Advanced AI-based monitoring and detection"
                  icon={<Bot size={24} color="var(--accent-color)" />}
                  isOpen={aiProctoringOpen}
                  onToggle={() => setAiProctoringOpen(!aiProctoringOpen)}
                  masterToggle
                  masterEnabled={aiPoweredProctoring}
                  onMasterToggle={handleAiProctoringToggle}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(250px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <Toggle
                      label="Third Eye"
                      enabled={thirdEye}
                      onToggle={() => setThirdEye((v) => !v)}
                      disabled={!aiPoweredProctoring}
                    />
                    <Toggle
                      label="Multiple Person Detection"
                      enabled={multiPerson}
                      onToggle={() => setMultiPerson((v) => !v)}
                      disabled={!aiPoweredProctoring}
                    />
                    <Toggle
                      label="Eyeball Detection"
                      enabled={eyeBall}
                      onToggle={() => setEyeBall((v) => !v)}
                      disabled={!aiPoweredProctoring}
                    />
                    <Toggle
                      label="Object Detection"
                      enabled={objectDetect}
                      onToggle={() => setObjectDetect((v) => !v)}
                      disabled={!aiPoweredProctoring}
                    />
                    <Toggle
                      label="Head Direction"
                      enabled={headDirection}
                      onToggle={() => setHeadDirection((v) => !v)}
                      disabled={!aiPoweredProctoring}
                    />
                    <Toggle
                      label="Face Authentication"
                      enabled={faceAuthentication}
                      onToggle={() => setFaceAuthentication((v) => !v)}
                      disabled={!aiPoweredProctoring}
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection
                  title="Recorded Manual Proctoring"
                  subtitle="Recording and manual review capabilities"
                  icon={<Video size={24} color="var(--accent-color)" />}
                  isOpen={manualProctoringOpen}
                  onToggle={() =>
                    setManualProctoringOpen(!manualProctoringOpen)
                  }
                  masterToggle
                  masterEnabled={recordedManualProctoring}
                  onMasterToggle={handleManualProctoringToggle}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(250px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <Toggle
                      label="Flag Notifications"
                      enabled={flagNotifications}
                      onToggle={() => setFlagNotifications((v) => !v)}
                      disabled={!recordedManualProctoring}
                    />
                    <Toggle
                      label="Video Recording"
                      enabled={videoRecording}
                      onToggle={() => setVideoRecording((v) => !v)}
                      disabled={!recordedManualProctoring}
                    />
                    <Toggle
                      label="Proctor Feed to Test Taker"
                      enabled={proctorFeedToTestTaker}
                      onToggle={() => setProctorFeedToTestTaker((v) => !v)}
                      disabled={!recordedManualProctoring}
                    />
                    <Toggle
                      label="Screen Sharing"
                      enabled={screenSharing}
                      onToggle={() => setScreenSharing((v) => !v)}
                      disabled={!recordedManualProctoring}
                    />
                  </div>
                </CollapsibleSection>

                {/* Action Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "24px",
                  }}
                >
                  <button
                    onClick={handleBackToQuestions}
                    className={`${styles.btn} ${styles.btnGhost} theme-transition`}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ← Back to Questions
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Preview & Create Exam →
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </ExaminerGuard>
  );
};

export default NewExam;
