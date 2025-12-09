import React, { useState } from "react";
import { Exam } from "../../types/exam";
import styles from "./ExamCard.module.css";
import { getTokenFromCookie } from "../../constants/AuthStore";
import { Copy, Check, Pencil, Clock, Monitor, UserPlus, Mail, X, Upload, Download, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import axios from "axios";

interface Props {
  exam: Exam;
  formatRange: (s?: string, e?: string) => string;
  onViewDetails?: (exam: Exam) => void;
  onEdit?: (exam: Exam) => void;
  onManage?: (exam: Exam) => void;
  onViewResults?: (exam: Exam) => void;
  onDelete?: (examId: number) => void;
  viewMode?: 'grid' | 'list';
}

const ExamCard: React.FC<Props> = ({
  exam,
  formatRange,
  onViewDetails,
  onEdit,
  onManage,
  onViewResults,
  onDelete,
  viewMode = 'grid',
}) => {
  const [copied, setCopied] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [isLoadingExamDetails, setIsLoadingExamDetails] = useState(false);
  const [showAddStudentsModal, setShowAddStudentsModal] = useState(false);
  const [newStudents, setNewStudents] = useState<Array<{email: string; password: string; name: string; reg: string; dept: string}>>([]);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentReg, setNewStudentReg] = useState("");
  const [newStudentDept, setNewStudentDept] = useState("");
  const [studentUploadError, setStudentUploadError] = useState("");
  const [isSendingInvitations, setIsSendingInvitations] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    startTime: '',
    endTime: '',
    durationMinutes: 0,
    // Normal Proctoring
    controlDesktopApps: false,
    screenCountDetection: false,
    safeBrowser: false,
    tabSwitchDetection: false,
    microphoneDetection: false,
    normalProctoring: true,
    // AI Powered Proctoring
    thirdEye: true,
    multiPerson: true,
    eyeBall: true,
    objectDetect: true,
    headDirection: true,
    faceAuthentication: true,
    aiPoweredProctoring: true,
    // Recorded Manual Proctoring
    flagNotifications: true,
    videoRecording: true,
    proctorFeedToTestTaker: true,
    screenSharing: true,
    recordedManualProctoring: true,
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [useDuration, setUseDuration] = useState(false);

  // Handle different property names flexibly
  const examName =
    (exam as any).exam_name || (exam as any).name || "Untitled Exam";
  const createdAt =
    (exam as any).crparticeated_at || (exam as any).createdAt || new Date();
  const startTime = (exam as any).start_time || (exam as any).startTime;
  const endTime = (exam as any).end_time || (exam as any).endTime;
  const rawStatus = (exam as any).status || "draft";
  const examKey =
    (exam as any).key || (exam as any).exam_key || (exam as any).id;
  const attendees = (exam as any).Attends || (exam as any).attendances || [];
  const participantCount = (exam as any).participants || attendees.length || 0;

  // Determine display status
  const now = new Date();
  const isSuspended = rawStatus === "suspended";
  const isExpired = endTime && new Date(endTime) < now;
  const isFuture =
    !isSuspended && !isExpired && startTime && new Date(startTime) > now;

  let displayStatus = rawStatus;
  if (isSuspended || (rawStatus === "active" && isExpired)) {
    displayStatus = "suspended";
  } else if (isFuture) {
    displayStatus = "future";
  } else if (rawStatus === "active") {
    displayStatus = "active";
  }

  // Theme-aware status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "var(--success-color)";
      case "future":
        return "var(--info-color)";
      case "suspended":
        return "var(--error-color)";
      case "draft":
        return "var(--warning-color)";
      case "completed":
        return "var(--text-secondary)";
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
      case "future":
        return "var(--info-bg)";
      case "suspended":
        return "var(--error-bg)";
      case "draft":
        return "var(--warning-bg)";
      case "completed":
        return "var(--card-bg)";
      case "cancelled":
        return "var(--error-bg)";
      default:
        return "var(--card-bg)";
    }
  };

  const copyToClipboard = async () => {
    if (examKey) {
      try {
        await navigator.clipboard.writeText(examKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy: ", err);
      }
    }
  };

  const openEditDetailsModal = async () => {
    try {
      setIsLoadingExamDetails(true);
      // Fetch complete exam details from backend
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const token = getTokenFromCookie();
      
      const response = await fetch(`${baseUrl}/exam/${exam.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch exam details');
      }
      
      const data = await response.json();
      const fullExam = data.exam;
      
      // Format dates for datetime-local input
      const formatForInput = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      const examStartTime = fullExam.start_time || fullExam.startTime;
      const examEndTime = fullExam.end_time || fullExam.endTime;

      // Calculate duration if both times exist
      let durationMins = 0;
      if (examStartTime && examEndTime) {
        const start = new Date(examStartTime);
        const end = new Date(examEndTime);
        durationMins = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
      }

      setEditFormData({
        name: fullExam.exam_name || examName,
        startTime: formatForInput(examStartTime),
        endTime: formatForInput(examEndTime),
        durationMinutes: durationMins > 0 ? durationMins : (fullExam.duration || 60),
        // Normal Proctoring - use actual values from database
        controlDesktopApps: fullExam.control_desktop_apps_enabled || false,
        screenCountDetection: fullExam.screen_count_detection_enabled || false,
        safeBrowser: fullExam.safe_browser_enabled || false,
        tabSwitchDetection: fullExam.tab_switch_detection_enabled || false,
        microphoneDetection: fullExam.microphone_detection_enabled || false,
        normalProctoring: fullExam.normal_proctoring || false,
        // AI Powered Proctoring - use actual values from database
        thirdEye: fullExam.third_eye_enabled || false,
        multiPerson: fullExam.multiple_person_detection_enabled || false,
        eyeBall: fullExam.eyeball_detection_enabled || false,
        objectDetect: fullExam.object_detection_enabled || false,
        headDirection: fullExam.head_direction_enabled || false,
        faceAuthentication: fullExam.face_authentication_enabled || false,
        aiPoweredProctoring: fullExam.ai_powered_proctoring || false,
        // Recorded Manual Proctoring - use actual values from database
        flagNotifications: fullExam.flag_notifications_enabled || false,
        videoRecording: fullExam.video_recording_enabled || false,
        proctorFeedToTestTaker: fullExam.proctor_feed_to_test_taker_enabled || false,
        screenSharing: fullExam.screen_sharing_enabled || false,
        recordedManualProctoring: fullExam.recorded_manual_proctoring || false,
      });
      setUseDuration(false);
      setShowEditDetailsModal(true);
    } catch (error) {
      console.error('Error fetching exam details:', error);
      alert('Failed to load exam details. Please try again.');
    } finally {
      setIsLoadingExamDetails(false);
    }
  };

  const handleSaveExamDetails = async () => {
    if (!editFormData.name.trim()) {
      alert('Exam name is required');
      return;
    }

    // Validate based on mode
    if (useDuration) {
      if (editFormData.durationMinutes <= 0) {
        alert('Duration must be greater than 0');
        return;
      }
    } else {
      if (editFormData.startTime && editFormData.endTime) {
        const start = new Date(editFormData.startTime);
        const end = new Date(editFormData.endTime);
        if (end <= start) {
          alert('End time must be after start time');
          return;
        }
      }
    }

    try {
      setIsSavingDetails(true);
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      const token = getTokenFromCookie('authToken');

      if (!baseUrl) {
        alert('Backend URL not configured');
        console.error('NEXT_PUBLIC_BACKEND_URL is not set');
        return;
      }

      if (!token) {
        alert('You are not logged in. Please login first.');
        console.error('Auth token not found in cookies');
        return;
      }

      const payload: any = {
        exam_name: editFormData.name,
        // Normal Proctoring
        controlDesktopApps: editFormData.controlDesktopApps,
        screenCountDetection: editFormData.screenCountDetection,
        safeBrowser: editFormData.safeBrowser,
        tabSwitchDetection: editFormData.tabSwitchDetection,
        microphoneDetection: editFormData.microphoneDetection,
        normalProctoring: editFormData.normalProctoring,
        // AI Powered Proctoring
        thirdEye: editFormData.thirdEye,
        multiPerson: editFormData.multiPerson,
        eyeBall: editFormData.eyeBall,
        objectDetect: editFormData.objectDetect,
        headDirection: editFormData.headDirection,
        faceAuthentication: editFormData.faceAuthentication,
        aiPoweredProctoring: editFormData.aiPoweredProctoring,
        // Recorded Manual Proctoring
        flagNotifications: editFormData.flagNotifications,
        videoRecording: editFormData.videoRecording,
        proctorFeedToTestTaker: editFormData.proctorFeedToTestTaker,
        screenSharing: editFormData.screenSharing,
        recordedManualProctoring: editFormData.recordedManualProctoring,
      };

      if (useDuration) {
        // Use duration mode
        payload.durationMinutes = editFormData.durationMinutes;
      } else {
        // Use start/end time mode
        if (editFormData.startTime) {
          payload.startTime = new Date(editFormData.startTime).toISOString();
        }
        if (editFormData.endTime) {
          payload.endTime = new Date(editFormData.endTime).toISOString();
        }
      }

      console.log('📤 Sending update request:', {
        url: `${baseUrl}/exam/${exam.id}`,
        payload
      });

      const response = await fetch(`${baseUrl}/exam/${exam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Server error:', errorData);
        throw new Error(errorData.message || 'Failed to update exam details');
      }

      alert('Exam details updated successfully!');
      setShowEditDetailsModal(false);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating exam details:', error);
      alert('Failed to update exam details. Please try again.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const calculateDuration = () => {
    if (useDuration) {
      const hours = Math.floor(editFormData.durationMinutes / 60);
      const minutes = editFormData.durationMinutes % 60;
      return `${hours}h ${minutes}m`;
    } else {
      if (!editFormData.startTime || !editFormData.endTime) return '';
      const start = new Date(editFormData.startTime);
      const end = new Date(editFormData.endTime);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs <= 0) return 'Invalid';
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
  };

  // Add Students Modal Handlers
  const handleAddStudent = () => {
    setStudentUploadError("");

    // Validate all mandatory fields
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

    if (newStudents.some(s => s.email.toLowerCase() === newStudentEmail.trim().toLowerCase())) {
      setStudentUploadError("Student with this email already added");
      return;
    }

    setNewStudents(prev => [...prev, {
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
  };

  const handleDeleteStudent = (email: string) => {
    setNewStudents(prev => prev.filter(s => s.email !== email));
  };

  const handleStudentFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      setStudentUploadError('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    
    reader.onerror = () => {
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
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          setStudentUploadError('No data found in file');
          event.target.value = '';
          return;
        }

        const extractedStudents: typeof newStudents = [];
        const errors: string[] = [];
        
        jsonData.forEach((row, index) => {
          const email = row['Email'] || row['email'];
          const password = row['Password'] || row['password'];
          const name = row['Name'] || row['name'];
          const reg = row['Registration Number'] || row['Reg'] || row['reg'];
          const dept = row['Department'] || row['Dept'] || row['dept'];

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

          if (newStudents.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) {
            errors.push(`Row ${index + 2}: Email already exists`);
            return;
          }

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
        });

        if (errors.length > 0) {
          const errorSummary = errors.slice(0, 3).join('\n');
          const remainingErrors = errors.length > 3 ? `\n... and ${errors.length - 3} more errors` : '';
          setStudentUploadError(`Found ${errors.length} error(s):\n${errorSummary}${remainingErrors}`);
        }

        if (extractedStudents.length === 0) {
          setStudentUploadError('No valid students found. All fields are mandatory.');
          event.target.value = '';
          return;
        }

        setNewStudents(prev => [...prev, ...extractedStudents]);
        
        if (errors.length === 0) {
          setStudentUploadError('');
        }
        
        event.target.value = '';
      } catch (parseError) {
        setStudentUploadError('Error parsing file. Please check the format.');
        event.target.value = '';
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
      { wch: 30 },
      { wch: 15 },
      { wch: 25 },
      { wch: 25 },
      { wch: 30 }
    ];

    XLSX.writeFile(workbook, 'students_template.xlsx');
  };

  const handleSendInvitations = async () => {
    if (newStudents.length === 0) {
      alert('Please add at least one student');
      return;
    }

    setIsSendingInvitations(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.post(
        `${base}/exam/${exam.id}/invite-students`,
        {
          examId: exam.id,
          students: newStudents,
        },
        {
          headers: {
            Authorization: `Bearer ${getTokenFromCookie()}`,
          },
        }
      );

      if (response.data.success) {
        const { results } = response.data;
        let message = `Successfully invited ${results.successful}/${results.total} students!\n`;
        
        if (results.failed > 0) {
          message += `\nFailed: ${results.failed}`;
        }
        
        if (results.emailsFailed > 0) {
          message += `\n\nEmail delivery failed for ${results.emailsFailed} student(s). Accounts were created but emails could not be sent.`;
        }

        alert(message);
        setShowAddStudentsModal(false);
        setNewStudents([]);
        setStudentUploadError('');
      } else {
        alert('Failed to invite students. Please try again.');
      }
    } catch (error: any) {
      console.error('Error inviting students:', error);
      alert(
        `Failed to invite students:\n${
          error?.response?.data?.message || error.message
        }`
      );
    } finally {
      setIsSendingInvitations(false);
    }
  };

  const StudentsModal = () => {
    if (!showStudentsModal) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "var(--overlay-bg)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
        onClick={() => setShowStudentsModal(false)}
      >
        <div
          style={{
            background: "var(--modal-bg)",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "500px",
            maxHeight: "80vh",
            overflow: "hidden",
            boxShadow: "0 25px 50px var(--shadow)",
            border: "1px solid var(--border-color)",
            backdropFilter: "blur(20px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div
            style={{
              padding: "24px",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "var(--text-primary)",
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                📚 {examName}
              </h3>
              <p
                style={{
                  margin: "4px 0 0 0",
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                }}
              >
                {attendees.length}{" "}
                {attendees.length === 1 ? "student" : "students"} registered
              </p>
            </div>
            <button
              onClick={() => setShowStudentsModal(false)}
              style={{
                background: "var(--button-bg)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                width: "40px",
                height: "40px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "16px",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: "0", maxHeight: "400px", overflowY: "auto" }}>
            {attendees.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "var(--text-secondary)",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>👥</div>
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    color: "var(--text-secondary)",
                  }}
                >
                  No Students Yet
                </h4>
                <p style={{ margin: 0, fontSize: "14px" }}>
                  Share the exam key{" "}
                  <strong style={{ color: "var(--accent-color)" }}>
                    {examKey}
                  </strong>{" "}
                  with students
                </p>
              </div>
            ) : (
              <div style={{ padding: "8px 0" }}>
                {attendees.map((attendance: any, index: number) => {
                  const student = attendance.User || attendance.user;
                  return (
                    <div
                      key={index}
                      style={{
                        padding: "16px 24px",
                        borderBottom:
                          index < attendees.length - 1
                            ? "1px solid var(--border-color)"
                            : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        transition: "background-color 0.2s",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, var(--accent-color), var(--success-color))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "600",
                          fontSize: "16px",
                          flexShrink: 0,
                        }}
                      >
                        {(student?.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: "500",
                            fontSize: "15px",
                            marginBottom: "2px",
                          }}
                        >
                          {student?.name || "Unknown Student"}
                        </div>
                        <div
                          style={{
                            color: "var(--text-secondary)",
                            fontSize: "13px",
                          }}
                        >
                          {student?.email || "No email available"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // List View
  const listView = (
    <div 
          className={styles.examListItem}
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '12px',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateX(4px)';
            e.currentTarget.style.boxShadow = '0 4px 20px var(--shadow)';
            e.currentTarget.style.borderColor = 'var(--accent-color)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          {/* Status Badge */}
          <div
            style={{
              minWidth: '100px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize',
                color: getStatusColor(displayStatus),
                backgroundColor: getStatusBg(displayStatus),
                border: `1px solid ${getStatusColor(displayStatus)}`,
                whiteSpace: 'nowrap',
              }}
            >
              {displayStatus}
            </span>
          </div>

          {/* Exam Info */}
          <div style={{ flex: 1, minWidth: '0' }}>
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '700',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {examName}
            </h3>
            <div
              style={{
                display: 'flex',
                gap: '20px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Key:</strong>
                <span style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--accent-color)' }}>
                  {examKey}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                  }}
                  title={copied ? "Copied!" : "Copy exam key"}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {participantCount} participants
              </span>
              {(startTime || endTime) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  {formatRange(startTime, endTime)}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexShrink: 0,
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {onViewDetails && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(exam);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--secondary-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-color)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = 'var(--accent-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--secondary-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                title="View exam details"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Details
              </button>
            )}

            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(exam);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--secondary-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--primary-color)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--secondary-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                title="Edit questions"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditDetailsModal();
              }}
              disabled={isLoadingExamDetails}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--secondary-bg)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: isLoadingExamDetails ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                opacity: isLoadingExamDetails ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoadingExamDetails) {
                  e.currentTarget.style.background = 'var(--info-color)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = 'var(--info-color)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoadingExamDetails) {
                  e.currentTarget.style.background = 'var(--secondary-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }
              }}
              title="Edit exam settings"
            >
              {isLoadingExamDetails ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                  ...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m5.5-11.5l-4.2 4.2m0 4.6l4.2 4.2M23 12h-6m-6 0H5m11.5-5.5l-4.2 4.2m0 4.6l4.2 4.2"></path>
                  </svg>
                  Settings
                </>
              )}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAddStudentsModal(true);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--secondary-bg)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-color)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = 'var(--primary-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--secondary-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
              title="Add students and send invitations"
            >
              <UserPlus size={14} />
              Add Students
            </button>

            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(exam.id);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--secondary-bg)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--error-bg)';
                  e.currentTarget.style.color = 'var(--error-color)';
                  e.currentTarget.style.borderColor = 'var(--error-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--secondary-bg)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                title="Delete exam"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      );

  // Grid View (existing card view)
  const gridView = (
    <div className={styles.examCard}>
        {/* Status Badge */}
        <div className={styles.statusContainer}>
          <span
            className={styles.statusBadge}
            style={{
              color: getStatusColor(displayStatus),
              backgroundColor: getStatusBg(displayStatus),
              borderColor: getStatusColor(displayStatus),
            }}
          >
            {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
          </span>
        </div>

        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title} title={examName}>
            {examName}
          </h3>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Exam Key */}
          <div className={styles.infoRow}>
            <span className={styles.label}>Exam Key:</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className={styles.value}>{examKey}</span>
              <button
                onClick={copyToClipboard}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  transition: "all 0.2s ease",
                }}
                title={copied ? "Copied!" : "Copy exam key"}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Participants */}
          <div className={styles.infoRow}>
            <div className={styles.iconText}>
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span
                className={styles.label}
                style={{ cursor: onManage ? "pointer" : "default" }}
                onClick={onManage ? () => onManage(exam) : undefined}
              >
                Participants:
              </span>
            </div>
            <span
              className={styles.participantCount}
              onClick={onManage ? () => onManage(exam) : undefined}
              style={{ cursor: onManage ? "pointer" : "default" }}
              title={
                onManage ? "Click to view participants" : "Participants count"
              }
            >
              {participantCount}
            </span>
          </div>

          {/* Created Date */}
          <div className={styles.infoRow}>
            <div className={styles.iconText}>
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className={styles.label}>Created:</span>
            </div>
            <span className={styles.value}>
              {new Date(createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Time Range */}
          {(startTime || endTime) && (
            <div className={styles.infoRow}>
              <div className={styles.iconText}>
                <svg
                  className={styles.icon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                <span className={styles.label}>Schedule:</span>
              </div>
              <span className={styles.value}>
                {formatRange(startTime, endTime)}
              </span>
            </div>
          )}

          {/* Exam ID */}
          <div className={styles.examId}>
            <span className={styles.idLabel}>ID: {exam.id}</span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {onViewDetails && (
            <button
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(exam);
              }}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              View Details
            </button>
          )}

          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onManage) {
                onManage(exam);
              }
            }}
          >
            <svg
              className={styles.buttonIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Manage
          </button>

          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={(e) => {
              e.stopPropagation();
              openEditDetailsModal();
            }}
            disabled={isLoadingExamDetails}
            title="Edit exam details (name, time, duration)"
            style={{ opacity: isLoadingExamDetails ? 0.6 : 1 }}
          >
            {isLoadingExamDetails ? (
              <>
                <svg
                  className={styles.buttonIcon}
                  style={{ animation: 'spin 1s linear infinite' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <svg
                  className={styles.buttonIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Details
              </>
            )}
          </button>

          {onEdit && (
            <button
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(exam);
              }}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Edit Questions
            </button>
          )}

          {onViewResults && (
            <button
              className={`${styles.button} ${styles.resultsButton}`}
              onClick={(e) => {
                e.stopPropagation();
                onViewResults(exam);
              }}
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              View Results
            </button>
          )}

          {onDelete && (
            <button
              className={`${styles.button} ${styles.deleteButton}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(exam.id);
              }}
              title="Delete exam"
            >
              <svg
                className={styles.buttonIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>
  );

  // Render the appropriate view
  return (
    <>
      {viewMode === 'list' ? listView : gridView}

      <StudentsModal />

      {/* Edit Exam Details Modal */}
      {showEditDetailsModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "var(--overlay-bg)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowEditDetailsModal(false)}
        >
          <div
            style={{
              background: "var(--modal-bg)",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflow: "hidden",
              boxShadow: "0 25px 50px var(--shadow)",
              border: "1px solid var(--border-color)",
              backdropFilter: "blur(20px)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: "var(--text-primary)",
                    fontSize: "20px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Pencil size={20} /> Edit Exam Details
                </h3>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  Update exam name, start time, end time, and duration
                </p>
              </div>
              <button
                onClick={() => setShowEditDetailsModal(false)}
                disabled={isSavingDetails}
                style={{
                  background: "var(--button-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  width: "40px",
                  height: "40px",
                  cursor: isSavingDetails ? "not-allowed" : "pointer",
                  color: "var(--text-secondary)",
                  fontSize: "20px",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isSavingDetails ? 0.5 : 1,
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div
              style={{
                padding: "24px",
                maxHeight: "calc(90vh - 180px)",
                overflowY: "auto",
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveExamDetails();
                }}
              >
                {/* Exam Name */}
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--text-primary)",
                    }}
                  >
                    Exam Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    disabled={isSavingDetails}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "var(--secondary-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent-color)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border-color)")
                    }
                    placeholder="Enter exam name"
                  />
                </div>

                {/* Scheduling Mode Toggle */}
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "8px",
                      background: "var(--secondary-bg)",
                      borderRadius: "10px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setUseDuration(false)}
                      disabled={isSavingDetails}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: !useDuration ? "var(--accent-color)" : "transparent",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: !useDuration ? "white" : "var(--text-secondary)",
                        cursor: isSavingDetails ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      📅 Start/End Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseDuration(true)}
                      disabled={isSavingDetails}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: useDuration ? "var(--accent-color)" : "transparent",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: useDuration ? "white" : "var(--text-secondary)",
                        cursor: isSavingDetails ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Clock size={14} /> Duration
                    </button>
                  </div>
                </div>

                {!useDuration ? (
                  <>
                    {/* Start Time */}
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--text-primary)",
                        }}
                      >
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={editFormData.startTime}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            startTime: e.target.value,
                          })
                        }
                        disabled={isSavingDetails}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          background: "var(--secondary-bg)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "10px",
                          fontSize: "14px",
                          color: "var(--text-primary)",
                          outline: "none",
                          transition: "border-color 0.2s",
                          boxSizing: "border-box",
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "var(--accent-color)")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "var(--border-color)")
                        }
                      />
                    </div>

                    {/* End Time */}
                    <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--text-primary)",
                    }}
                  >
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.endTime}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        endTime: e.target.value,
                      })
                    }
                    disabled={isSavingDetails}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "var(--secondary-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px",
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      outline: "none",
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "var(--accent-color)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border-color)")
                    }
                      />
                    </div>

                    {/* Duration Display for Start/End Time Mode */}
                    {editFormData.startTime && editFormData.endTime && (
                      <div
                        style={{
                          marginBottom: "20px",
                          padding: "16px",
                          background: "var(--info-bg)",
                          border: "1px solid var(--info-color)",
                          borderRadius: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--info-color)",
                            fontSize: "14px",
                            fontWeight: "600",
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12,6 12,12 16,14"></polyline>
                          </svg>
                          <span>Duration: {calculateDuration()}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Duration Input Mode */}
                    <div style={{ marginBottom: "20px" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "8px",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "var(--text-primary)",
                        }}
                      >
                        Exam Duration
                      </label>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "6px",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Hours
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="24"
                            value={Math.floor(editFormData.durationMinutes / 60)}
                            onChange={(e) => {
                              const hours = parseInt(e.target.value) || 0;
                              const minutes = editFormData.durationMinutes % 60;
                              setEditFormData({
                                ...editFormData,
                                durationMinutes: hours * 60 + minutes,
                              });
                            }}
                            disabled={isSavingDetails}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              background: "var(--secondary-bg)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "10px",
                              fontSize: "14px",
                              color: "var(--text-primary)",
                              outline: "none",
                              transition: "border-color 0.2s",
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) =>
                              (e.currentTarget.style.borderColor = "var(--accent-color)")
                            }
                            onBlur={(e) =>
                              (e.currentTarget.style.borderColor = "var(--border-color)")
                            }
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: "block",
                              marginBottom: "6px",
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Minutes
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={editFormData.durationMinutes % 60}
                            onChange={(e) => {
                              const hours = Math.floor(editFormData.durationMinutes / 60);
                              const minutes = parseInt(e.target.value) || 0;
                              setEditFormData({
                                ...editFormData,
                                durationMinutes: hours * 60 + minutes,
                              });
                            }}
                            disabled={isSavingDetails}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              background: "var(--secondary-bg)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "10px",
                              fontSize: "14px",
                              color: "var(--text-primary)",
                              outline: "none",
                              transition: "border-color 0.2s",
                              boxSizing: "border-box",
                            }}
                            onFocus={(e) =>
                              (e.currentTarget.style.borderColor = "var(--accent-color)")
                            }
                            onBlur={(e) =>
                              (e.currentTarget.style.borderColor = "var(--border-color)")
                            }
                          />
                        </div>
                      </div>
                      {/* Total Duration Display */}
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "12px 16px",
                          background: "var(--info-bg)",
                          border: "1px solid var(--info-color)",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12,6 12,12 16,14"></polyline>
                        </svg>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "var(--info-color)",
                          }}
                        >
                          Total: {calculateDuration()} ({editFormData.durationMinutes} minutes)
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Proctoring Settings Section */}
                <div style={{ marginTop: "32px", marginBottom: "20px" }}>
                  <h4
                    style={{
                      margin: "0 0 20px 0",
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Proctoring Settings
                  </h4>

                  {/* Normal Proctoring */}
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "16px",
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Monitor size={20} color="var(--accent-color)" />
                        <div>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "var(--text-primary)",
                            }}
                          >
                            Normal Proctoring
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Basic monitoring and browser control features
                          </div>
                        </div>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: isSavingDetails ? "not-allowed" : "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editFormData.normalProctoring}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setEditFormData({
                              ...editFormData,
                              normalProctoring: enabled,
                              controlDesktopApps: enabled,
                              screenCountDetection: enabled,
                              safeBrowser: enabled,
                              tabSwitchDetection: enabled,
                              microphoneDetection: enabled,
                            });
                          }}
                          disabled={isSavingDetails}
                          style={{
                            width: "20px",
                            height: "20px",
                            cursor: isSavingDetails ? "not-allowed" : "pointer",
                          }}
                        />
                      </label>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "10px",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      {[
                        {
                          key: "controlDesktopApps",
                          label: "Control Desktop Apps",
                          icon: "🖥️",
                        },
                        {
                          key: "screenCountDetection",
                          label: "Screen Count Detection",
                          icon: "📺",
                        },
                        { key: "safeBrowser", label: "Safe Browser", icon: "🔒" },
                        {
                          key: "tabSwitchDetection",
                          label: "Tab Switch Detection",
                          icon: "🔄",
                        },
                        {
                          key: "microphoneDetection",
                          label: "Microphone Detection",
                          icon: "🎤",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px",
                            background: "var(--secondary-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            cursor:
                              isSavingDetails || !editFormData.normalProctoring
                                ? "not-allowed"
                                : "pointer",
                            opacity: !editFormData.normalProctoring ? 0.5 : 1,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSavingDetails && editFormData.normalProctoring) {
                              e.currentTarget.style.borderColor =
                                "var(--accent-color)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-color)";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              editFormData[
                                item.key as keyof typeof editFormData
                              ] as boolean
                            }
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                [item.key]: e.target.checked,
                              })
                            }
                            disabled={
                              isSavingDetails || !editFormData.normalProctoring
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              cursor:
                                isSavingDetails || !editFormData.normalProctoring
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* AI Powered Proctoring */}
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "16px",
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>🤖</span>
                        <div>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "var(--text-primary)",
                            }}
                          >
                            AI Powered Proctoring
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Advanced AI-based monitoring and detection
                          </div>
                        </div>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: isSavingDetails ? "not-allowed" : "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editFormData.aiPoweredProctoring}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setEditFormData({
                              ...editFormData,
                              aiPoweredProctoring: enabled,
                              thirdEye: enabled,
                              multiPerson: enabled,
                              eyeBall: enabled,
                              objectDetect: enabled,
                              headDirection: enabled,
                              faceAuthentication: enabled,
                            });
                          }}
                          disabled={isSavingDetails}
                          style={{
                            width: "20px",
                            height: "20px",
                            cursor: isSavingDetails ? "not-allowed" : "pointer",
                          }}
                        />
                      </label>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "10px",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      {[
                        { key: "thirdEye", label: "Third Eye", icon: "👁️" },
                        {
                          key: "multiPerson",
                          label: "Multiple Person Detection",
                          icon: "👥",
                        },
                        { key: "eyeBall", label: "Eyeball Detection", icon: "👀" },
                        { key: "objectDetect", label: "Object Detection", icon: "📦" },
                        { key: "headDirection", label: "Head Direction", icon: "🔄" },
                        {
                          key: "faceAuthentication",
                          label: "Face Authentication",
                          icon: "🔐",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px",
                            background: "var(--secondary-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            cursor:
                              isSavingDetails || !editFormData.aiPoweredProctoring
                                ? "not-allowed"
                                : "pointer",
                            opacity: !editFormData.aiPoweredProctoring ? 0.5 : 1,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (
                              !isSavingDetails &&
                              editFormData.aiPoweredProctoring
                            ) {
                              e.currentTarget.style.borderColor =
                                "var(--accent-color)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-color)";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              editFormData[
                                item.key as keyof typeof editFormData
                              ] as boolean
                            }
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                [item.key]: e.target.checked,
                              })
                            }
                            disabled={
                              isSavingDetails || !editFormData.aiPoweredProctoring
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              cursor:
                                isSavingDetails || !editFormData.aiPoweredProctoring
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Recorded Manual Proctoring */}
                  <div
                    style={{
                      marginBottom: "16px",
                      padding: "16px",
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "20px" }}>📹</span>
                        <div>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: "700",
                              color: "var(--text-primary)",
                            }}
                          >
                            Recorded Manual Proctoring
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Recording and manual review capabilities
                          </div>
                        </div>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: isSavingDetails ? "not-allowed" : "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={editFormData.recordedManualProctoring}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setEditFormData({
                              ...editFormData,
                              recordedManualProctoring: enabled,
                              flagNotifications: enabled,
                              videoRecording: enabled,
                              proctorFeedToTestTaker: enabled,
                              screenSharing: enabled,
                            });
                          }}
                          disabled={isSavingDetails}
                          style={{
                            width: "20px",
                            height: "20px",
                            cursor: isSavingDetails ? "not-allowed" : "pointer",
                          }}
                        />
                      </label>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                        gap: "10px",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      {[
                        {
                          key: "flagNotifications",
                          label: "Flag Notifications",
                          icon: "🚩",
                        },
                        {
                          key: "videoRecording",
                          label: "Video Recording",
                          icon: "🎥",
                        },
                        {
                          key: "proctorFeedToTestTaker",
                          label: "Proctor Feed to Test Taker",
                          icon: "📹",
                        },
                        {
                          key: "screenSharing",
                          label: "Screen Sharing",
                          icon: "🖥️",
                        },
                      ].map((item) => (
                        <label
                          key={item.key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px",
                            background: "var(--secondary-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            cursor:
                              isSavingDetails ||
                              !editFormData.recordedManualProctoring
                                ? "not-allowed"
                                : "pointer",
                            opacity: !editFormData.recordedManualProctoring ? 0.5 : 1,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (
                              !isSavingDetails &&
                              editFormData.recordedManualProctoring
                            ) {
                              e.currentTarget.style.borderColor =
                                "var(--accent-color)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border-color)";
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              editFormData[
                                item.key as keyof typeof editFormData
                              ] as boolean
                            }
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                [item.key]: e.target.checked,
                              })
                            }
                            disabled={
                              isSavingDetails ||
                              !editFormData.recordedManualProctoring
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              cursor:
                                isSavingDetails ||
                                !editFormData.recordedManualProctoring
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--text-primary)",
                            }}
                          >
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div
                  style={{
                    marginTop: "20px",
                    padding: "12px 16px",
                    background: "var(--warning-bg)",
                    border: "1px solid var(--warning-color)",
                    borderRadius: "10px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                  }}
                >
                  <strong style={{ color: "var(--warning-color)" }}>Note:</strong>{" "}
                  Changing the exam schedule may affect students who have already
                  registered. Make sure to notify them of any changes.
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowEditDetailsModal(false)}
                disabled={isSavingDetails}
                style={{
                  padding: "12px 24px",
                  background: "var(--button-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                  cursor: isSavingDetails ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: isSavingDetails ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExamDetails}
                disabled={isSavingDetails}
                style={{
                  padding: "12px 24px",
                  background: isSavingDetails
                    ? "var(--text-secondary)"
                    : "var(--accent-color)",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "white",
                  cursor: isSavingDetails ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {isSavingDetails ? (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "14px",
                        height: "14px",
                        border: "2px solid white",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Students Modal */}
      {showAddStudentsModal && (
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
            setShowAddStudentsModal(false);
            setNewStudents([]);
            setStudentUploadError('');
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "700px",
              width: "90%",
              maxHeight: "85vh",
              overflow: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: "var(--text-primary)" }}>
                Add Students to {examName}
              </h3>
              <button
                onClick={() => {
                  setShowAddStudentsModal(false);
                  setNewStudents([]);
                  setStudentUploadError('');
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
              Add students manually or upload an Excel file. All fields (Email, Password, Name, Registration Number, Department) are mandatory.
            </p>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
              <button
                onClick={() => setShowStudentForm(!showStudentForm)}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  background: showStudentForm ? "var(--accent-color)" : "var(--secondary-bg)",
                  color: showStudentForm ? "white" : "var(--text-primary)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <UserPlus size={18} />
                Add Manually
              </button>

              <label
                htmlFor={`student-file-upload-${exam.id}`}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  background: "var(--secondary-bg)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Upload size={18} />
                Upload Excel
                <input
                  id={`student-file-upload-${exam.id}`}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleStudentFileUpload}
                  style={{ display: "none" }}
                />
              </label>

              <button
                onClick={downloadStudentsTemplate}
                style={{
                  padding: "12px 20px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  background: "var(--secondary-bg)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Download size={18} />
                Template
              </button>
            </div>

            {/* Manual Form */}
            {showStudentForm && (
              <div style={{
                background: "var(--secondary-bg)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px",
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <input
                    type="email"
                    placeholder="Email *"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Password *"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Registration Number *"
                    value={newStudentReg}
                    onChange={(e) => setNewStudentReg(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Department *"
                    value={newStudentDept}
                    onChange={(e) => setNewStudentDept(e.target.value)}
                    style={{
                      gridColumn: "1 / -1",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                      fontSize: "14px",
                    }}
                  />
                </div>
                <button
                  onClick={handleAddStudent}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--accent-color)",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Add Student
                </button>
              </div>
            )}

            {/* Error Message */}
            {studentUploadError && (
              <div style={{
                padding: "12px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "8px",
                color: "#ef4444",
                fontSize: "13px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "start",
                gap: "8px",
                whiteSpace: "pre-line",
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                {studentUploadError}
              </div>
            )}

            {/* Students List */}
            {newStudents.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                  Students to Invite ({newStudents.length})
                </h4>
                <div style={{ maxHeight: "250px", overflow: "auto", background: "var(--secondary-bg)", borderRadius: "8px", padding: "8px" }}>
                  {newStudents.map((student, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        background: "var(--card-bg)",
                        borderRadius: "6px",
                        marginBottom: "8px",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px" }}>
                          {student.name} ({student.reg})
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          {student.email} • {student.dept}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteStudent(student.email)}
                        style={{
                          padding: "6px",
                          borderRadius: "6px",
                          border: "none",
                          background: "transparent",
                          color: "var(--error-color)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Send Invitations Button */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => {
                  setShowAddStudentsModal(false);
                  setNewStudents([]);
                  setStudentUploadError('');
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvitations}
                disabled={newStudents.length === 0 || isSendingInvitations}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: newStudents.length === 0 || isSendingInvitations ? "var(--border-color)" : "var(--success-color)",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: newStudents.length === 0 || isSendingInvitations ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  opacity: newStudents.length === 0 || isSendingInvitations ? 0.6 : 1,
                }}
              >
                {isSendingInvitations ? (
                  <>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid white",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Send Invitations to {newStudents.length} Student{newStudents.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default ExamCard;
