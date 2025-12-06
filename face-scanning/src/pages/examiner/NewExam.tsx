import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import MCQQuestionEditor from "../../components/exam/MCQQuestionEditor";
import MCQQuestionList from "../../components/exam/MCQQuestionList";
import QuestionTableEditor from "../../components/exam/QuestionTableEditor";
import { MCQQuestion } from "../../types/mcq";
import { ThemeToggle } from "../../components/ThemeToggle";
import { ExaminerGuard } from "@/components/guards";
import * as XLSX from 'xlsx';
import { downloadQuestionsTemplate, downloadStudentsTemplate, parseSpreadsheetFile } from "@/utils/excelUtils";
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
  PenLine,
  Trash2
} from "lucide-react";

interface Student {
  email: string;
  password: string;
  name: string;
  reg: string;
  dept: string;
}

// Toggle Component - Defined outside to prevent re-renders
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

// CollapsibleSection Component - Defined outside to prevent re-renders
const CollapsibleSection = React.memo(({
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
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
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
));

CollapsibleSection.displayName = 'CollapsibleSection';

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
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showAddOptionsPopup, setShowAddOptionsPopup] = useState(false);
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

    // Cleanup function to prevent memory leaks
    return () => {
      // Clear any pending timeouts or intervals if needed
    };
  }, []);

  // Student management handlers
  const handleAddStudent = () => {
    try {
      // Clear any previous errors
      setStudentUploadError("");

      // Validation - ALL fields are mandatory
      if (!newStudentEmail.trim()) {
        setStudentUploadError("Email is required");
        return;
      }

      if (!newStudentPassword.trim()) {
        setStudentUploadError("Password is required");
        return;
      }

      if (!newStudentName.trim()) {
        setStudentUploadError("Name is required");
        return;
      }

      if (!newStudentReg.trim()) {
        setStudentUploadError("Registration number is required");
        return;
      }

      if (!newStudentDept.trim()) {
        setStudentUploadError("Department is required");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newStudentEmail.trim())) {
        setStudentUploadError("Invalid email format");
        return;
      }

      if (students.some(s => s.email.toLowerCase() === newStudentEmail.trim().toLowerCase())) {
        setStudentUploadError("Student with this email already added");
        return;
      }

      // Add student with all mandatory fields
      setStudents(prev => [...prev, {
        email: newStudentEmail.trim(),
        password: newStudentPassword.trim(),
        name: newStudentName.trim(),
        reg: newStudentReg.trim(),
        dept: newStudentDept.trim()
      }]);

      // Reset form
      setNewStudentEmail("");
      setNewStudentPassword("");
      setNewStudentName("");
      setNewStudentReg("");
      setNewStudentDept("");
      setStudentUploadError("");
      setShowStudentForm(false);
    } catch (error) {
      console.error("Error adding student:", error);
      setStudentUploadError("An error occurred while adding the student. Please try again.");
    }
  };

  const handleDeleteStudent = (email: string) => {
    try {
      setStudents(prev => prev.filter(s => s.email !== email));
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  const handleStudentFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
        setStudentUploadError('Please upload a valid Excel (.xlsx, .xls) or CSV file');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();
      
      reader.onerror = () => {
        console.error('Error reading file');
        setStudentUploadError('Error reading file. Please try again.');
        event.target.value = '';
      };

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            setStudentUploadError('No data found in file');
            event.target.value = '';
            return;
          }

          const workbook = XLSX.read(data, { type: 'binary' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            setStudentUploadError('No sheets found in file');
            event.target.value = '';
            return;
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (jsonData.length === 0) {
            setStudentUploadError('No data found in file');
            event.target.value = '';
            return;
          }

          const extractedStudents: Student[] = [];
          const errors: string[] = [];
          
          jsonData.forEach((row, index) => {
            try {
              const email = row['Email'] || row['email'];
              const password = row['Password'] || row['password'];
              const name = row['Name'] || row['name'];
              const reg = row['Registration Number'] || row['Reg'] || row['reg'] || row['registration'] || row['Registration'];
              const dept = row['Department'] || row['Dept'] || row['dept'] || row['department'];

              // Validate ALL mandatory fields
              if (!email || !email.trim()) {
                errors.push(`Row ${index + 2}: Email is required`);
                return;
              }

              if (!password || !password.trim()) {
                errors.push(`Row ${index + 2}: Password is required`);
                return;
              }

              if (!name || !name.trim()) {
                errors.push(`Row ${index + 2}: Name is required`);
                return;
              }

              if (!reg || !reg.trim()) {
                errors.push(`Row ${index + 2}: Registration number is required`);
                return;
              }

              if (!dept || !dept.trim()) {
                errors.push(`Row ${index + 2}: Department is required`);
                return;
              }

              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email.trim())) {
                errors.push(`Row ${index + 2}: Invalid email format`);
                return;
              }

              // Check for duplicates in current students
              if (students.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) {
                errors.push(`Row ${index + 2}: Email already exists`);
                return;
              }

              // Check for duplicates in extracted students
              if (extractedStudents.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) {
                errors.push(`Row ${index + 2}: Duplicate email in file`);
                return;
              }

              extractedStudents.push({
                email: email.trim(),
                password: password.trim(),
                name: name.trim(),
                reg: reg.trim(),
                dept: dept.trim()
              });
            } catch (rowError) {
              console.error(`Error processing row ${index + 2}:`, rowError);
              errors.push(`Row ${index + 2}: Error processing row`);
            }
          });

          if (errors.length > 0) {
            console.warn('File upload errors:', errors);
            // Show first few errors to user
            const errorSummary = errors.slice(0, 3).join('\n');
            const remainingErrors = errors.length > 3 ? `\n... and ${errors.length - 3} more errors` : '';
            setStudentUploadError(`Found ${errors.length} error(s) in file:\n${errorSummary}${remainingErrors}`);
          }

          if (extractedStudents.length === 0) {
            setStudentUploadError('No valid students found. Please ensure all mandatory fields are filled: Email, Password, Name, Registration Number, and Department.');
            event.target.value = '';
            return;
          }

          setStudents(prev => [...prev, ...extractedStudents]);
          
          // Clear error only if all students were added successfully
          if (errors.length === 0) {
            setStudentUploadError('');
          }
          
          event.target.value = '';
          
          // Show success message
          if (errors.length > 0 && extractedStudents.length > 0) {
            console.log(`Successfully added ${extractedStudents.length} students. ${errors.length} rows had errors.`);
            // Keep the error message visible to show which rows failed
          } else if (extractedStudents.length > 0) {
            console.log(`Successfully added ${extractedStudents.length} students.`);
          }
        } catch (parseError) {
          console.error('Error parsing file:', parseError);
          setStudentUploadError('Error parsing file. Please check the format.');
          event.target.value = '';
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error handling file upload:', error);
      setStudentUploadError('An unexpected error occurred. Please try again.');
      event.target.value = '';
    }
  };

  const downloadStudentsTemplate = () => {
    try {
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
        },
        {
          'Email': 'student3@example.com',
          'Password': 'password789',
          'Name': 'Bob Wilson',
          'Registration Number': 'REG003',
          'Department': 'Electronics'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      
      worksheet['!cols'] = [
        { wch: 30 }, // Email
        { wch: 15 }, // Password
        { wch: 25 }, // Name
        { wch: 25 }, // Registration Number
        { wch: 30 }  // Department
      ];

      // Add a note in the workbook
      XLSX.utils.book_set_sheet_visibility(workbook, 0, 0); // Make sheet visible
      
      XLSX.writeFile(workbook, 'students_template.xlsx');
    } catch (error) {
      console.error('Error generating template:', error);
      alert('Failed to download template. Please try again.');
    }
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

  const handleDeleteAllQuestions = () => {
    if (window.confirm('Are you sure you want to delete all questions? This action cannot be undone.')) {
      setMcqQuestions([]);
      setShowAddOptionsPopup(false);
    }
  };

  const handleCancelQuestionEditor = () => {
    setShowQuestionEditor(false);
    setEditingQuestion(undefined);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
        setUploadError('Please upload a valid Excel (.xlsx, .xls) or CSV file');
        event.target.value = '';
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => {
        console.error('Error reading file');
        setUploadError('Error reading file. Please try again.');
        event.target.value = '';
      };

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            setUploadError('No data found in file');
            event.target.value = '';
            return;
          }

          const workbook = XLSX.read(data, { type: 'binary' });

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            setUploadError('No sheets found in file');
            event.target.value = '';
            return;
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (jsonData.length === 0) {
            setUploadError('No data found in file');
            event.target.value = '';
            return;
          }

          const extractedQuestions: MCQQuestion[] = [];
          const errors: string[] = [];
          
          jsonData.forEach((row, index) => {
            try {
              const questionText = row['Question'] || row['question'];
              const option1 = row['Option 1'] || row['option1'] || row['Option1'];
              const option2 = row['Option 2'] || row['option2'] || row['Option2'];
              const option3 = row['Option 3'] || row['option3'] || row['Option3'];
              const option4 = row['Option 4'] || row['option4'] || row['Option4'];
              const correctAnswer = (row['Correct Answer'] || row['correctAnswer'] || row['CorrectAnswer'] || '').toString().toUpperCase();

              if (!questionText) {
                errors.push(`Row ${index + 2}: Missing question text`);
                return;
              }

              if (!option1 || !option2) {
                errors.push(`Row ${index + 2}: Insufficient options (at least 2 required)`);
                return;
              }

              if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
                errors.push(`Row ${index + 2}: Invalid correct answer (must be A, B, C, or D)`);
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
              
              if (!correctOption) {
                errors.push(`Row ${index + 2}: Correct answer option not found`);
                return;
              }

              extractedQuestions.push({
                id: `q-${Date.now()}-${index}`,
                question: questionText,
                options: options.map(opt => ({ id: opt.id, text: opt.text })),
                correctOptionId: correctOption.id,
              });
            } catch (rowError) {
              console.error(`Error processing row ${index + 2}:`, rowError);
              errors.push(`Row ${index + 2}: Error processing row`);
            }
          });

          if (errors.length > 0) {
            console.warn('File upload errors:', errors);
          }

          if (extractedQuestions.length === 0) {
            setUploadError('No valid questions found. Please check the format.');
            event.target.value = '';
            return;
          }

          setMcqQuestions((prev) => [...prev, ...extractedQuestions]);
          setShowFileUploader(false);
          setUploadError('');
          
          // Reset file input
          event.target.value = '';

          // Show success message if there were some errors
          if (errors.length > 0 && extractedQuestions.length > 0) {
            console.log(`Successfully added ${extractedQuestions.length} questions. ${errors.length} rows had errors.`);
          }
        } catch (parseError) {
          console.error('Error parsing file:', parseError);
          setUploadError('Error parsing file. Please check the format.');
          event.target.value = '';
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error handling file upload:', error);
      setUploadError('An unexpected error occurred. Please try again.');
      event.target.value = '';
    }
  };

  const downloadSampleTemplate = () => {
    try {
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
    } catch (error) {
      console.error('Error generating template:', error);
      alert('Failed to download template. Please try again.');
    }
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
    try {
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
    } catch (error) {
      console.error("Error submitting exam data:", error);
      alert("An error occurred while preparing exam data. Please try again.");
    }
  };

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
            padding: "32px 40px",
            maxWidth: "1400px",
            margin: "0 auto",
            width: "100%",
            boxSizing: "border-box",  
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
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "380px 1fr",  // ✅ Reduced from 420px to 380px
                gap: "24px",  // ✅ Reduced gap from 28px to 24px
                alignItems: "start",
                maxWidth: "100%",  // ✅ Ensure container doesn't overflow
              }}>
                {/* Left Column - Exam Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Exam Name Card */}
                  <div
                    className="theme-transition"
                    style={{
                      background: "var(--card-bg)",
                      borderRadius: "14px",
                      padding: "24px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                      <div style={{ 
                        width: "40px", 
                        height: "40px", 
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <FileText size={22} color="#0ea5e9" />
                      </div>
                      <span style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>
                        Exam Name
                      </span>
                    </div>
                    <input
                      type="text"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      placeholder="e.g., Midterm Math Exam"
                      className="input-theme theme-transition"
                      style={{
                        width: "100%",
                        padding: "14px 16px",
                        borderRadius: "10px",
                        fontSize: "15px",
                        outline: "none",
                        border: "1px solid var(--border-color)",
                        background: "var(--secondary-bg)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  {/* Schedule & Timing Card */}
                  <div
                    className="theme-transition"
                    style={{
                      background: "var(--card-bg)",
                      borderRadius: "14px",
                      padding: "24px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                      <div style={{ 
                        width: "40px", 
                        height: "40px", 
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <Calendar size={22} color="#0ea5e9" />
                      </div>
                      <span style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>
                        Schedule & Timing
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                      {/* Start Date & Time */}
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500 }}>
                          Start Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="input-theme theme-transition"
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid var(--border-color)",
                            background: "var(--secondary-bg)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      {/* End Date & Time */}
                      <div>
                        <label style={{ display: "block", marginBottom: "8px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500 }}>
                          End Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="input-theme theme-transition"
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: "10px",
                            border: "1px solid var(--border-color)",
                            background: "var(--secondary-bg)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      {/* Exam Duration */}
                      <div>
                        <label style={{ display: "block", marginBottom: "10px", color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500 }}>
                          Exam Duration
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", marginBottom: "6px", color: "var(--text-tertiary)", fontSize: "13px" }}>Hours</label>
                            <input
                              type="number"
                              min="0"
                              value={Math.floor(Number(duration || 0) / 60)}
                              onChange={(e) => {
                                const h = Math.max(0, parseInt(e.target.value) || 0);
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
                          <span style={{ color: "var(--text-tertiary)", fontWeight: "bold", paddingTop: "22px", fontSize: "20px" }}>:</span>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", marginBottom: "6px", color: "var(--text-tertiary)", fontSize: "13px" }}>Minutes</label>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={Number(duration || 0) % 60}
                              onChange={(e) => {
                                const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
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
                          {/* Total Duration Box */}
                          <div
                            style={{
                              flex: 1.3,
                              padding: "12px 14px",
                              background: "linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(14, 165, 233, 0.05) 100%)",
                              borderRadius: "12px",
                              border: "1px solid rgba(14, 165, 233, 0.25)",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              marginTop: "20px",
                            }}
                          >
                            <Timer size={22} color="#0ea5e9" />
                            <div>
                              <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Total Duration</div>
                              <div style={{ fontSize: "20px", fontWeight: 700, color: "#0ea5e9" }}>{duration || 0}</div>
                              <div style={{ fontSize: "12px", color: "#0ea5e9" }}>minutes</div>
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
                    borderRadius: "14px",
                    padding: "28px",
                    border: "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "600px",
                    overflow: "hidden",  // ✅ Prevent content from overflowing
                    maxWidth: "100%",    // ✅ Ensure it doesn't exceed container
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ 
                        width: "40px", 
                        height: "40px", 
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        <HelpCircle size={22} color="#0ea5e9" />
                      </div>
                      <div>
                        <span style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}>Exam Questions</span>
                        <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          {mcqQuestions.length} questions • Click cells to edit directly
                        </div>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    {mcqQuestions.length > 0 && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          onClick={() => setShowAddOptionsPopup(true)}
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
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <Plus size={16} /> Add More
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div style={{ 
                    flex: 1, 
                    display: "flex", 
                    flexDirection: "column", 
                    minHeight: 0,
                    overflow: "hidden",  // ✅ Prevent overflow in content area
                  }}>
                  {showQuestionEditor && (
                    <MCQQuestionEditor
                      onSave={handleAddQuestion}
                      onCancel={handleCancelQuestionEditor}
                      initialQuestion={editingQuestion}
                    />
                  )}

                  {!showQuestionEditor && mcqQuestions.length > 0 && (
                    <div style={{ 
                      width: "100%",  // ✅ Ensure table container uses full width
                      overflow: "auto",  // ✅ Allow scroll if needed
                    }}>
                      <QuestionTableEditor
                        questions={mcqQuestions}
                        onUpdate={(updatedQuestions) => setMcqQuestions(updatedQuestions)}
                        onDelete={handleDeleteQuestion}
                      />
                    </div>
                    )}

                  {!showQuestionEditor && mcqQuestions.length === 0 && (
                      <div
                        className="theme-transition"
                        style={{
                          textAlign: "center",
                          padding: "60px 20px",
                          color: "var(--text-secondary)",
                          fontSize: "15px",
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--secondary-bg)",
                          borderRadius: "12px",
                          border: "2px dashed var(--border-color)",
                        }}
                      >
                        <FileSpreadsheet size={48} color="var(--text-tertiary)" strokeWidth={1.5} style={{ marginBottom: "16px" }} />
                        <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "var(--text-primary)" }}>No questions added yet</p>
                        <p style={{ margin: "0 0 24px 0", fontSize: "14px" }}>Upload an Excel/CSV file or add questions manually</p>
                        <div style={{ display: "flex", gap: "12px" }}>
                          <button
                            type="button"
                            onClick={() => setShowUploadPopup(true)}
                            className="theme-transition"
                            style={{
                              padding: "12px 24px",
                              borderRadius: 10,
                              border: "none",
                              background: "var(--accent-color)",
                              color: "white",
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Upload size={18} /> Upload Excel/CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowQuestionEditor(true)}
                            className="theme-transition"
                            style={{
                              padding: "12px 24px",
                              borderRadius: 10,
                              border: "1px solid var(--border-color)",
                              background: "var(--card-bg)",
                              color: "var(--text-primary)",
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <PenLine size={18} /> Add Manually
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons - Full Width */}
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    gap: "16px",
                    marginTop: "40px",
                    paddingTop: "32px",
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
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => {
            setShowUploadPopup(false);
            setUploadError('');
          }}
        >
          <div
            className="theme-transition"
            style={{
              background: "var(--card-bg)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "85vh",
              overflow: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
                <FileSpreadsheet size={24} color="#0ea5e9" />
                Upload Excel/CSV File
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowUploadPopup(false);
                  setUploadError('');
                }}
                style={{
                  background: "var(--secondary-bg)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>

            <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "var(--text-secondary)" }}>
              Upload an Excel (.xlsx, .xls) or CSV file with your questions. Download the sample template to see the required format.
            </p>

            {/* Download Template Button */}
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="theme-transition"
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)",
                color: "white",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
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
                  fontSize: "14px",
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
                transition: "all 0.2s ease",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.background = "rgba(14, 165, 233, 0.1)";
                e.currentTarget.style.borderColor = "#0ea5e9";
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
                    setShowUploadPopup(false);
                  }
                }
              }}
            >
              <input
                id="popup-file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  handleFileUpload(e);
                  if (!uploadError) {
                    setShowUploadPopup(false);
                  }
                }}
                style={{ display: "none" }}
              />
              <label htmlFor="popup-file-upload" style={{ cursor: "pointer", display: "block" }}>
                <FolderOpen size={56} color="var(--accent-color)" strokeWidth={1.5} style={{ marginBottom: "16px" }} />
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

      {/* Add More Questions Popup Modal */}
      {showAddOptionsPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowAddOptionsPopup(false)}
        >
          <div
            className="theme-transition"
            style={{
              background: "var(--card-bg)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "var(--text-primary)" }}>
                Add More Questions
              </h3>
              <button
                type="button"
                onClick={() => setShowAddOptionsPopup(false)}
                style={{
                  background: "var(--secondary-bg)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Upload Excel Option */}
              <button
                type="button"
                onClick={() => {
                  setShowAddOptionsPopup(false);
                  setShowUploadPopup(true);
                }}
                className="theme-transition"
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  background: "var(--secondary-bg)",
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(14, 165, 233, 0.1)";
                  e.currentTarget.style.borderColor = "#0ea5e9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              >
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Upload size={22} color="#0ea5e9" />
                </div>
                <div>
                  <div>Upload Excel/CSV</div>
                  <div style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-secondary)", marginTop: "2px" }}>
                    Import questions from a spreadsheet
                  </div>
                </div>
              </button>

              {/* Add Manually Option */}
              <button
                type="button"
                onClick={() => {
                  setShowAddOptionsPopup(false);
                  setShowQuestionEditor(true);
                }}
                className="theme-transition"
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  background: "var(--secondary-bg)",
                  color: "var(--text-primary)",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(34, 197, 94, 0.1)";
                  e.currentTarget.style.borderColor = "#22c55e";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              >
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <PenLine size={22} color="#22c55e" />
                </div>
                <div>
                  <div>Add Manually</div>
                  <div style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-secondary)", marginTop: "2px" }}>
                    Create a new question from scratch
                  </div>
                </div>
              </button>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--border-color)", margin: "8px 0" }} />

              {/* Delete All Option */}
              <button
                type="button"
                onClick={handleDeleteAllQuestions}
                className="theme-transition"
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  background: "rgba(239, 68, 68, 0.05)",
                  color: "#ef4444",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                  e.currentTarget.style.borderColor = "#ef4444";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.05)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                }}
              >
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Trash2 size={22} color="#ef4444" />
                </div>
                <div>
                  <div>Delete All Questions</div>
                  <div style={{ fontSize: "12px", fontWeight: 400, color: "var(--text-secondary)", marginTop: "2px" }}>
                    Remove all {mcqQuestions.length} questions
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </ExaminerGuard>
  );
};

export default NewExam;
