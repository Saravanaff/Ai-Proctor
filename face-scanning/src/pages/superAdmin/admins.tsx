import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/CreateExamPage.module.css";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SuperAdminGuard } from "../../components/guards";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";

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

  axios.interceptors.request.use((config) => {
    const token = getTokenFromCookie();
    if (token) {
      config.headers = config.headers || ({} as any);
      (config.headers as any)["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  const fetchAdmins = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.get(`${base}/admin/emails`);
      if (res.data?.success) {
        const adminsWithStatus = res.data.data.admins.map((admin: Admin) => ({
          ...admin,
          role: admin.role || "Admin",
          status: admin.isActive === false ? "Suspended" : "Active",
        }));
        setAdmins(adminsWithStatus);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

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
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/");
  };

  const filtered = admins.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "active") return matchesSearch && a.status === "Active";
    if (activeTab === "suspended") return matchesSearch && a.status === "Suspended";
    
    return matchesSearch;
  });

  return (
    <SuperAdminGuard>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--background)" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: "260px",
            background: "var(--card-bg)",
            borderRight: "1px solid var(--border-color)",
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "fixed",
            height: "100vh",
            left: 0,
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Logo/Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "32px",
                padding: "0 8px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "white",
                  boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)",
                }}
              >
                SA
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                  Super Admin
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Admin Portal
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button
                onClick={() => router.push("/superAdmin")}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "none",
                  borderRadius: "10px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.paddingLeft = "20px";
                  const icon = e.currentTarget.querySelector("span") as HTMLElement;
                  if (icon) icon.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.paddingLeft = "16px";
                  const icon = e.currentTarget.querySelector("span") as HTMLElement;
                  if (icon) icon.style.transform = "scale(1)";
                }}
              >
                <span style={{ fontSize: "18px", transition: "transform 0.3s ease" }}>📊</span>
                Dashboard
              </button>
              <button
                onClick={() => router.push("/superAdmin/admins")}
                style={{
                  padding: "12px 16px",
                  background: "var(--accent-color)",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <span style={{ fontSize: "18px", transition: "transform 0.3s ease" }}>👥</span>
                <span style={{ flex: 1 }}>Admin Management</span>
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "4px",
                    background: "white",
                    borderRadius: "10px 0 0 10px",
                  }}
                />
              </button>
              <button
                onClick={() => router.push("/superAdmin/students")}
                style={{
                  padding: "12px 16px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "none",
                  borderRadius: "10px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.paddingLeft = "20px";
                  const icon = e.currentTarget.querySelector("span") as HTMLElement;
                  if (icon) icon.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                  e.currentTarget.style.paddingLeft = "16px";
                  const icon = e.currentTarget.querySelector("span") as HTMLElement;
                  if (icon) icon.style.transform = "scale(1)";
                }}
              >
                <span style={{ fontSize: "18px", transition: "transform 0.3s ease" }}>🎓</span>
                Student Management
              </button>
            </nav>
          </div>

          {/* Logout at bottom */}
          <div>
            <button
              onClick={handleLogout}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                textAlign: "left",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--danger-bg)";
                e.currentTarget.style.color = "var(--danger-color)";
                e.currentTarget.style.borderColor = "var(--danger-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              <span style={{ fontSize: "18px" }}>🚪</span>
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div style={{ marginLeft: "260px", flex: 1, padding: "32px" }}>
          <style jsx>{`
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateX(-20px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            
            @keyframes modalFadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            
            @keyframes modalSlideUp {
              from {
                opacity: 0;
                transform: translateY(30px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
      {/* Modern Header */}
      <header style={{ marginBottom: "32px" }}>
        <div
          style={{
            background: "linear-gradient(135deg, var(--card-bg), var(--secondary-bg))",
            borderRadius: "24px",
            padding: "32px",
            border: "1px solid var(--border-color)",
            boxShadow: "0 8px 32px var(--shadow)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "5px",
              background: "linear-gradient(90deg, var(--accent-color), var(--primary-color))",
            }}
          />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "white",
                  boxShadow: "0 8px 24px rgba(14, 165, 233, 0.4)",
                }}
              >
                SA
              </div>
              <div>
                <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", fontWeight: "700", color: "var(--text-primary)" }}>
                  Admin Management
                </h1>
                <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
                  Manage your administrator team
                </p>
              </div>
            </div>
            
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => setShowUploadModal(true)}
                style={{
                  padding: "12px 24px",
                  background: "var(--secondary-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
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
                  e.currentTarget.style.borderColor = "var(--accent-color)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              >
                <svg 
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Import CSV
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
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
                <span style={{ fontSize: "16px" }}>+</span>
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
                background: activeTab === tab ? "var(--accent-color)" : "var(--secondary-bg)",
                color: activeTab === tab ? "white" : "var(--text-secondary)",
                border: activeTab === tab ? "none" : "1px solid var(--border-color)",
                borderRadius: "10px",
                fontWeight: "600",
                fontSize: "14px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textTransform: "capitalize",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.background = "var(--card-bg)";
                  e.currentTarget.style.borderColor = "var(--accent-color)";
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
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
            border: "2px solid var(--border-color)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: "15px",
            transition: "all 0.3s ease",
            boxShadow: "0 2px 8px var(--shadow)",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--accent-color)";
            e.target.style.boxShadow = "0 4px 16px rgba(14, 165, 233, 0.2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-color)";
            e.target.style.boxShadow = "0 2px 8px var(--shadow)";
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--card-bg)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)"
          }}
        >
          <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>Loading administrators...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--card-bg)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)"
          }}
        >
          <p style={{ color: "var(--text-primary)", fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>
            No Admins Found
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            {search ? "Try adjusting your search criteria" : "Get started by creating your first admin"}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "16px",
            border: "1px solid var(--border-color)",
            overflow: "hidden",
            boxShadow: "0 4px 20px var(--shadow)"
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 240px",
              padding: "16px 24px",
              background: "var(--secondary-bg)",
              borderBottom: "1px solid var(--border-color)",
              fontWeight: "700",
              fontSize: "13px",
              color: "var(--text-secondary)",
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
                borderBottom: "1px solid var(--border-color)",
                alignItems: "center",
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onClick={() => handleAdminClick(admin.email)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--secondary-bg)";
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
                    background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
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
                  <div style={{ fontWeight: "600", color: "var(--text-primary)", fontSize: "15px" }}>
                    {admin.name}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
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
                    color: admin.status === "Active" ? "var(--success-color)" : "var(--danger-color)",
                    border: `1.5px solid ${admin.status === "Active" ? "var(--success-color)" : "var(--danger-color)"}`,
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
                    color: "var(--accent-color)",
                    border: "1px solid var(--accent-color)",
                  }}
                >
                  {admin.role || "Admin"}
                </span>
              </div>

              {/* Joined Date */}
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
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
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-secondary)",
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
                    e.currentTarget.style.background = "var(--accent-color)";
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = "var(--accent-color)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  View
                </button>
                <button
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-secondary)",
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
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                  disabled={isTogglingStatus}
                >
                  {admin.isActive === false ? "Activate" : "Suspend"}
                </button>
                <button
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-secondary)",
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
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
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
            className={styles.glassPanel}
            style={{ 
              maxWidth: "600px", 
              width: "90%", 
              padding: "32px", 
              animation: "modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              margin: "0 0 8px 0", 
              fontSize: "24px", 
              fontWeight: "700", 
              color: "var(--text-primary)",
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
            <p style={{ margin: "0 0 24px 0", color: "var(--text-secondary)", fontSize: "14px" }}>
              Upload a CSV or Excel file to bulk create admin accounts
            </p>

            {/* File Upload Area */}
            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  padding: "40px 20px",
                  border: "2px dashed var(--border-color)",
                  borderRadius: "12px",
                  background: "var(--secondary-bg)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-color)";
                  e.currentTarget.style.background = "var(--card-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.background = "var(--secondary-bg)";
                }}
              >
                <svg 
                  width="48" 
                  height="48" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="var(--accent-color)" 
                  strokeWidth="2"
                  style={{ margin: "0 auto 16px" }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
                  {isImporting ? "Uploading..." : "Click to upload CSV or Excel file"}
                </div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
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
              background: "var(--secondary-bg)",
              borderRadius: "12px",
              border: "1px solid var(--border-color)"
            }}>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: "600", 
                marginBottom: "12px", 
                color: "var(--text-primary)",
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
                color: "var(--text-secondary)",
                lineHeight: "1.8"
              }}>
                <li>First row must be the header: <code style={{ 
                  background: "var(--card-bg)", 
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
              background: "var(--secondary-bg)",
              borderRadius: "12px",
              border: "1px solid var(--border-color)"
            }}>
              <div style={{ 
                fontSize: "14px", 
                fontWeight: "600", 
                marginBottom: "12px", 
                color: "var(--text-primary)",
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
                background: "var(--card-bg)", 
                borderRadius: "8px", 
                fontSize: "12px",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
                overflowX: "auto",
                border: "1px solid var(--border-color)",
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
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-color)";
                  e.currentTarget.style.background = "var(--secondary-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.background = "var(--card-bg)";
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
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ padding: "12px 24px", borderRadius: "10px", fontWeight: "600" }}
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
            className={styles.glassPanel}
            style={{ maxWidth: "500px", width: "90%", padding: "24px", animation: "modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
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
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    background: "var(--card-bg)",
                    color: "var(--text-primary)",
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
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    background: "var(--card-bg)",
                    color: "var(--text-primary)",
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
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    background: "var(--card-bg)",
                    color: "var(--text-primary)",
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
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    background: "var(--card-bg)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`${styles.btn} ${styles.btnGhost}`}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={isCreating}
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
            className={styles.glassPanel}
            style={{ maxWidth: "500px", width: "90%", padding: "24px", animation: "modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px 0", fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>
              Delete Admin
            </h2>
            <p style={{ margin: "0 0 24px 0", fontSize: "15px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              Are you sure you want to delete <strong style={{ color: "var(--text-primary)" }}>{adminToDelete.name}</strong> ({adminToDelete.email})?
              <br />
              <span style={{ color: "var(--danger-color)", fontWeight: "600", marginTop: "8px", display: "block" }}>
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
                className={`${styles.btn} ${styles.btnGhost}`}
                disabled={isDeleting}
                style={{
                  padding: "12px 24px",
                  borderRadius: "10px",
                  fontWeight: "600",
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
                  background: "var(--danger-color)",
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
            className={styles.glassPanel}
            style={{ 
              maxWidth: "700px", 
              width: "90%", 
              padding: "24px", 
              animation: "modalSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              maxHeight: "80vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: "700", color: "var(--text-primary)" }}>
              CSV Import Results
            </h2>
            
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                <div style={{ 
                  flex: 1, 
                  padding: "16px", 
                  background: "var(--success-bg)", 
                  borderRadius: "12px",
                  border: "1px solid var(--success-color)"
                }}>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--success-color)" }}>
                    {importResults.successful?.length || 0}
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Successful</div>
                </div>
                <div style={{ 
                  flex: 1, 
                  padding: "16px", 
                  background: "var(--danger-bg)", 
                  borderRadius: "12px",
                  border: "1px solid var(--danger-color)"
                }}>
                  <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--danger-color)" }}>
                    {importResults.failed?.length || 0}
                  </div>
                  <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Failed</div>
                </div>
              </div>
            </div>

            {importResults.successful?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "var(--success-color)" }}>
                  ✅ Successfully Created ({importResults.successful.length})
                </h3>
                <div style={{ maxHeight: "200px", overflowY: "auto", background: "var(--secondary-bg)", padding: "12px", borderRadius: "8px" }}>
                  {importResults.successful.map((admin: any, index: number) => (
                    <div key={index} style={{ 
                      padding: "8px 0", 
                      borderBottom: index < importResults.successful.length - 1 ? "1px solid var(--border-color)" : "none",
                      fontSize: "14px"
                    }}>
                      <strong>{admin.name}</strong> ({admin.email})
                      {!admin.emailSent && (
                        <span style={{ color: "var(--warning-color)", marginLeft: "8px" }}>⚠️ Email not sent</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {importResults.failed?.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "var(--danger-color)" }}>
                  ❌ Failed ({importResults.failed.length})
                </h3>
                <div style={{ maxHeight: "200px", overflowY: "auto", background: "var(--secondary-bg)", padding: "12px", borderRadius: "8px" }}>
                  {importResults.failed.map((admin: any, index: number) => (
                    <div key={index} style={{ 
                      padding: "8px 0", 
                      borderBottom: index < importResults.failed.length - 1 ? "1px solid var(--border-color)" : "none",
                      fontSize: "14px"
                    }}>
                      <strong>{admin.name}</strong> ({admin.email})
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
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
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ padding: "12px 24px", borderRadius: "10px", fontWeight: "600" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Floating Theme Toggle */}
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 1200,
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: 12,
              padding: 8,
              boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
            }}
          >
            <ThemeToggle />
          </div>
        </div>
        </div>
      </div>
    </SuperAdminGuard>
  );
};

export default SuperAdminDashboard;
