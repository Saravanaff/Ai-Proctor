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
  Shield, 
  LayoutDashboard, 
  LogOut, 
  Upload, 
  UserPlus, 
  Search,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Trash2,
  Ban,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserCheck
} from "lucide-react";

interface Admin {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  role?: string;
  status?: string;
  isActive?: boolean;
}

const SuperAdminAdmins = () => {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "suspended">("all");
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Form State
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [newAdminDob, setNewAdminDob] = useState("");
  
  // Loading States
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const adminsPerPage = 10;

  useEffect(() => {
    configureAxiosInterceptor();
    document.body.style.background = "#f1f5f9";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.get(`${base}/admin/emails?page=${currentPage}&limit=${adminsPerPage}`);
      if (res.data?.success) {
        const adminsWithStatus = res.data.data.admins.map((admin: Admin) => ({
          ...admin,
          role: admin.role || "Admin",
          status: admin.isActive === false ? "Suspended" : "Active",
        }));
        setAdmins(adminsWithStatus);
        setTotalPages(res.data.data.totalPages || 1);
        setTotalCount(res.data.data.totalCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [currentPage]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.post(`${base}/admin/create`, {
        name: newAdminName,
        email: newAdminEmail,
        phone: newAdminPhone,
        dob: newAdminDob,
      });
      if (res.data?.success) {
        setShowCreateModal(false);
        setNewAdminName("");
        setNewAdminEmail("");
        setNewAdminPhone("");
        setNewAdminDob("");
        fetchAdmins();
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to create admin");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;
    setIsDeleting(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.delete(`${base}/admin/${adminToDelete.email}`);
      if (res.data?.success) {
        setShowDeleteModal(false);
        setAdminToDelete(null);
        fetchAdmins();
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to delete admin");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (admin: Admin) => {
    if (!confirm(`Are you sure you want to ${admin.isActive === false ? "activate" : "suspend"} this admin?`)) return;
    
    setIsTogglingStatus(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.patch(`${base}/admin/${admin.email}/status`, {
        isActive: !admin.isActive,
      });
      if (res.data?.success) fetchAdmins();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Failed to update status");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const dataLines = lines.slice(1);
        
        const adminsToImport = dataLines.map(line => {
          const [name, email, phone, dob] = line.split(',').map(item => item.trim());
          return { name, email, phone, dob };
        }).filter(a => a.name && a.email);

        if (adminsToImport.length === 0) {
          alert("No valid data found");
          return;
        }

        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await axios.post(`${base}/admin/bulk-create`, { admins: adminsToImport });

        if (res.data?.success) {
          setImportResults(res.data.data);
          setShowUploadModal(false);
          fetchAdmins();
        }
      } catch (error: any) {
        alert(error?.response?.data?.message || "Import failed");
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const filtered = admins.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === "active") return matchesSearch && a.status === "Active";
    if (activeTab === "suspended") return matchesSearch && a.status === "Suspended";
    return matchesSearch;
  });

  if (initialLoading) {
    return (
      <SuperAdminGuard>
        <LoadingScreen message="Loading Administrators..." />
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

          <div className={styles.logoutSection}>
            <button className={styles.logoutButton} onClick={authLogout}>
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
              <h1 className={styles.welcomeTitle}>Admin Management</h1>
              <p className={styles.welcomeSubtitle}>
                Manage system administrators, permissions, and roles.
              </p>
            </div>
            <div className={styles.actionGroup}>
              <button 
                className={styles.logoutButton}
                style={{ background: 'white' }}
                onClick={() => setShowUploadModal(true)}
              >
                <Upload size={14} />
                Import CSV
              </button>
              <button 
                className={styles.navButtonActive}
                style={{ padding: '10px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => setShowCreateModal(true)}
              >
                <UserPlus size={16} />
                Add Admin
              </button>
            </div>
          </header>

          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['all', 'active', 'suspended'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: activeTab === tab ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                    background: activeTab === tab ? '#eff6ff' : 'white',
                    color: activeTab === tab ? '#2563eb' : '#64748b',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            
            <div style={{ position: 'relative', width: 300 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search admins..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 36px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  background: 'white'
                }}
              />
            </div>
          </div>

          {/* List Content */}
          <div className={styles.tableContainer}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Shield size={32} />
                </div>
                <h3>No Administrators Found</h3>
                <p>Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div>
                <div className={styles.tableHeaderRow} style={{ gridTemplateColumns: '2fr 1.5fr 1fr 140px' }}>
                  <div>Administrator</div>
                  <div className={styles.hideMobile}>Contact Info</div>
                  <div className={styles.hideMobile}>Status</div>
                  <div style={{ textAlign: 'right' }}>Actions</div>
                </div>

                {filtered.map((admin) => (
                  <div 
                    key={admin.id} 
                    className={styles.cardRow}
                    style={{ gridTemplateColumns: '2fr 1.5fr 1fr 140px' }}
                    onClick={() => router.push(`/superAdmin/admin-profile?adminEmail=${admin.email}`)}
                  >
                    <div className={styles.examNameWrapper}>
                      <div className={styles.examIcon} style={{ background: '#f8fafc', color: '#64748b' }}>
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.examInfo}>
                        <h4>{admin.name}</h4>
                        <span>Joined {new Date(admin.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className={styles.hideMobile}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155' }}>
                          <Mail size={14} color="#94a3b8" />
                          {admin.email}
                        </div>
                        {admin.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                            <Phone size={14} color="#94a3b8" />
                            {admin.phone}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.hideMobile}>
                      <div className={`${styles.statusPill} ${admin.status === 'Active' ? styles.statusOngoing : styles.statusError}`}>
                        {admin.status === 'Active' ? <CheckCircle size={14} /> : <Ban size={14} />}
                        {admin.status}
                      </div>
                    </div>

                    {/* Direct Action Buttons with Tooltips */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button 
                        className={styles.actionButton}
                        onClick={(e) => { e.stopPropagation(); router.push(`/superAdmin/admin-profile?adminEmail=${admin.email}`); }}
                        title="View Profile"
                      >
                        <Eye size={16} />
                      </button>
                      
                      <button 
                        className={styles.actionButton}
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(admin); }}
                        title={admin.isActive === false ? "Activate Account" : "Suspend Account"}
                        style={{ color: admin.isActive === false ? '#10b981' : '#f59e0b' }}
                      >
                        {admin.isActive === false ? <Unlock size={16} /> : <Ban size={16} />}
                      </button>
                      
                      <button 
                        className={styles.actionButton}
                        onClick={(e) => { e.stopPropagation(); setAdminToDelete(admin); setShowDeleteModal(true); }}
                        title="Delete Admin"
                        style={{ color: '#dc2626' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
             <div className={styles.paginationSection}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                  Showing {((currentPage - 1) * adminsPerPage) + 1} to {Math.min(currentPage * adminsPerPage, totalCount)} of {totalCount} admins
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

          {/* Create Modal */}
          {showCreateModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setShowCreateModal(false)}>
              <div style={{ background: 'white', padding: 32, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                <h2 style={{ margin: '0 0 24px 0', fontSize: 20, fontWeight: 700 }}>Add New Administrator</h2>
                <form onSubmit={handleCreateAdmin}>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Full Name</label>
                      <input 
                        required 
                        type="text" 
                        value={newAdminName} 
                        onChange={e => setNewAdminName(e.target.value)} 
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Email Address</label>
                      <input 
                        required 
                        type="email" 
                        value={newAdminEmail} 
                        onChange={e => setNewAdminEmail(e.target.value)} 
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Phone Number</label>
                      <input 
                        required 
                        type="tel" 
                        value={newAdminPhone} 
                        onChange={e => setNewAdminPhone(e.target.value)} 
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Date of Birth</label>
                      <input 
                        required 
                        type="date" 
                        value={newAdminDob} 
                        onChange={e => setNewAdminDob(e.target.value)} 
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                    <button type="button" onClick={() => setShowCreateModal(false)} className={styles.logoutButton} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                    <button type="submit" disabled={isCreating} className={styles.sectionAction} style={{ flex: 1, background: '#3b82f6', color: 'white', justifyContent: 'center', borderRadius: 6, padding: '10px' }}>
                      {isCreating ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

           {/* Delete Modal */}
           {showDeleteModal && adminToDelete && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setShowDeleteModal(false)}>
              <div style={{ background: 'white', padding: 32, borderRadius: 16, width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
                <div style={{ width: 56, height: 56, background: '#fee2e2', color: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Trash2 size={24} />
                </div>
                <h2 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: 700 }}>Delete Administrator?</h2>
                <p style={{ color: '#64748b', marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
                  Are you sure you want to remove <strong>{adminToDelete.name}</strong>? This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setShowDeleteModal(false)} className={styles.logoutButton} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                  <button onClick={handleDeleteConfirm} disabled={isDeleting} className={styles.sectionAction} style={{ flex: 1, background: '#dc2626', color: 'white', justifyContent: 'center', borderRadius: 6, padding: '10px' }}>
                    {isDeleting ? 'Deleting...' : 'Delete Admin'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </SuperAdminGuard>
  );
};

export default SuperAdminAdmins;
