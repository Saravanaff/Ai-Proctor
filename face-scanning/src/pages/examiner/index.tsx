import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "../../styles/ExaminerDashboard.module.css";

interface Exam {
  id: number;
  title: string;
  description: string;
  duration: number;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  participantsCount?: number;
}

interface DashboardStats {
  totalExams: number;
  activeExams: number;
  completedExams: number;
  totalParticipants: number;
}

export default function ExaminerDashboard() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalExams: 0,
    activeExams: 0,
    completedExams: 0,
    totalParticipants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [examinerInfo, setExaminerInfo] = useState({
    name: "",
    email: "",
    dept: "",
    role: "",
  });

  useEffect(() => {
    checkAuth();
    fetchExams();
    fetchExaminerInfo();
  }, []);

  useEffect(() => {
    filterExams();
  }, [exams, searchQuery, filterStatus]);

  const checkAuth = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/check`,
        { withCredentials: true }
      );
      
      if (response.data.role !== "examiner" && response.data.role !== "HEAD") {
        router.push("/login");
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      router.push("/login");
    }
  };

  const fetchExaminerInfo = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/profile`,
        { withCredentials: true }
      );
      setExaminerInfo(response.data);
    } catch (error) {
      console.error("Failed to fetch examiner info:", error);
    }
  };

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/examiner/exams`,
        { withCredentials: true }
      );
      
      const examsData = response.data.exams || [];
      setExams(examsData);
      
      // Calculate stats
      const activeExams = examsData.filter(
        (exam: Exam) => exam.status === "active" || exam.status === "ongoing"
      ).length;
      const completedExams = examsData.filter(
        (exam: Exam) => exam.status === "completed"
      ).length;
      const totalParticipants = examsData.reduce(
        (sum: number, exam: Exam) => sum + (exam.participantsCount || 0),
        0
      );

      setStats({
        totalExams: examsData.length,
        activeExams,
        completedExams,
        totalParticipants,
      });
    } catch (error) {
      console.error("Failed to fetch exams:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterExams = () => {
    let filtered = [...exams];

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((exam) => exam.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (exam) =>
          exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exam.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredExams(filtered);
  };

  const handleCreateExam = () => {
    router.push("/examiner/create-exam");
  };

  const handleViewExam = (examId: number) => {
    router.push(`/examiner/exam/${examId}`);
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/logout`,
        {},
        { withCredentials: true }
      );
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "ongoing":
        return styles.statusActive;
      case "completed":
        return styles.statusCompleted;
      case "scheduled":
        return styles.statusScheduled;
      default:
        return styles.statusDefault;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 4L4 10V14C4 22 10 28 16 28C22 28 28 22 28 14V10L16 4Z"
                fill="#4F46E5"
              />
              <path
                d="M16 12C14.9 12 14 12.9 14 14V18C14 19.1 14.9 20 16 20C17.1 20 18 19.1 18 18V14C18 12.9 17.1 12 16 12Z"
                fill="white"
              />
            </svg>
            <span className={styles.logoText}>AI Proctor</span>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.profileSection}>
              <button
                className={styles.profileButton}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <div className={styles.avatar}>
                  {examinerInfo.name.charAt(0).toUpperCase()}
                </div>
                <span className={styles.profileName}>{examinerInfo.name}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {showProfileMenu && (
                <div className={styles.profileMenu}>
                  <div className={styles.profileInfo}>
                    <p className={styles.profileEmail}>{examinerInfo.email}</p>
                    <p className={styles.profileDept}>{examinerInfo.dept}</p>
                    <p className={styles.profileRole}>{examinerInfo.role}</p>
                  </div>
                  <hr className={styles.divider} />
                  <button className={styles.logoutButton} onClick={handleLogout}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M11 11L14 8L11 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 8H6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          {/* Page Title */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Examiner Dashboard</h1>
              <p className={styles.pageSubtitle}>
                Manage and monitor your examinations
              </p>
            </div>
            <button className={styles.createButton} onClick={handleCreateExam}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 4V16M4 10H16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Create Exam
            </button>
          </div>

          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#EEF2FF" }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z"
                    stroke="#4F46E5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Total Exams</p>
                <p className={styles.statValue}>{stats.totalExams}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#F0FDF4" }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                    stroke="#16A34A"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Active Exams</p>
                <p className={styles.statValue}>{stats.activeExams}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#FEF3C7" }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 13L9 17L19 7"
                    stroke="#D97706"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Completed</p>
                <p className={styles.statValue}>{stats.completedExams}</p>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: "#FEE2E2" }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M17 20H22V18C22 16.3431 20.6569 15 19 15C18.0444 15 17.1931 15.4468 16.6438 16.1429M17 20H7M17 20V18C17 17.3438 16.8736 16.717 16.6438 16.1429M7 20H2V18C2 16.3431 3.34315 15 5 15C5.95561 15 6.80686 15.4468 7.35625 16.1429M7 20V18C7 17.3438 7.12642 16.717 7.35625 16.1429M7.35625 16.1429C8.0935 14.301 9.89482 13 12 13C14.1052 13 15.9065 14.301 16.6438 16.1429M15 7C15 8.65685 13.6569 10 12 10C10.3431 10 9 8.65685 9 7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7ZM21 10C21 11.1046 20.1046 12 19 12C17.8954 12 17 11.1046 17 10C17 8.89543 17.8954 8 19 8C20.1046 8 21 8.89543 21 10ZM7 10C7 11.1046 6.10457 12 5 12C3.89543 12 3 11.1046 3 10C3 8.89543 3.89543 8 5 8C6.10457 8 7 8.89543 7 10Z"
                    stroke="#DC2626"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Participants</p>
                <p className={styles.statValue}>{stats.totalParticipants}</p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
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
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterTabs}>
              <button
                className={`${styles.filterTab} ${
                  filterStatus === "all" ? styles.activeTab : ""
                }`}
                onClick={() => setFilterStatus("all")}
              >
                All
              </button>
              <button
                className={`${styles.filterTab} ${
                  filterStatus === "active" ? styles.activeTab : ""
                }`}
                onClick={() => setFilterStatus("active")}
              >
                Active
              </button>
              <button
                className={`${styles.filterTab} ${
                  filterStatus === "scheduled" ? styles.activeTab : ""
                }`}
                onClick={() => setFilterStatus("scheduled")}
              >
                Scheduled
              </button>
              <button
                className={`${styles.filterTab} ${
                  filterStatus === "completed" ? styles.activeTab : ""
                }`}
                onClick={() => setFilterStatus("completed")}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Exams List */}
          <div className={styles.examsSection}>
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading exams...</p>
              </div>
            ) : filteredExams.length === 0 ? (
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
                    stroke="#D1D5DB"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M24 28H24.02M40 28H40.02M24 40C24 40 28 44 32 44C36 44 40 40 40 40"
                    stroke="#D1D5DB"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3>No exams found</h3>
                <p>
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first exam to get started"}
                </p>
                {!searchQuery && filterStatus === "all" && (
                  <button
                    className={styles.createButtonSecondary}
                    onClick={handleCreateExam}
                  >
                    Create Exam
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.examsList}>
                {filteredExams.map((exam) => (
                  <div key={exam.id} className={styles.examCard}>
                    <div className={styles.examHeader}>
                      <h3 className={styles.examTitle}>{exam.title}</h3>
                      <span className={`${styles.examStatus} ${getStatusColor(exam.status)}`}>
                        {exam.status}
                      </span>
                    </div>
                    <p className={styles.examDescription}>
                      {exam.description.length > 150
                        ? `${exam.description.substring(0, 150)}...`
                        : exam.description}
                    </p>
                    <div className={styles.examMeta}>
                      <div className={styles.metaItem}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M8 4V8L10.5 9.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>{exam.duration} mins</span>
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
                        <span>
                          {formatDate(exam.startDate)} - {formatDate(exam.endDate)}
                        </span>
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
                            d="M11 14C12.6569 14 14 12.6569 14 11C14 9.34315 12.6569 8 11 8C9.34315 8 8 9.34315 8 11C8 12.6569 9.34315 14 11 14Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5 6C6.65685 6 8 4.65685 8 3C8 1.34315 6.65685 0 5 0C3.34315 0 2 1.34315 2 3C2 4.65685 3.34315 6 5 6Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M8 3H9C10.6569 3 12 4.34315 12 6V8"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M1 13V12C1 10.3431 2.34315 9 4 9H6C7.65685 9 9 10.3431 9 12V13"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>{exam.participantsCount || 0} participants</span>
                      </div>
                    </div>
                    <div className={styles.examActions}>
                      <button
                        className={styles.viewButton}
                        onClick={() => handleViewExam(exam.id)}
                      >
                        View Details
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M6 12L10 8L6 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
