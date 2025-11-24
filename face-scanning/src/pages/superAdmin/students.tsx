import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "../../styles/SuperAdminPage.module.css";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SuperAdminGuard } from "../../components/guards";
import { getTokenFromCookie } from "@/constants/AuthStore";

interface Student {
  id: number;
  name: string;
  email: string;
  dept: string;
  dob: string;
  reg: string;
  createdAt: string;
  status?: string;
}

interface ExamAttendance {
  exam_id: number;
  user_id: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  exam: {
    id: number;
    exam_name: string;
    key: number;
    createdAt: string;
    updatedAt: string;
  };
}

export default function StudentsManagement() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentExams, setStudentExams] = useState<ExamAttendance[]>([]);
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);

  axios.interceptors.request.use((config) => {
    const token = getTokenFromCookie();
    if (token) {
      // Merge existing headers and set Authorization in a way that satisfies Axios/TS types
      config.headers = {
        ...(config.headers as Record<string, unknown>),
        Authorization: `Bearer ${token}`,
      } as any;
    }
    return config;
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery, activeTab]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.get(`${base}/admin/students`);
      
      if (response.data.success) {
        setStudents(response.data.data.students || []);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.dept.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.reg.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  };

  const handleLogout = () => {
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleStudentClick = async (student: Student) => {
    setSelectedStudent(student);
    setShowExamsModal(true);
    setLoadingExams(true);
    
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      console.log(`Fetching exams for student ${student.id}`);
      const response = await axios.get(`${base}/admin/student/${student.id}/exams`);
      
      console.log("Response:", response.data);
      
      if (response.data.success) {
        setStudentExams(response.data.data.exams || []);
      } else {
        console.error("API returned success: false", response.data);
        setStudentExams([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch student exams:", error);
      console.error("Error response:", error.response?.data);
      alert(`Failed to fetch exams: ${error.response?.data?.message || error.message}`);
      setStudentExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleExamClick = (examId: number, userId: number) => {
    // Navigate to participant details page
    router.push(`/examiner/participant-details?examId=${examId}&candidateUserId=${userId}`);
  };

  const closeExamsModal = () => {
    setShowExamsModal(false);
    setSelectedStudent(null);
    setStudentExams([]);
  };

  return (
    <SuperAdminGuard>
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div>
            {/* Logo */}
            <div className={styles.logoSection}>
              <div className={styles.logoIcon}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2L2 7V11C2 16.55 6.84 21.74 12 23C17.16 21.74 22 16.55 22 11V7L12 2Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <span className={styles.logoText}>AI Proctor</span>
            </div>

            {/* Navigation */}
            <nav className={styles.nav}>
              <button
                onClick={() => router.push("/superAdmin")}
                className={styles.navButton}
              >
                <span className={styles.navIcon}>📊</span>
                Dashboard
              </button>
              <button
                onClick={() => router.push("/superAdmin/admins")}
                className={styles.navButton}
              >
                <span className={styles.navIcon}>👥</span>
                Admin Management
              </button>
              <button
                onClick={() => router.push("/superAdmin/students")}
                className={`${styles.navButton} ${styles.active}`}
              >
                <span className={styles.navIcon}>🎓</span>
                Student Management
              </button>
            </nav>
          </div>

          {/* Logout Button */}
          <div>
            <button onClick={handleLogout} className={styles.logoutButton}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.3333 14.1667L17.5 10L13.3333 5.83334"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17.5 10H7.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {/* Header */}
          <header className={styles.header}>
            <div>
              <h1 className={styles.pageTitle}>Student Management</h1>
              <p className={styles.pageSubtitle}>
                View and manage all registered students
              </p>
            </div>
            <div className={styles.headerActions}>
              <ThemeToggle />
            </div>
          </header>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: "var(--primary-bg-light)" }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
                    stroke="var(--accent-color)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z"
                    stroke="var(--accent-color)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13"
                    stroke="var(--accent-color)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88"
                    stroke="var(--accent-color)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Total Students</p>
                <p className={styles.statValue}>{students.length}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconWrapper} style={{ background: "var(--success-bg)" }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22 12H18L15 21L9 3L6 12H2"
                    stroke="var(--success-color)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Filtered Results</p>
                <p className={styles.statValue}>{filteredStudents.length}</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className={styles.filtersSection}>
            <div className={styles.searchBox}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.searchIcon}
              >
                <path
                  d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 19L14.65 14.65"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, department, or registration number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Students Table */}
          <div className={styles.tableSection}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className={styles.emptyState}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M32 56C45.2548 56 56 45.2548 56 32C56 18.7452 45.2548 8 32 8C18.7452 8 8 18.7452 8 32C8 45.2548 18.7452 56 32 56Z"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.3"
                  />
                  <path
                    d="M24 28H24.02M40 28H40.02"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.3"
                  />
                  <path
                    d="M38 38C38 38 35 42 32 42C29 42 26 38 26 38"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.3"
                  />
                </svg>
                <h3>No students found</h3>
                <p>
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "No students have registered yet"}
                </p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Date of Birth</th>
                      <th>Registration No</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr 
                        key={student.id}
                        onClick={() => handleStudentClick(student)}
                        className={styles.clickableRow}
                      >
                        <td>
                          <span className={styles.idBadge}>{student.id}</span>
                        </td>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.avatar}>
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <span className={styles.userName}>{student.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.emailText}>{student.email}</span>
                        </td>
                        <td>
                          <span className={styles.deptBadge}>{student.dept || "N/A"}</span>
                        </td>
                        <td>
                          <span className={styles.dateText}>{student.dob || "N/A"}</span>
                        </td>
                        <td>
                          <span className={styles.regBadge}>{student.reg || "N/A"}</span>
                        </td>
                        <td>
                          <span className={styles.dateText}>
                            {formatDate(student.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Exams Modal */}
        {showExamsModal && selectedStudent && (
          <div className={styles.modalOverlay} onClick={closeExamsModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>
                    Exams Attended by {selectedStudent.name}
                  </h2>
                  <p className={styles.modalSubtitle}>
                    {selectedStudent.email} • {selectedStudent.reg}
                  </p>
                </div>
                <button className={styles.closeButton} onClick={closeExamsModal}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <div className={styles.modalBody}>
                {loadingExams ? (
                  <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>Loading exams...</p>
                  </div>
                ) : studentExams.length === 0 ? (
                  <div className={styles.emptyState}>
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 64 64"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M32 56C45.2548 56 56 45.2548 56 32C56 18.7452 45.2548 8 32 8C18.7452 8 8 18.7452 8 32C8 45.2548 18.7452 56 32 56Z"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.3"
                      />
                    </svg>
                    <h3>No exams attended</h3>
                    <p>This student hasn't attended any exams yet</p>
                  </div>
                ) : (
                  <div className={styles.examsList}>
                    {studentExams.map((attendance) => (
                      <div
                        key={attendance.exam_id}
                        className={styles.examCard}
                        onClick={() => handleExamClick(attendance.exam_id, selectedStudent.id)}
                      >
                        <div className={styles.examCardHeader}>
                          <h3 className={styles.examCardTitle}>
                            {attendance.exam.exam_name}
                          </h3>
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className={styles.arrowIcon}
                          >
                            <path
                              d="M7.5 15L12.5 10L7.5 5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <p className={styles.examCardDescription}>
                          Exam Key: {attendance.exam.key}
                        </p>
                        <div className={styles.examCardMeta}>
                          <div className={styles.metaItem}>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M13 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V3C14 2.44772 13.5523 2 13 2Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M11 1V3M5 1V3M2 5H14"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span>Created: {formatDate(attendance.exam.createdAt)}</span>
                          </div>
                          <div className={styles.metaItem}>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M13 2H3C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V3C14 2.44772 13.5523 2 13 2Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M11 1V3M5 1V3M2 5H14"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span>Attended: {formatDate(attendance.startTime)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminGuard>
  );
}
