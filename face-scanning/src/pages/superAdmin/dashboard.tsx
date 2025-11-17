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
              style={{ cursor: "pointer" }}
            >
              <h3>{admin.name}</h3>
              <p>{admin.email}</p>
              <p>Created: {new Date(admin.createdAt).toLocaleDateString()}</p>
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

      <ThemeToggle />
    </div>
  );
};

export default SuperAdminDashboard;
