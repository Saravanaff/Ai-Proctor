import React, { useState, useEffect } from "react";
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
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
            <div key={admin.id} className={styles.examCard}>
              <h3>{admin.name}</h3>
              <p>{admin.email}</p>
              <p>Created: {new Date(admin.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      <ThemeToggle />
    </div>
  );
};

export default SuperAdminDashboard;
