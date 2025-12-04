import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import MCQQuestionEditor from "../../components/exam/MCQQuestionEditor";
import MCQQuestionList from "../../components/exam/MCQQuestionList";
import { MCQQuestion } from "../../types/mcq";
import { ThemeToggle } from "../../components/ThemeToggle";
import { ExaminerGuard } from "@/components/guards";
import * as XLSX from 'xlsx';
import styles from "../../styles/NewExam.module.css";
import { 
  AlertTriangle, 
  Monitor, 
  HelpCircle, 
  Bot, 
  Video, 
  FileSpreadsheet, Users, Mail,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Timer,
  FileText,
  ChevronDown,
  ChevronUp,
  Upload,
  Download,
  FolderOpen,
  Plus,
  Check,
  X,
  PenLine
} from "lucide-react";

interface Student {
  email: string;
  password: string;
  name?: string;
  reg?: string;
  dept?: string;
}

const NewExam = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1); // 1: Name & Questions, 2: Settings, 3: Students
  const [examName, setExamName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("");

  // Section collapse states
  const [normalProctoringOpen, setNormalProctoringOpen] = useState(true);
  const [aiProctoringOpen, setAiProctoringOpen] = useState(true);
  const [manualProctoringOpen, setManualProctoringOpen] = useState(true);
  const [mcqSectionOpen, setMcqSectionOpen] = useState(true);
  const [studentsSectionOpen, setStudentsSectionOpen] = useState(true);

  // Students state
  const [students, setStudents] = useState<Student[]>([]);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentReg, setNewStudentReg] = useState("");
  const [newStudentDept, setNewStudentDept] = useState("");
  const [studentUploadError, setStudentUploadError] = useState("");
  const [sendEmailInvitations, setSendEmailInvitations] = useState(true);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState<any>(null);

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
        setStudents(data.students || []);

        // Always start on step 1 (questions page)
        setCurrentStep(1);
      } catch (error) {
        console.error("Error restoring exam data:", error);
      }
    }
  }, []);

  // Student management handlers
  const handleAddStudent = () => {
    if (!newStudentEmail.trim() || !newStudentPassword.trim()) {
      setStudentUploadError("Email and password are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStudentEmail)) {
      setStudentUploadError("Invalid email format");
      return;
    }

    if (students.some(s => s.email === newStudentEmail)) {
      setStudentUploadError("Student with this email already added");
      return;
    }

    setStudents(prev => [...prev, {
      email: newStudentEmail.trim(),
      password: newStudentPassword.trim(),
      name: newStudentName.trim() || undefined,
      reg: newStudentReg.trim() || undefined,
      dept: newStudentDept.trim() || undefined
    }]);

    setNewStudentEmail("");
    setNewStudentPassword("");
    setNewStudentName("");
    setNewStudentReg("");
    setNewStudentDept("");
    setStudentUploadError("");
    setShowStudentForm(false);
  };

  const handleDeleteStudent = (email: string) => {
    setStudents(prev => prev.filter(s => s.email !== email));
  };

  const handleStudentFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      setStudentUploadError('Please upload a valid Excel (.xlsx, .xls) or CSV file');
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
          setStudentUploadError('No data found in file');
          return;
        }

        const extractedStudents: Student[] = [];
        
        jsonData.forEach((row, index) => {
          const email = row['Email'] || row['email'];
          const password = row['Password'] || row['password'];
          const name = row['Name'] || row['name'];
          const reg = row['Registration Number'] || row['Reg'] || row['reg'] || row['registration'] || row['Registration'];
          const dept = row['Department'] || row['Dept'] || row['dept'] || row['department'];

          if (!email || !password) {
            console.warn(`Row ${index + 2}: Missing email or password`);
            return;
          }

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            console.warn(`Row ${index + 2}: Invalid email format`);
            return;
          }

          extractedStudents.push({
            email: email.trim(),
            password: password.trim(),
            name: name?.trim(),
            reg: reg?.trim(),
            dept: dept?.trim()
          });
        });

        if (extractedStudents.length === 0) {
          setStudentUploadError('No valid students found. Please check the format.');
          return;
        }

        setStudents(prev => [...prev, ...extractedStudents]);
        setStudentUploadError('');
        event.target.value = '';
      } catch (error) {
        console.error('Error parsing file:', error);
        setStudentUploadError('Error parsing file. Please check the format.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const downloadStudentsTemplate = () => {
    const sampleData = [
      {
        'Email': 'student1@example.com',
        'Password': 'password123',
        'Name': 'John Doe',
        'Registration Number': 'REG001',
        'Department': 'Computer Science'
      },
      {
        'Email': 'student2@example.com',
        'Password': 'password456',
        'Name': 'Jane Smith',
        'Registration Number': 'REG002',
        'Department': 'Information Technology'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    worksheet['!cols'] = [
      { wch: 30 }, // Email
      { wch: 15 }, // Password
      { wch: 25 }, // Name
      { wch: 20 }, // Registration Number
      { wch: 30 }  // Department
    ];

    XLSX.writeFile(workbook, 'students_template.xlsx');
  };

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

  const handleSettingsToStudents = () => {
    // Move to step 3 (Students)
    setCurrentStep(3);
  };

  const handleBackToSettings = () => {
    setCurrentStep(2);
  };

  const handleFinalSubmit = async () => {
    // Store data in session storage
    const examData = {
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
      students,
      sendEmailInvitations,
    };

    sessionStorage.setItem("examPreviewData", JSON.stringify(examData));

    // If user wants to send emails and there are students, send them now
    if (sendEmailInvitations && students.length > 0) {
      setIsSendingEmails(true);
      try {
        // First, we need to create the exam to get the exam ID
        // For now, we'll store the flag and handle it in ExamPreview
        // The actual email sending will happen after exam creation
        console.log("Email invitations will be sent after exam creation");
      } catch (error) {
        console.error("Error preparing email invitations:", error);
      } finally {
        setIsSendingEmails(false);
      }
    }

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
        padding: "14px 16px",
        borderRadius: 12,
        background: enabled && !disabled ? "rgba(var(--accent-color-rgb), 0.08)" : "var(--secondary-bg)",
        border: enabled && !disabled ? "1px solid rgba(var(--accent-color-rgb), 0.3)" : "1px solid var(--border-color)",
        transition: "all 0.25s ease",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      className="theme-transition"
      onClick={disabled ? undefined : onToggle}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: enabled ? "var(--accent-color)" : "var(--text-tertiary)",
            opacity: disabled ? 0.4 : 1,
            transition: "all 0.25s ease",
          }}
        />
        <span
          className="theme-transition"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
            transition: "color 0.3s ease",
          }}
        >
          {label}
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onToggle();
        }}
        aria-pressed={enabled}
        disabled={disabled}
        className="theme-transition"
        style={{
          position: "relative",
          width: 52,
          height: 28,
          borderRadius: 999,
          border: "none",
          background: enabled ? "var(--accent-color)" : "var(--border-color)",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "all 0.25s ease",
          opacity: disabled ? 0.5 : 1,
          boxShadow: enabled ? "0 2px 8px rgba(var(--accent-color-rgb), 0.3)" : "inset 0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 27 : 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {enabled && (
            <Check size={12} style={{ color: "var(--accent-color)" }} />
          )}
        </span>
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
    fullHeight,
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
    fullHeight?: boolean;
  }) => (
    <div
      className="theme-transition"
      style={{
        marginBottom: fullHeight ? 0 : 20,
        borderRadius: 16,
        background: "var(--card-bg)",
        flex: fullHeight ? 1 : undefined,
        display: fullHeight ? "flex" : undefined,
        flexDirection: fullHeight ? "column" : undefined,
        overflow: "hidden",
        transition: "all 0.3s ease",
        boxShadow: isOpen 
          ? "0 8px 32px -8px rgba(0, 0, 0, 0.12), 0 4px 16px -4px rgba(0, 0, 0, 0.08)" 
          : "0 2px 8px -2px rgba(0, 0, 0, 0.08)",
        border: "1px solid var(--border-color)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: isOpen 
            ? "linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.05) 0%, transparent 100%)" 
            : "transparent",
          borderBottom: isOpen ? "1px solid var(--border-color)" : "none",
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
        onClick={onToggle}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flex: 1,
          }}
        >
          <div 
            style={{ 
              width: 48,
              height: 48,
              borderRadius: 12,
              background: masterEnabled !== false 
                ? "linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.15) 0%, rgba(var(--accent-color-rgb), 0.05) 100%)" 
                : "var(--secondary-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
            }}
          >
            {icon}
          </div>
          <div style={{ flex: 1 }}>
            <h3
              className="theme-transition"
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h3>
            <p
              className="theme-transition"
              style={{
                margin: "4px 0 0 0",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </p>
          </div>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: "16px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {masterToggle && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span 
                style={{ 
                  fontSize: 12, 
                  fontWeight: 600,
                  color: masterEnabled ? "var(--accent-color)" : "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {masterEnabled ? "Enabled" : "Disabled"}
              </span>
              <button
                type="button"
                onClick={onMasterToggle}
                className="theme-transition"
                style={{
                  position: "relative",
                  width: 56,
                  height: 30,
                  borderRadius: 999,
                  border: "none",
                  background: masterEnabled ? "var(--accent-color)" : "var(--border-color)",
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  boxShadow: masterEnabled 
                    ? "0 2px 8px rgba(var(--accent-color-rgb), 0.3)" 
                    : "inset 0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: masterEnabled ? 29 : 3,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {masterEnabled && (
                    <Check size={12} style={{ color: "var(--accent-color)" }} />
                  )}
                </span>
              </button>
            </div>
          )}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: isOpen ? "var(--secondary-bg)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
            }}
          >
            {isOpen ? (
              <ChevronUp size={20} color="var(--text-secondary)" />
            ) : (
              <ChevronDown size={20} color="var(--text-secondary)" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div 
          style={{ 
            padding: "24px",
            background: "var(--secondary-bg)",
            flex: fullHeight ? 1 : undefined,
            display: fullHeight ? "flex" : undefined,
            flexDirection: fullHeight ? "column" : undefined,
          }}
        >
          {children}
        </div>
      )}
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
        {/* Modern Header */}
        <header
          className="theme-transition"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(var(--card-bg-rgb), 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border-color)",
            padding: "0 32px",
          }}
        >
          <div
            style={{
              maxWidth: "1400px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: "72px",
              padding: "0 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              <button
                onClick={() => router.push("/examiner/CreateExamPage")}
                className="theme-transition"
                style={{
                  background: "transparent",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.background = "var(--secondary-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <ArrowLeft size={18} /> Back
              </button>
              
              <div style={{ height: "32px", width: "1px", background: "var(--border-color)" }} />
              
              <div>
                <h1
                  className="theme-transition"
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Create New Exam
                </h1>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              {/* Enhanced Step Indicator */}
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  background: "var(--secondary-bg)",
                  padding: "6px 16px",
                  borderRadius: "100px",
                }}
              >
                {[
                  { step: 1, label: "Details" },
                  { step: 2, label: "Settings" },
                ].map(({ step, label }, index) => (
                  <React.Fragment key={step}>
                    {index > 0 && (
                      <div
                        style={{
                          width: "24px",
                          height: "2px",
                          background: currentStep >= step ? "var(--accent-color)" : "var(--border-color)",
                          transition: "all 0.3s ease",
                        }}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "4px 8px",
                        borderRadius: "100px",
                        background: currentStep === step ? "var(--accent-color)" : "transparent",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: currentStep >= step 
                            ? currentStep === step ? "white" : "var(--accent-color)"
                            : "var(--border-color)",
                          color: currentStep === step ? "var(--accent-color)" : currentStep > step ? "white" : "var(--text-tertiary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          transition: "all 0.3s ease",
                        }}
                      >
                        {currentStep > step ? <Check size={12} /> : step}
                      </div>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: currentStep === step ? "white" : "var(--text-secondary)",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main
          style={{
            padding: "32px 48px",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          {/* Step Info Banner */}
          <div
            className="theme-transition"
            style={{
              background: "linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.1) 0%, rgba(var(--accent-color-rgb), 0.03) 100%)",
              border: "1px solid rgba(var(--accent-color-rgb), 0.2)",
              borderRadius: "16px",
              padding: "20px 24px",
              marginBottom: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "var(--accent-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {currentStep === 1 ? (
                  <FileText size={24} color="white" />
                ) : (
                  <Monitor size={24} color="white" />
                )}
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {currentStep === 1 ? "Exam Details & Questions" : "Proctoring Settings"}
                </h2>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {currentStep === 1 
                    ? "Enter exam information and add your questions" 
                    : `Configure monitoring features • ${mcqQuestions.length} questions • ${getEnabledFeaturesCount()} features enabled`}
                </p>
              </div>
            </div>
            {currentStep === 1 && mcqQuestions.length > 0 && (
              <div
                style={{
                  background: "var(--card-bg)",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Questions: </span>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent-color)" }}>{mcqQuestions.length}</span>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* STEP 1: Exam Name & Questions */}
            {currentStep === 1 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                {/* Left Column - Exam Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Exam Name Card */}
                <div
                  className="theme-transition"
                  style={{
                    background: "var(--card-bg)",
                    borderRadius: "16px",
                    padding: "28px",
                    border: "1px solid var(--border-color)",
                    boxShadow: "0 4px 20px -8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.15) 0%, rgba(var(--accent-color-rgb), 0.05) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileText size={18} color="var(--accent-color)" />
                    </div>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Exam Name
                      </h3>
                      <p
                        style={{
                          margin: "2px 0 0 0",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Give your exam a descriptive name
                      </p>
                    </div>
                  </div>
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
                  className="theme-transition"
                  style={{
                    background: "var(--card-bg)",
                    borderRadius: "16px",
                    padding: "28px",
                    border: "1px solid var(--border-color)",
                    boxShadow: "0 4px 20px -8px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.15) 0%, rgba(var(--accent-color-rgb), 0.05) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Calendar size={18} color="var(--accent-color)" />
                    </div>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Schedule & Timing
                      </h3>
                      <p
                        style={{
                          margin: "2px 0 0 0",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Set the exam window and duration
                      </p>
                    </div>
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
                          <Timer size={20} color="var(--accent-color)" />
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
                </div>

                {/* Right Column - Questions */}
                <div
                  className="theme-transition"
                  style={{
                    background: "var(--card-bg)",
                    borderRadius: "16px",
                    padding: "28px",
                    border: "1px solid var(--border-color)",
                    boxShadow: "0 4px 20px -8px rgba(0, 0, 0, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    height: "500px",
                    minHeight: "500px",
                    maxHeight: "500px",
                    overflow: "hidden",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexShrink: 0 }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, rgba(var(--accent-color-rgb), 0.15) 0%, rgba(var(--accent-color-rgb), 0.05) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <HelpCircle size={18} color="var(--accent-color)" />
                    </div>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        MCQ Questions
                      </h3>
                      <p
                        style={{
                          margin: "2px 0 0 0",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {mcqQuestions.length} questions added
                      </p>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", minHeight: 0 }}>
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
                          <Download size={16} /> Download Sample Template
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
                            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}>
                              <FolderOpen size={48} color="var(--accent-color)" strokeWidth={1.5} />
                            </div>
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
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        No questions added yet. Upload an Excel/CSV file or add questions
                        manually.
                      </div>
                    )}
                  </div>

                  {/* Fixed Footer Buttons - Outside scrollable area */}
                  {!showQuestionEditor && !showFileUploader && (
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "16px",
                        paddingTop: "16px",
                        borderTop: "1px solid var(--border-color)",
                        flexShrink: 0,
                        background: "var(--card-bg)",
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
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <Upload size={16} /> Upload Excel/CSV
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
                        <Plus size={16} /> Add Manually
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons - Full Width */}
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    gap: "16px",
                    marginTop: "16px",
                    paddingTop: "24px",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <button
                    onClick={() => router.push("/examiner/CreateExamPage")}
                    className="theme-transition"
                    style={{
                      padding: "14px 28px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                      background: "transparent",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--secondary-bg)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    <X size={18} /> Cancel
                  </button>
                  <button
                    onClick={handlePreview}
                    disabled={!examName.trim() || mcqQuestions.length === 0}
                    className="theme-transition"
                    style={{
                      flex: 1,
                      padding: "14px 28px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      background: !examName.trim() || mcqQuestions.length === 0 
                        ? "var(--border-color)" 
                        : "var(--accent-color)",
                      border: "none",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      opacity: !examName.trim() || mcqQuestions.length === 0 ? 0.6 : 1,
                      cursor: !examName.trim() || mcqQuestions.length === 0 ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: !examName.trim() || mcqQuestions.length === 0 
                        ? "none" 
                        : "0 4px 16px rgba(var(--accent-color-rgb), 0.3)",
                    }}
                  >
                    Continue to Settings <ArrowRight size={18} />
                  </button>
                </div>
              </div>
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
                        "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 16,
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
                        "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 16,
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
                        "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: 16,
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
                    gap: "16px",
                    marginTop: "32px",
                    paddingTop: "24px",
                    borderTop: "1px solid var(--border-color)",
                  }}
                >
                  <button
                    onClick={handleBackToQuestions}
                    className="theme-transition"
                    style={{
                      padding: "14px 28px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                      background: "transparent",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--secondary-bg)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    <ArrowLeft size={18} /> Back to Questions
                  </button>
                  <button
                    onClick={handleSettingsToStudents}
                    className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
                    style={{
                      flex: 1,
                      padding: "14px 28px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: 600,
                      background: "var(--accent-color)",
                      border: "none",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "0 4px 16px rgba(var(--accent-color-rgb), 0.3)",
                    }}
                  >
                    Next: Add Students →
                  </button>
                </div>
              </>
            )}


            {/* STEP 3: Add Students */}
            {currentStep === 3 && (
              <>
                {/* Students Section */}
                <CollapsibleSection
                  title="Add Students"
                  subtitle={`Invite students to this exam (${students.length} students added)`}
                  icon={<Users size={24} color="var(--accent-color)" />}
                  isOpen={studentsSectionOpen}
                  onToggle={() => setStudentsSectionOpen(!studentsSectionOpen)}
                >
                  {/* Student Form */}
                  {showStudentForm && (
                    <div
                      className="theme-transition"
                      style={{
                        padding: "24px",
                        background: "var(--secondary-bg)",
                        borderRadius: "12px",
                        border: "2px solid var(--border-color)",
                        marginBottom: "16px",
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 16px 0",
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Add Student Manually
                      </h4>

                      {studentUploadError && (
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
                          <AlertTriangle size={16} /> {studentUploadError}
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "var(--text-secondary)",
                            }}
                          >
                            Student Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                            placeholder="Enter student name"
                            className="input-theme theme-transition"
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--border-color)",
                              background: "var(--card-bg)",
                              color: "var(--text-primary)",
                              fontSize: "14px",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "var(--text-secondary)",
                            }}
                          >
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={newStudentEmail}
                            onChange={(e) => setNewStudentEmail(e.target.value)}
                            placeholder="student@example.com"
                            className="input-theme theme-transition"
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--border-color)",
                              background: "var(--card-bg)",
                              color: "var(--text-primary)",
                              fontSize: "14px",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "var(--text-secondary)",
                            }}
                          >
                            Password *
                          </label>
                          <input
                            type="text"
                            value={newStudentPassword}
                            onChange={(e) => setNewStudentPassword(e.target.value)}
                            placeholder="Enter password for student account"
                            className="input-theme theme-transition"
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--border-color)",
                              background: "var(--card-bg)",
                              color: "var(--text-primary)",
                              fontSize: "14px",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "var(--text-secondary)",
                            }}
                          >
                            Registration Number
                          </label>
                          <input
                            type="text"
                            value={newStudentReg}
                            onChange={(e) => setNewStudentReg(e.target.value)}
                            placeholder="REG001"
                            className="input-theme theme-transition"
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--border-color)",
                              background: "var(--card-bg)",
                              color: "var(--text-primary)",
                              fontSize: "14px",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "var(--text-secondary)",
                            }}
                          >
                            Department
                          </label>
                          <input
                            type="text"
                            value={newStudentDept}
                            onChange={(e) => setNewStudentDept(e.target.value)}
                            placeholder="Computer Science"
                            className="input-theme theme-transition"
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              borderRadius: "10px",
                              border: "1px solid var(--border-color)",
                              background: "var(--card-bg)",
                              color: "var(--text-primary)",
                              fontSize: "14px",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowStudentForm(false);
                            setNewStudentEmail("");
                            setNewStudentPassword("");
                            setNewStudentName("");
                            setNewStudentReg("");
                            setNewStudentDept("");
                            setStudentUploadError("");
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
                        <button
                          type="button"
                          onClick={handleAddStudent}
                          className="theme-transition"
                          style={{
                            padding: "10px 20px",
                            borderRadius: "8px",
                            border: "none",
                            background: "var(--accent-color)",
                            color: "white",
                            fontSize: "14px",
                            fontWeight: 600,
                            cursor: "pointer",
                            flex: 1,
                          }}
                        >
                          Add Student
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Students List */}
                  {students.length > 0 && (
                    <div
                      style={{
                        marginBottom: "16px",
                        border: "1px solid var(--border-color)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        background: "var(--card-bg)",
                      }}
                    >
                      <div
                        style={{
                          padding: "12px 16px",
                          background: "var(--secondary-bg)",
                          borderBottom: "1px solid var(--border-color)",
                          fontWeight: 600,
                          fontSize: "14px",
                          color: "var(--text-primary)",
                          display: "grid",
                          gridTemplateColumns: "1.5fr 2fr 1fr 1.5fr 1.5fr auto",
                          gap: "12px",
                        }}
                      >
                        <div>Name</div>
                        <div>Email</div>
                        <div>Password</div>
                        <div>Reg No</div>
                        <div>Department</div>
                        <div>Action</div>
                      </div>
                      {students.map((student, index) => (
                        <div
                          key={index}
                          style={{
                            padding: "12px 16px",
                            borderBottom:
                              index < students.length - 1
                                ? "1px solid var(--border-color)"
                                : "none",
                            display: "grid",
                            gridTemplateColumns: "1.5fr 2fr 1fr 1.5fr 1.5fr auto",
                            gap: "12px",
                            alignItems: "center",
                            fontSize: "14px",
                            color: "var(--text-primary)",
                          }}
                        >
                          <div>{student.name || "-"}</div>
                          <div>{student.email}</div>
                          <div style={{ fontFamily: "monospace" }}>
                            {student.password}
                          </div>
                          <div>{student.reg || "-"}</div>
                          <div>{student.dept || "-"}</div>
                          <button
                            onClick={() => handleDeleteStudent(student.email)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              border: "1px solid var(--danger-color)",
                              background: "transparent",
                              color: "var(--danger-color)",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {students.length === 0 && !showStudentForm && (
                    <div
                      className="theme-transition"
                      style={{
                        textAlign: "center",
                        padding: "40px 20px",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                      }}
                    >
                      No students added yet. Add students manually or upload from Excel/CSV.
                    </div>
                  )}

                  {/* Add Student Buttons */}
                  {!showStudentForm && (
                    <div style={{ display: "flex", gap: "12px" }}>
                      <label
                        htmlFor="student-file-upload"
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
                          textAlign: "center",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <FileSpreadsheet size={16} /> Upload Excel/CSV
                      </label>
                      <input
                        id="student-file-upload"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleStudentFileUpload}
                        style={{ display: "none" }}
                      />
                      <button
                        type="button"
                        onClick={downloadStudentsTemplate}
                        className="theme-transition"
                        style={{
                          padding: "12px 20px",
                          borderRadius: 10,
                          border: "1px solid var(--border-color)",
                          background: "var(--secondary-bg)",
                          color: "var(--text-primary)",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        📥 Download Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStudentForm(true)}
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

                {/* Info Box */}
                <div
                  style={{
                    padding: "16px",
                    background: "var(--secondary-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <Mail size={20} color="var(--accent-color)" />
                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          margin: "0 0 8px 0",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Student Accounts & Notifications
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          lineHeight: "1.6",
                        }}
                      >
                        When you create the exam, accounts will be automatically created for students who don't exist. 
                        Each student will receive an email notification with:
                      </p>
                      <ul
                        style={{
                          margin: "8px 0 0 0",
                          paddingLeft: "20px",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <li>Exam name and schedule (start time & end time)</li>
                        <li>Their login credentials (email & password)</li>
                        <li>Exam key to join the exam</li>
                        <li>Duration and important instructions</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "24px",
                  }}
                >
                  <button
                    onClick={handleBackToSettings}
                    className={`${styles.btn} ${styles.btnGhost} theme-transition`}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ← Back to Settings
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={students.length === 0}
                    className={`${styles.btn} ${styles.btnPrimary} theme-transition`}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: students.length === 0 ? "not-allowed" : "pointer",
                      opacity: students.length === 0 ? 0.6 : 1,
                    }}
                  >
                    Preview & Create Exam <ArrowRight size={18} />
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
