import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/CreateExamPage.module.css";
import { ThemeToggle } from "../../components/ThemeToggle";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";

interface Admin {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

const SuperAdminDashboard = () => {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);
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
      if (res.data?.success) setAdmins(res.data.data.admins);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleLogout = () => {
    try {
      // clear token cookie
      document.cookie =
        "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      // clear localStorage
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("globalName");
    } finally {
      // redirect to login page
      window.location.href = "/";
    }
  };

  const handleAdminClick = (adminEmail: string) => {
    router.push(`/superAdmin/admin-profile?adminEmail=${encodeURIComponent(adminEmail)}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, admin: Admin) => {
    e.stopPropagation(); // Prevent card click
    setAdminToDelete(admin);
    setShowDeleteModal(true);
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    
    setIsDeleting(true);
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const res = await axios.delete(`${base}/admin/${encodeURIComponent(adminToDelete.email)}`);

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

  const filtered = admins.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.examinerContainer} style={{ minHeight: "100vh" }}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Super Admin Dashboard</h1>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            + Create Admin
          </button>
          <button
            onClick={handleLogout}
            className={`${styles.btn} ${styles.btnGhost}`}
            style={{ marginLeft: "12px" }}
          >
            Logout
          </button>
        </div>
      </header>

      <input
        type="text"
        placeholder="Search admins..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px" }}
      />

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className={styles.examsGrid}>
          {filtered.map((admin) => (
            <div
              key={admin.id}
              className={styles.examCard}
              onClick={() => handleAdminClick(admin.email)}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <h3>{admin.name}</h3>
              <p>{admin.email}</p>
              <p>Created: {new Date(admin.createdAt).toLocaleDateString()}</p>
              
              <button
                onClick={(e) => handleDeleteClick(e, admin)}
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  background: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  border: "1px solid #ef4444",
                }}
              >
                Delete
              </button>
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

      {/* Delete Confirmation Modal */}
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
            <h2 style={{ margin: "0 0 16px 0", fontSize: "24px", fontWeight: "700", color: "#ef4444" }}>
              Confirm Delete
            </h2>
            <p style={{ marginBottom: "16px", fontSize: "16px", lineHeight: "1.5" }}>
              Are you sure you want to delete the admin account for:
            </p>
            <div style={{
              padding: "16px",
              background: "rgba(239, 68, 68, 0.1)",
              borderRadius: "8px",
              marginBottom: "24px",
              border: "1px solid rgba(239, 68, 68, 0.3)"
            }}>
              <p style={{ margin: "4px 0", fontWeight: "600", fontSize: "16px" }}>
                {adminToDelete.name}
              </p>
              <p style={{ margin: "4px 0", opacity: 0.8 }}>
                {adminToDelete.email}
              </p>
            </div>
            <p style={{ marginBottom: "24px", fontSize: "14px", opacity: 0.8 }}>
              This action cannot be undone. All exams created by this admin will remain in the system.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={`${styles.btn} ${styles.btnGhost}`}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdmin}
                className={`${styles.btn}`}
                disabled={isDeleting}
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "none",
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
  );
};

export default SuperAdminDashboard;
