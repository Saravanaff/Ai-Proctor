import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "../../styles/SuperAdminPage.module.css";
import { SuperAdminGuard } from "../../components/guards";
import { LoadingScreen } from "../../components/PageTransition";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { configureAxiosInterceptor } from "@/utils/axiosConfig";
import { logout as authLogout } from "@/utils/auth";
import { 
  Shield, 
  UserCheck, 
  LayoutDashboard, 
  LogOut, 
  Search,
  MoreVertical,
  Calendar,
  Mail,
  GraduationCap,
  FileText,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Users
} from "lucide-react";

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentExams, setStudentExams] = useState<ExamAttendance[]>([]);
  const [showExamsModal, setShowExamsModal] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const studentsPerPage = 10;

  useEffect(() => {
    configureAxiosInterceptor();
    document.body.style.background = "#f8fafc";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [currentPage]);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await axios.get(`${base}/admin/students?page=${currentPage}&limit=${studentsPerPage}`);
      
      if (response.data.success) {
        setStudents(response.data.data.students || []);
        setTotalPages(response.data.data.totalPages || 1);
        setTotalCount(response.data.data.totalCount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchQuery) {
      setFilteredStudents([...students]);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = students.filter(
      (student) =>
        student.name.toLowerCase().includes(lowerQuery) ||
        student.email.toLowerCase().includes(lowerQuery) ||
        student.dept.toLowerCase().includes(lowerQuery) ||
        student.reg.toLowerCase().includes(lowerQuery)
    );
    setFilteredStudents(filtered);
  };

  const handleLogout = () => {
    authLogout();
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
      const response = await axios.get(`${base}/admin/student/${student.id}/exams`);
      
      if (response.data.success) {
        setStudentExams(response.data.data.exams || []);
      } else {
        setStudentExams([]);
      }
    } catch (error: any) {
      alert(`Failed to fetch exams: ${error.response?.data?.message || error.message}`);
      setStudentExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleExamClick = (examId: number, userId: number) => {
    setNavigating(true);
    router.push(`/examiner/participant-details?examId=${examId}&userId=${userId}`);
  };

  const closeExamsModal = () => {
    setShowExamsModal(false);
    setSelectedStudent(null);
    setStudentExams([]);
  };

  if (initialLoading || navigating) {
    return (
      <SuperAdminGuard>
        <LoadingScreen message={navigating ? "Loading participant details..." : "Loading students..."} />
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className={styles.dashboardContainer}>
        {/* Professional Sidebar */}
        <aside className={styles.sidebar}>
          <div>
            <div className={styles.logoSection}>
              <div className={styles.logoIcon}>
                <Shield size={20} strokeWidth={2.5} />
              </div>
              <div>
                <div className={styles.logoText}>Ai Proctor</div>
                <div className={styles.logoSubtext}>Enterprise</div>
              </div>
            </div>

            <nav className={styles.nav}>
              <button
                onClick={() => router.push("/superAdmin")}
                className={styles.navButton}
              >
                <LayoutDashboard size={18} />
                <span>Overview</span>
              </button>
              <button
                onClick={() => router.push("/superAdmin/admins")}
                className={styles.navButton}
              >
                <Shield size={18} />
                <span>Administrators</span>
              </button>
              <button
                onClick={() => router.push("/superAdmin/students")}
                className={`${styles.navButton} ${styles.navButtonActive}`}
              >
                <UserCheck size={18} />
                <span>Students</span>
              </button>
            </nav>
          </div>

          <div className={styles.logoutSection}>
            <button onClick={handleLogout} className={styles.logoutButton}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          
          {/* Header */}
          <header className={styles.pageHeader}>
            <div>
              <h1 className={styles.welcomeTitle}>Student Directory</h1>
              <p className={styles.welcomeSubtitle}>
                View and manage registered students and their exam history.
              </p>
            </div>
          </header>

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
            <div className={styles.statsGrid} style={{ marginBottom: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
               <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ background: '#eff6ff', padding: 6, borderRadius: 6, color: '#2563eb' }}><Users size={16} /></div>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Total</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{totalCount}</div>
                  </div>
               </div>
            </div>

            <div style={{ position: 'relative', width: 320 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search students..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
            </div>
          </div>

          {/* Student List */}
          <div className={styles.tableContainer}>
            {loading ? (
              <div className={styles.emptyState}>
                 <div className={styles.spinner} style={{ margin: '0 auto 12px' }} />
                 <p>Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                   <UserCheck size={32} />
                </div>
                <h3>No Students Found</h3>
                <p>Try adjusting your search criteria.</p>
              </div>
            ) : (
              <div>
                <div className={styles.tableHeaderRow} style={{ gridTemplateColumns: '2fr 2fr 1.5fr 1fr 100px' }}>
                  <div>Name & Reg No</div>
                  <div className={styles.hideMobile}>Contact</div>
                  <div className={styles.hideMobile}>Department</div>
                  <div className={styles.hideMobile}>Joined</div>
                  <div style={{ textAlign: 'right' }}>Actions</div>
                </div>

                {filteredStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className={styles.cardRow}
                    style={{ gridTemplateColumns: '2fr 2fr 1.5fr 1fr 100px' }}
                    onClick={() => handleStudentClick(student)}
                  >
                    <div className={styles.examNameWrapper}>
                      <div className={styles.examIcon} style={{ background: '#f0f9ff', color: '#0ea5e9' }}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.examInfo}>
                        <h4>{student.name}</h4>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', padding: '2px 4px', borderRadius: 4, display: 'inline-block' }}>{student.reg}</span>
                      </div>
                    </div>

                    <div className={styles.hideMobile}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155' }}>
                        <Mail size={14} color="#94a3b8" />
                        {student.email}
                      </div>
                    </div>

                    <div className={styles.hideMobile}>
                      <div className={styles.statusPill} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                        <GraduationCap size={14} />
                        {student.dept || "N/A"}
                      </div>
                    </div>

                    <div className={styles.hideMobile}>
                      <span className={styles.subInfoText}>{formatDate(student.createdAt)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className={styles.actionButton}>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredStudents.length > 0 && (
             <div className={styles.paginationSection}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                  Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, totalCount)} of {totalCount}
                </span>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={styles.actionButton}
                    style={{ width: 'auto', padding: '0 12px', opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={16} style={{ marginRight: 4 }} /> Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={styles.actionButton}
                    style={{ width: 'auto', padding: '0 12px', opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    Next <ChevronRight size={16} style={{ marginLeft: 4 }} />
                  </button>
                </div>
             </div>
          )}
        </main>

        {/* Exams Modal */}
        {showExamsModal && selectedStudent && (
          <div className={styles.modalOverlay} onClick={closeExamsModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
              <div className={styles.modalHeader}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0f172a' }}>Exam History</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748b' }}>
                    {selectedStudent.name} • {selectedStudent.reg}
                  </p>
                </div>
                <button className={styles.actionButton} onClick={closeExamsModal}>
                   <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>
                </button>
              </div>

              <div className={styles.modalBody} style={{ maxHeight: '60vh', overflowY: 'auto', padding: 0 }}>
                {loadingExams ? (
                   <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                      Loading history...
                   </div>
                ) : studentExams.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                    <p>No exams attended yet.</p>
                  </div>
                ) : (
                  <div>
                    {studentExams.map((attendance) => (
                      <div
                        key={attendance.exam_id}
                        onClick={() => handleExamClick(attendance.exam_id, selectedStudent.id)}
                        style={{
                          padding: '16px 24px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#0f172a' }}>{attendance.exam.exam_name}</h4>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
                             <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {formatDate(attendance.startTime)}</span>
                             <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {new Date(attendance.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                        <ArrowRight size={16} color="#cbd5e1" />
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