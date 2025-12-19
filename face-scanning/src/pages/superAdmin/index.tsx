import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/SuperAdminPage.module.css";
import { SuperAdminGuard } from "../../components/guards";
import { LoadingScreen } from "../../components/PageTransition";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { configureAxiosInterceptor } from "@/utils/axiosConfig";
import { logout as authLogout } from "@/utils/auth";
import { 
  LayoutDashboard, 
  Shield, 
  UserCheck, 
  LogOut,
  Users,
  FileText,
  Clock,
  Calendar,
  MoreVertical,
  TrendingUp,
  Activity,
  CheckCircle2,
  Timer
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useSuperAdmin";

interface Exam {
  id: number;
  exam_name: string;
  start_time: string;
  end_time: string;
  duration: number;
  participants?: number;
  totalStudents?: number;
  attendances?: Array<{
    user_id: number;
    exam_id: number;
    startTime?: string;
    endTime?: string;
    User?: {
      name: string;
      email: string;
    };
  }>;
}

const SuperAdminDashboard = () => {
  const router = useRouter();
  const { stats, isLoading, refresh } = useDashboardStats();

  const [ongoingExams, setOngoingExams] = useState<Exam[]>([]);
  const [scheduledExams, setScheduledExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [showAllOngoing, setShowAllOngoing] = useState(false);
  const [showAllScheduled, setShowAllScheduled] = useState(false);

  // Initial Setup
  useEffect(() => {
    configureAxiosInterceptor();
    document.body.style.background = "#f8fafc";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const token = getTokenFromCookie();

        const response = await axios.get(`${base}/exam`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data?.success) {
          const now = new Date();
          const exams = response.data.exams || [];

          const ongoing = exams.filter((exam: Exam) => {
            const start = new Date(exam.start_time);
            const end = new Date(exam.end_time);
            return start <= now && end >= now;
          });

          const scheduled = exams.filter((exam: Exam) => {
            return new Date(exam.start_time) > now;
          }).sort((a: Exam, b: Exam) => 
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );

          setOngoingExams(ongoing);
          setScheduledExams(scheduled);
        }
      } catch (error) {
        console.error("Error fetching exams:", error);
      } finally {
        setLoadingExams(false);
      }
    };

    fetchExams();
    const interval = setInterval(fetchExams, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format Helpers
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric', minute: '2-digit' 
    });
  };

  const getTimeLeft = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  if (isLoading && loadingExams) {
    return (
      <SuperAdminGuard>
        <LoadingScreen message="Initializing Dashboard..." />
      </SuperAdminGuard>
    );
  }

  const displayedOngoing = showAllOngoing ? ongoingExams : ongoingExams.slice(0, 3);
  const displayedScheduled = showAllScheduled ? scheduledExams : scheduledExams.slice(0, 4);

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
                className={`${styles.navButton} ${styles.navButtonActive}`}
                onClick={() => router.push("/superAdmin")}
              >
                <LayoutDashboard size={18} />
                <span>Overview</span>
              </button>
              <button 
                className={styles.navButton}
                onClick={() => router.push("/superAdmin/admins")}
              >
                <Shield size={18} />
                <span>Administrators</span>
              </button>
              <button 
                className={styles.navButton}
                onClick={() => router.push("/superAdmin/students")}
              >
                <UserCheck size={18} />
                <span>Students</span>
              </button>
            </nav>
          </div>

          <div className={styles.logoutSection}>
            <button className={styles.logoutButton} onClick={authLogout}>
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={styles.mainContent}>
          
          {/* Clean Page Header */}
          <header className={styles.pageHeader}>
            <div>
              <h1 className={styles.welcomeTitle}>Dashboard</h1>
              <p className={styles.welcomeSubtitle}>
                Overview of system performance and exam activity.
              </p>
            </div>
            <div className={styles.actionGroup}>
              <div style={{ fontSize: 13, color: '#64748b', background: 'white', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </header>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Total Admins</span>
                <div className={styles.statIconWrapper}>
                  <Shield size={20} />
                </div>
              </div>
              <div className={styles.statValue}>{stats?.totalAdmins || 0}</div>
              <div className={styles.statTrend}>
                 <span className={styles.trendUp} style={{ display: 'flex', alignItems: 'center' }}>
                    <TrendingUp size={14} style={{ marginRight: 4 }} />
                    {stats?.activeAdmins || 0} Active Now
                 </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                 <span className={styles.statLabel}>Students</span>
                <div className={styles.statIconWrapper}>
                  <Users size={20} />
                </div>
              </div>
              <div className={styles.statValue}>{stats?.totalStudents || 0}</div>
              <div className={styles.statTrend}>
                <span className={styles.trendNeutral}>Registered candidates</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                 <span className={styles.statLabel}>Exams Created</span>
                <div className={styles.statIconWrapper}>
                  <FileText size={20} />
                </div>
              </div>
              <div className={styles.statValue}>{stats?.totalExams || 0}</div>
              <div className={styles.statTrend}>
                <span className={styles.trendNeutral}>All time total</span>
              </div>
            </div>
          </div>

          {/* Ongoing Exams List - NO ACTIONS COLUMN (Like original) */}
          <div className={styles.tableContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <Activity size={18} color="#10b981" />
                Live Exams
                {ongoingExams.length > 0 && <span className={styles.badge}>{ongoingExams.length} Active</span>}
              </div>
              {ongoingExams.length > 3 && (
                <button 
                  className={styles.sectionAction}
                  onClick={() => setShowAllOngoing(!showAllOngoing)}
                >
                  {showAllOngoing ? 'Show Less' : 'View All'}
                </button>
              )}
            </div>

            {ongoingExams.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <CheckCircle2 size={32} />
                </div>
                <h3>No Exams Currently Live</h3>
                <p>All exams are either completed or scheduled for later.</p>
              </div>
            ) : (
              <div>
                <div className={styles.tableHeaderRow} style={{ gridTemplateColumns: '2fr 1.5fr 1fr' }}>
                  <div>Exam Name</div>
                  <div className={styles.hideMobile}>Time Remaining</div>
                  <div className={styles.hideMobile}>Participation</div>
                </div>
                
                {displayedOngoing.map((exam) => (
                  <div key={exam.id} className={styles.cardRow} style={{ gridTemplateColumns: '2fr 1.5fr 1fr', cursor: 'default' }}>
                    <div className={styles.examNameWrapper}>
                      <div className={styles.examIcon}>
                        <FileText size={16} />
                      </div>
                      <div className={styles.examInfo}>
                        <h4>{exam.exam_name}</h4>
                        <span>ID: #{exam.id}</span>
                      </div>
                    </div>
                    
                    <div className={styles.hideMobile}>
                      <div className={`${styles.statusPill} ${styles.statusOngoing}`}>
                        <Timer size={14} />
                        {getTimeLeft(exam.end_time)}
                      </div>
                    </div>

                    <div className={styles.hideMobile}>
                      <div className={styles.infoText}>
                        <span style={{ fontWeight: 500 }}>
                           {exam.attendances?.filter((a: any) => a.startTime).length || 0} Students
                        </span>
                        <span className={styles.subInfoText}>Currently Taking</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scheduled Exams List - ACTION BUTTON IS PLACEHOLDER (Like original) */}
          <div className={styles.tableContainer}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <Calendar size={18} color="#3b82f6" />
                Upcoming Schedule
              </div>
              {scheduledExams.length > 4 && (
                <button 
                  className={styles.sectionAction}
                  onClick={() => setShowAllScheduled(!showAllScheduled)}
                >
                  {showAllScheduled ? 'Show Less' : 'View All'}
                </button>
              )}
            </div>

            {scheduledExams.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Calendar size={32} />
                </div>
                <h3>No Upcoming Exams</h3>
                <p>Schedule new exams to see them appear here.</p>
              </div>
            ) : (
              <div>
                 <div className={styles.tableHeaderRow}>
                  <div>Exam Name</div>
                  <div className={styles.hideMobile}>Date & Time</div>
                  <div className={styles.hideMobile}>Duration</div>
                  <div style={{ textAlign: 'right' }}>Actions</div>
                </div>

                {displayedScheduled.map((exam) => (
                  <div key={exam.id} className={styles.cardRow} style={{ cursor: 'default' }}>
                    <div className={styles.examNameWrapper}>
                      <div className={styles.examIcon}>
                        <Calendar size={16} />
                      </div>
                      <div className={styles.examInfo}>
                        <h4>{exam.exam_name}</h4>
                        <span>Admin Scheduled</span>
                      </div>
                    </div>

                    <div className={styles.hideMobile}>
                      <div className={styles.infoText}>
                        <span style={{ fontWeight: 500 }}>{formatDate(exam.start_time)}</span>
                        <span className={styles.subInfoText}>{formatTime(exam.start_time)}</span>
                      </div>
                    </div>

                    <div className={styles.hideMobile}>
                       <span style={{ fontSize: 13, color: '#475569' }}>
                        {Math.floor(exam.duration / 60) > 0 
                          ? `${Math.floor(exam.duration / 60)}h ${exam.duration % 60}m` 
                          : `${exam.duration} min`}
                       </span>
                    </div>

                    {/* Non-functional placeholder button like original */}
                    <button className={styles.actionButton} style={{ cursor: 'default' }}>
                      <MoreVertical size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </SuperAdminGuard>
  );
};

export default SuperAdminDashboard;