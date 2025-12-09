import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/SuperAdminPage.module.css";
import { SuperAdminGuard } from "../../components/guards";
import { LoadingScreen } from "../../components/PageTransition";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import { configureAxiosInterceptor } from "@/utils/axiosConfig";
import { logout as authLogout } from "@/utils/auth";
import { CheckCircle, XCircle, AlertTriangle, Shield, UserCheck, LayoutDashboard, LogOut, Upload, UserPlus } from "lucide-react";

interface Admin {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  role?: string;
  status?: string;
  isActive?: boolean;
}

const SuperAdminDashboard = () => {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "suspended">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPhone, setNewAdminPhone] = useState("");
  const [newAdminDob, setNewAdminDob] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const adminsPerPage = 10;

  // Configure axios interceptor once
  useEffect(() => {
    configureAxiosInterceptor();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      console.log('👥 Fetching admins...');
      const startTime = Date.now();
      
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
      
      // Ensure loading screen shows for at least 500ms
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 500 - elapsedTime);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      console.log('✅ Admins loaded');
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
        alert("Admin created successfully!");
        setShowCreateModal(false);
        setNewAdminName("");
        setNewAdminEmail("");
        setNewAdminPhone("");
        setNewAdminDob("");
        fetchAdmins();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || "Failed to create admin";
      alert(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (admin: Admin, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdminToDelete(admin);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;
    setIsDeleting(true);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.delete(`${base}/admin/${adminToDelete.email}`);

      if (res.data?.success) {
        alert("Admin deleted successfully!");
        setShowDeleteModal(false);
        setAdminToDelete(null);
        fetchAdmins();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || "Failed to delete admin";
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (admin: Admin, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const action = admin.isActive === false ? "activate" : "suspend";
    const confirmMsg = `Are you sure you want to ${action} ${admin.name}?`;
    
    if (!confirm(confirmMsg)) return;
    
    setIsTogglingStatus(true);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.patch(`${base}/admin/${admin.email}/status`, {
        isActive: admin.isActive === false ? true : false,
      });

      if (res.data?.success) {
        alert(res.data.message);
        fetchAdmins();
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e.message || "Failed to toggle admin status";
      alert(msg);
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
        
        // Skip header row
        const dataLines = lines.slice(1);
        
        const admins = dataLines.map(line => {
          const [name, email, phone, dob] = line.split(',').map(item => item.trim());
          return { name, email, phone, dob };
        }).filter(admin => admin.name && admin.email);

        if (admins.length === 0) {
          alert("No valid admin data found in CSV file");
          setIsImporting(false);
          return;
        }

        const base = process.env.NEXT_PUBLIC_BACKEND_URL;
        const res = await axios.post(`${base}/admin/bulk-create`, { admins });

        if (res.data?.success) {
          setImportResults(res.data.data);
          setShowUploadModal(false);
          setShowImportModal(true);
          fetchAdmins();
        }
      } catch (error: any) {
        const msg = error?.response?.data?.message || error.message || "Failed to import CSV";
        alert(msg);
      } finally {
        setIsImporting(false);
        // Reset file input
        e.target.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  const handleAdminClick = (email: string) => {
    router.push(`/superAdmin/admin-profile?adminEmail=${email}`);
  };

  const handleLogout = () => {
    authLogout();
  };

  useEffect(() => {
    // Set light theme background
    document.body.style.background = "#f8fafc";
    document.body.style.minHeight = "100vh";
    document.documentElement.style.background = "#f8fafc";
    
    return () => {
      document.body.style.background = "";
      document.body.style.minHeight = "";
      document.documentElement.style.background = "";
    };
  }, []);

  const filtered = admins.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && a.status === "Active";
    if (activeTab === "suspended") return matchesSearch && a.status === "Suspended";
    
    return matchesSearch;
  });

  // Show full page loading screen only on initial load
  if (initialLoading) {
    console.log('🔄 Admins page - showing loading screen');
    return (
      <SuperAdminGuard>
        <LoadingScreen message="Loading administrators..." />
      </SuperAdminGuard>
    );
  }

  return (
    <SuperAdminGuard>
      <div className={styles.dashboardContainer}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div>
            {/* Logo */}
            <div className={styles.logoSection}>
              <div className={styles.logoIcon}>
                <Shield size={20} color="white" />
              </div>
              <div>
                <div className={styles.logoText}>Super Admin</div>
                <div className={styles.logoSubtext}>Admin Portal</div>
              </div>
            </div>

            {/* Navigation */}
            <nav className={styles.nav}>
              <button
                onClick={() => router.push("/superAdmin")}
                className={styles.navButton}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
              <button
                onClick={() => router.push("/superAdmin/admins")}
                className={`${styles.navButton} ${styles.active}`}
              >
                <Shield size={18} />
                Admin Management
              </button>
              <button
                onClick={() => router.push("/superAdmin/students")}
                className={styles.navButton}
              >
                <UserCheck size={18} />
                Student Management
              </button>
            </nav>
          </div>

          {/* Logout Button */}
          <div>
            <button onClick={handleLogout} className={styles.logoutButton}>
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          {/* Modern Header */}
      <header style={{ marginBottom: "32px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #ffffff, #f1f5f9)",
            borderRadius: "12px",
            padding: "32px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "white",
                  boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4)",
                }}
              >
                <Shield size={32} color="white" />
              </div>
              <div>
                <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "700", color: "#1e293b" }}>
                  Admin Management
                </h1>
                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                  Manage your administrator team
                </p>
              </div>
            </div>
            
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => setShowUploadModal(true)}
                style={{
                  padding: "12px 24px",
                  background: "#f1f5f9",
                  color: "#1e293b",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "#0ea5e9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <Upload size={18} />
                Import CSV
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 16px rgba(14, 165, 233, 0.3)",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(14, 165, 233, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(14, 165, 233, 0.3)";
                }}
              >
                <UserPlus size={18} />
                Add Admin
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs and Search */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          {(["all", "active", "suspended"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                background: activeTab === tab ? "#0ea5e9" : "#f1f5f9",
                color: activeTab === tab ? "white" : "#64748b",
                border: activeTab === tab ? "none" : "1px solid #e2e8f0",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textTransform: "capitalize",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#0ea5e9";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }
              }}
            >
              {tab === "all" ? `All Admins (${admins.length})` : tab}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: "12px",
            border: "2px solid #e2e8f0",
            background: "#f8fafc",
            color: "#1e293b",
            fontSize: "15px",
            transition: "all 0.3s ease",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#0ea5e9";
            e.target.style.boxShadow = "0 4px 16px rgba(14, 165, 233, 0.2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e2e8f0";
            e.target.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.08)";
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0"
          }}
        >
          <p style={{ color: "#64748b", fontSize: "16px" }}>Loading administrators...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0"
          }}
        >
          <p style={{ color: "#1e293b", fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>
            No Admins Found
          </p>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            {search ? "Try adjusting your search criteria" : "Get started by creating your first admin"}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)"
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 240px",
              padding: "16px 24px",
              background: "#f1f5f9",
              borderBottom: "1px solid #e2e8f0",
              fontWeight: "700",
              fontSize: "13px",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            <div>Name</div>
            <div>Status</div>
            <div>Role</div>
            <div>Joined</div>
            <div style={{ textAlign: "right", paddingRight: "8px" }}>Actions</div>
          </div>

          {/* Table Body */}
          {filtered.map((admin) => (
            <div
              key={admin.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 240px",
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                alignItems: "center",
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onClick={() => handleAdminClick(admin.email)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Name with Avatar */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "15px" }}>
                    {admin.name}
                  </div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    {admin.email}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                <span
                  style={{
                    display: "inline-flex",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    background: admin.status === "Active" ? "var(--success-bg)" : "var(--danger-bg)",
                    color: admin.status === "Active" ? "#10b981" : "#dc2626",
                    border: `1.5px solid ${admin.status === "Active" ? "#10b981" : "#dc2626"}`,
                  }}
                >
                  {admin.status || "Active"}
                </span>
              </div>

              {/* Role Badge */}
              <div>
                <span
                  style={{
                    display: "inline-flex",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: "600",
                    background: "var(--primary-bg-light)",
                    color: "#0ea5e9",
                    border: "1px solid #0ea5e9",
                  }}
                >
                  {admin.role || "Admin"}
                </span>
              </div>

              {/* Joined Date */}
              <div style={{ fontSize: "14px", color: "#64748b" }}>
                {new Date(admin.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                <button
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#64748b",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    minWidth: "70px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdminClick(admin.email);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#0ea5e9";
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = "#0ea5e9";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#64748b";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  View
                </button>
                <button
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#64748b",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    minWidth: "85px",
                  }}
                  onClick={(e) => handleToggleStatus(admin, e)}
                  onMouseEnter={(e) => {
                    const warningColor = admin.isActive === false ? "#10b981" : "#f59e0b";
                    e.currentTarget.style.background = warningColor;
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = warningColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#64748b";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                  disabled={isTogglingStatus}
                >
                  {admin.isActive === false ? "Activate" : "Suspend"}
                </button>
                <button
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#64748b",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    minWidth: "70px",
                  }}
                  onClick={(e) => handleDeleteClick(admin, e)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#ef4444";
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = "#ef4444";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#64748b";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination Controls */}
      {!loading && filtered.length > 0 && (
        <div className={styles.paginationSection}>
          <div className={styles.paginationInfo}>
            Showing {((currentPage - 1) * adminsPerPage) + 1} to {Math.min(currentPage * adminsPerPage, totalCount)} of {totalCount} admins
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            
            <div className={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`${styles.pageNumber} ${currentPage === page ? styles.activePage : ''}`}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    background: currentPage === page ? '#3b82f6' : '#ffffff',
                    color: currentPage === page ? '#fff' : 'var(--text-color)',
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              className={styles.paginationButton}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
            animation: "modalFadeIn 0.3s ease-out"
          }}
          onClick={() => setShowUploadModal(false)}
        >
          <div
            style={{ 
              maxWidth: "600px", 
              width: "90%", 
              padding: "32px", 
              animation: "modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              margin: "0 0 8px 0", 
              fontSize: "24px", 
              fontWeight: "700", 
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              <svg 
                width="28" 
                height="28" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Import Admins from CSV
            </h2>
            <p style={{ margin: "0 0 24px 0", color: "#64748b", fontSize: "14px" }}>
              Upload a CSV or Excel file to bulk create admin accounts
            </p>

            {/* File Upload Area */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  padding: "40px 20px",
                  border: "2px dashed #e2e8f0",
                  borderRadius: "12px",
                  background: "#f1f5f9",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#0ea5e9";
                  e.currentTarget.style.background = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "#f1f5f9";
                }}
              >
                <svg 
                  width="48" 
                  height="48" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#0ea5e9" 
                  strokeWidth="2"
                  style={{ margin: "0 auto 16px" }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
                  {isImporting ? "Uploading..." : "Click to upload CSV or Excel file"}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  Supports .csv and .xlsx files
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleCSVImport}
                  disabled={isImporting}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            {/* Format Instructions */}
            <div style={{ 
              marginBottom: "24px",
              padding: "16px",
              background: "#f1f5f9",
              borderRadius: "12px",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: "600", 
                marginBottom: "12px", 
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                File Format Requirements
              </div>
              <ul style={{ 
                margin: "0", 
                paddingLeft: "20px", 
                fontSize: "13px", 
                color: "#64748b",
                lineHeight: "1.8"
              }}>
                <li>First row must be the header: <code style={{ 
                  background: "#ffffff", 
                  padding: "2px 6px", 
                  borderRadius: "4px",
                  fontSize: "12px"
                }}>name,email,phone,dob</code></li>
                <li>Each subsequent row represents one admin</li>
                <li>All fields are required for each admin</li>
                <li>Date of birth format: YYYY-MM-DD (e.g., 1990-01-15)</li>
              </ul>
            </div>

            {/* Sample CSV */}
            <div style={{ 
              marginBottom: "24px",
              padding: "16px",
              background: "#f1f5f9",
              borderRadius: "12px",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: "600", 
                marginBottom: "12px", 
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Sample CSV Format
              </div>
              <pre style={{ 
                margin: 0, 
                padding: "12px", 
                background: "#ffffff", 
                borderRadius: "8px", 
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#64748b",
                overflowX: "auto",
                border: "1px solid #e2e8f0",
                lineHeight: "1.6"
              }}>
{`name,email,phone,dob
John Doe,john@example.com,+1234567890,1990-01-15
Jane Smith,jane@example.com,+0987654321,1992-05-20
Bob Wilson,bob@example.com,+1122334455,1991-08-10`}
              </pre>
              <button
                onClick={() => {
                  const csvContent = `name,email,phone,dob
John Doe,john@example.com,+1234567890,1990-01-15
Jane Smith,jane@example.com,+0987654321,1992-05-20
Bob Wilson,bob@example.com,+1122334455,1991-08-10`;
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'admin_import_sample.csv';
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                style={{
                  marginTop: "12px",
                  padding: "8px 16px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#1e293b",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#0ea5e9";
                  e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Download Sample CSV
              </button>
            </div>

            {/* Close Button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  padding: "12px 24px",
                  background: "transparent",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.borderColor = "#cbd5e1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
            animation: "modalFadeIn 0.3s ease-out"
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{ 
              maxWidth: "500px", 
              width: "90%", 
              padding: "24px", 
              animation: "modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: "700" }}>
              Create New Admin
            </h2>
            <form onSubmit={handleCreateAdmin}>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                  Name
                </label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Enter admin name"
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="Enter admin email"
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newAdminPhone}
                  onChange={(e) => setNewAdminPhone(e.target.value)}
                  placeholder="Enter phone number"
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={newAdminDob}
                  onChange={(e) => setNewAdminDob(e.target.value)}
                  placeholder="Select date of birth"
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#ffffff",
                    color: "#1e293b",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                  style={{
                    padding: "12px 24px",
                    background: "transparent",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    color: "#64748b",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: isCreating ? "not-allowed" : "pointer",
                    opacity: isCreating ? 0.6 : 1,
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreating) {
                      e.currentTarget.style.background = "#f1f5f9";
                      e.currentTarget.style.borderColor = "#cbd5e1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                    border: "none",
                    borderRadius: "10px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: isCreating ? "not-allowed" : "pointer",
                    opacity: isCreating ? 0.6 : 1,
                    boxShadow: "0 4px 16px rgba(14, 165, 233, 0.3)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreating) {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 24px rgba(14, 165, 233, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(14, 165, 233, 0.3)";
                  }}
                >
                  {isCreating ? "Creating..." : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Admin Modal */}
      {showDeleteModal && adminToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
            animation: "modalFadeIn 0.3s ease-out"
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{ 
              maxWidth: "500px", 
              width: "90%", 
              padding: "24px", 
              animation: "modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>
              Delete Admin
            </h2>
            <p style={{ margin: "0 0 24px 0", fontSize: "15px", color: "#64748b", lineHeight: "1.6" }}>
              Are you sure you want to delete <strong style={{ color: "#1e293b" }}>{adminToDelete.name}</strong> ({adminToDelete.email})?
              <br />
              <span style={{ color: "#dc2626", fontWeight: "600", marginTop: "8px", display: "block" }}>
                This action cannot be undone.
              </span>
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setAdminToDelete(null);
                }}
                disabled={isDeleting}
                style={{
                  padding: "12px 24px",
                  background: "transparent",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  color: "#64748b",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.6 : 1,
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isDeleting) {
                    e.currentTarget.style.background = "#f1f5f9";
                    e.currentTarget.style.borderColor = "#cbd5e1";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{
                  padding: "12px 24px",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "600",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  opacity: isDeleting ? 0.6 : 1,
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isDeleting) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {isDeleting ? "Deleting..." : "Delete Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Results Modal */}
      {showImportModal && importResults && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
            animation: "modalFadeIn 0.3s ease-out"
          }}
          onClick={() => {
            setShowImportModal(false);
            setImportResults(null);
          }}
        >
          <div
            style={{ 
              maxWidth: "700px", 
              width: "90%", 
              padding: "24px", 
              animation: "modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>
              CSV Import Results
            </h2>
            
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <div style={{ 
                  flex: 1, 
                  padding: "16px", 
                  background: "var(--success-bg)", 
                  borderRadius: "12px",
                  border: "1px solid #10b981"
                }}>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#10b981" }}>
                    {importResults.successful?.length || 0}
                  </div>
                  <div style={{ fontSize: "14px", color: "#64748b" }}>Successful</div>
                </div>
                <div style={{ 
                  flex: 1, 
                  padding: "16px", 
                  background: "var(--danger-bg)", 
                  borderRadius: "12px",
                  border: "1px solid #dc2626"
                }}>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "#dc2626" }}>
                    {importResults.failed?.length || 0}
                  </div>
                  <div style={{ fontSize: "14px", color: "#64748b" }}>Failed</div>
                </div>
              </div>
            </div>

            {importResults.successful?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#10b981", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle size={18} /> Successfully Created ({importResults.successful.length})
                </h3>
                <div style={{ maxHeight: "200px", overflowY: "auto", background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
                  {importResults.successful.map((admin: any, index: number) => (
                    <div key={index} style={{ 
                      padding: "8px 0", 
                      borderBottom: index < importResults.successful.length - 1 ? "1px solid #e2e8f0" : "none",
                      fontSize: "14px"
                    }}>
                      <strong>{admin.name}</strong> ({admin.email})
                      {!admin.emailSent && (
                        <span style={{ color: "var(--warning-color)", marginLeft: "8px", display: "inline-flex", alignItems: "center", gap: "4px" }}><AlertTriangle size={14} /> Email not sent</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResults.failed?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}>
                  <XCircle size={18} /> Failed ({importResults.failed.length})
                </h3>
                <div style={{ maxHeight: "200px", overflowY: "auto", background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
                  {importResults.failed.map((admin: any, index: number) => (
                    <div key={index} style={{ 
                      padding: "8px 0", 
                      borderBottom: index < importResults.failed.length - 1 ? "1px solid #e2e8f0" : "none",
                      fontSize: "14px"
                    }}>
                      <strong>{admin.name}</strong> ({admin.email})
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                        Reason: {admin.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResults(null);
                }}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #0ea5e9, #3b82f6)",
                  border: "none",
                  borderRadius: "10px",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(14, 165, 233, 0.3)",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(14, 165, 233, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(14, 165, 233, 0.3)";
                }}
              >
                Close
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

export default SuperAdminDashboard;
