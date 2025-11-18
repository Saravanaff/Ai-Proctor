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
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  axios.interceptors.request.use((config) => {
    const token = getTokenFromCookie();
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
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
          status: admin.status || "Active",
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
      });

      if (res.data?.success) {
        alert("Admin created successfully!");
        setShowCreateModal(false);
        setNewAdminName("");
        setNewAdminEmail("");
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

  const handleAdminClick = (email: string) => {
    router.push(`/superAdmin/admin-profile?adminEmail=${email}`);
  };

  const handleLogout = () => {
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/login");
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
      <div className={styles.examinerContainer} style={{ minHeight: "100vh", background: "var(--background)" }}>
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
              <button
                onClick={handleLogout}
                style={{
                  padding: "12px 20px",
                  background: "var(--secondary-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--danger-bg)";
                  e.currentTarget.style.color = "var(--danger-color)";
                  e.currentTarget.style.borderColor = "var(--danger-color)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                }}
              >
                Logout
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
            border: "1px solid var(--border-color)",
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
            border: "1px solid var(--border-color)",
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
            boxShadow: "0 4px 20px var(--shadow)",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 160px",
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
            <div style={{ textAlign: "center" }}>Actions</div>
          </div>

          {/* Table Body */}
          {filtered.map((admin) => (
            <div
              key={admin.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 160px",
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
              <div style={{ textAlign: "center", display: "flex", gap: "8px", justifyContent: "center" }}>
                <button
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
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
                    padding: "6px 12px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                  }}
                  onClick={(e) => handleDeleteClick(admin, e)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--danger-color)";
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor = "var(--danger-color)";
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
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className={styles.glassPanel}
            style={{ maxWidth: "500px", width: "90%", padding: "24px" }}
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
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className={styles.glassPanel}
            style={{ maxWidth: "500px", width: "90%", padding: "24px" }}
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

      <ThemeToggle />
    </div>
    </SuperAdminGuard>
  );
};

export default SuperAdminDashboard;
