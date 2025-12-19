import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/SuperAdminPage.module.css";
import { SuperAdminGuard } from "../../components/guards";
import { LoadingScreen } from "../../components/PageTransition";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { 
  Check, 
  Mail, 
  User, 
  FileText, 
  Users, 
  ArrowLeft,
  Search,
  ArrowRight,
  Eye,
  Video,
  Monitor,
  Target,
  Shield,
  LayoutDashboard,
  UserCheck
} from "lucide-react";

interface Exam {
  id: number;
  exam_name: string;
  key: number;
  createdAt: string;
  updatedAt: string;
  totalParticipants: number;
  settings: {
    third_eye_enabled: boolean;
    multiple_person_detection_enabled: boolean;
    eyeball_detection_enabled: boolean;
    object_detection_enabled: boolean;
    head_direction_enabled: boolean;
    video_recording_enabled: boolean;
    screen_sharing_enabled: boolean;
  };
}

interface AdminData {
  id: number;
  name: string;
  email: string;
}

const AdminProfilePage = () => {
  const router = useRouter();
  const { adminEmail } = router.query;

  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [search, setSearch] = useState("");

  axios.interceptors.request.use((config) => {
    const token = getTokenFromCookie();
    if (token) {
      config.headers = config.headers || ({} as any);
      (config.headers as any)["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  useEffect(() => {
    document.body.style.background = "#f8fafc";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  const fetchAdminExams = async () => {
    if (!adminEmail) return;

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.get(`${base}/admin/${adminEmail}/exams`);

      if (res.data?.success) {
        setAdmin(res.data.data.admin);
        setExams(res.data.data.exams);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminExams();
  }, [adminEmail]);

  const handleExamClick = (examId: number) => {
    setNavigating(true);
    router.push(`/examiner/exam-details?examId=${examId}`);
  };

  const handleBack = () => {
    router.push("/superAdmin/admins");
  };

  const filtered = exams.filter((exam) =>
    (exam.exam_name || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading || navigating) {
    return (
      <SuperAdminGuard>
        <LoadingScreen message={navigating ? "Loading exam details..." : "Loading admin profile..."} />
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
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
                className={styles.navButton}
                onClick={() => router.push("/superAdmin")}
              >
                <LayoutDashboard size={18} />
                <span>Overview</span>
              </button>
              <button 
                className={`${styles.navButton} ${styles.navButtonActive}`}
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
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          
          <button 
            onClick={handleBack}
            className={styles.sectionAction}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, fontSize: 14, color: '#64748b', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} /> Back to Admin List
          </button>

          {/* Profile Header */}
          <div className={styles.tableContainer} style={{ padding: 32, marginBottom: 32, boxShadow: 'none', border: '1px solid #e2e8f0', background: 'white' }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                background: '#f1f5f9', 
                color: '#64748b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 700,
                border: '1px solid #e2e8f0'
              }}>
                {admin?.name?.charAt(0).toUpperCase() || "A"}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700, color: '#0f172a' }}>
                      {admin?.name || "Admin Profile"}
                    </h1>
                    <div style={{ display: 'flex', gap: 16, color: '#64748b', fontSize: 14 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={16} /> {admin?.email}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={16} /> Administrator
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.statusPill} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7', padding: '6px 12px' }}>
                    <Check size={14} /> Active Account
                  </div>
                </div>
                
                <div style={{ marginTop: 24, display: 'flex', gap: 24, borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
                   <div>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Total Exams</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{exams.length}</div>
                   </div>
                   {/* Placeholder for future stats */}
                   <div>
                      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Role</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', paddingTop: 4 }}>Super Admin</div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Exams Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 className={styles.sectionTitle} style={{ fontSize: 18 }}>Examinations Created</h2>
            <div style={{ position: 'relative', width: 300 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search exams..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
                style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: 8, fontSize: 14 }}
              />
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={32} className={styles.emptyIcon} />
              <h3>No Examinations Found</h3>
              <p>{search ? "Try adjusting your search criteria" : "This admin hasn't created any exams yet"}</p>
            </div>
          ) : (
            <div className={styles.tableContainer} style={{ marginBottom: 0 }}>
              <div className={styles.tableHeaderRow} style={{ gridTemplateColumns: '2.5fr 2fr 1.2fr 1fr 1.2fr 50px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                <div>Exam Name</div>
                <div>Active Features</div>
                <div>Exam Key</div>
                <div>Participants</div>
                <div>Created</div>
                <div style={{ textAlign: 'right' }}></div>
              </div>

              {filtered.map((exam) => (
                <div 
                  key={exam.id} 
                  className={styles.cardRow}
                  style={{ gridTemplateColumns: '2.5fr 2fr 1.2fr 1fr 1.2fr 50px', padding: '16px 24px', alignItems: 'center' }}
                  onClick={() => handleExamClick(exam.id)}
                >
                  {/* Name Column */}
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 15 }}>
                      {exam.exam_name}
                    </div>
                  </div>

                  {/* Features Column - Informative Badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {exam.settings.video_recording_enabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#eff6ff', borderRadius: 12, color: '#2563eb', fontSize: 11, fontWeight: 600, border: '1px solid #dbeafe' }}>
                        <Video size={10} /> Video
                      </div>
                    )}
                    {exam.settings.screen_sharing_enabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#f0fdf4', borderRadius: 12, color: '#166534', fontSize: 11, fontWeight: 600, border: '1px solid #dcfce7' }}>
                        <Monitor size={10} /> Screen
                      </div>
                    )}
                    {(exam.settings.eyeball_detection_enabled || exam.settings.head_direction_enabled) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#fff7ed', borderRadius: 12, color: '#c2410c', fontSize: 11, fontWeight: 600, border: '1px solid #ffedd5' }}>
                        <Eye size={10} /> Tracking
                      </div>
                    )}
                    {exam.settings.object_detection_enabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#fef2f2', borderRadius: 12, color: '#b91c1c', fontSize: 11, fontWeight: 600, border: '1px solid #fee2e2' }}>
                        <Target size={10} /> Objects
                      </div>
                    )}
                    {!exam.settings.video_recording_enabled && 
                     !exam.settings.screen_sharing_enabled && 
                     !exam.settings.eyeball_detection_enabled && 
                     !exam.settings.object_detection_enabled && (
                      <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Basic Proctoring</div>
                    )}
                  </div>

                  {/* Key Column */}
                  <div>
                    <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 13, color: '#475569', fontWeight: 600, border: '1px solid #e2e8f0', display: 'inline-block' }}>
                      {exam.key}
                    </span>
                  </div>

                  {/* Participants Column */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 14 }}>
                      <Users size={14} style={{ color: '#94a3b8' }} />
                      <span style={{ fontWeight: 500 }}>{exam.totalParticipants}</span>
                    </div>
                  </div>

                  {/* Date Column */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>
                      {new Date(exam.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(exam.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Action Column */}
                  <div style={{ textAlign: 'right' }}>
                    <button className={styles.actionButton} style={{ color: '#64748b' }}>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </SuperAdminGuard>
  );
};

export default AdminProfilePage;