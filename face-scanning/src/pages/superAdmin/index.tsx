import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/CreateExamPage.module.css";
import { ThemeToggle } from "../../components/ThemeToggle";
import { SuperAdminGuard } from "../../components/guards";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";

interface DashboardStats {
  totalAdmins: number;
  activeAdmins: number;
  totalStudents: number;
  totalExams: number;
}

const SuperAdminDashboard = () => {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalAdmins: 0,
    activeAdmins: 0,
    totalStudents: 0,
    totalExams: 0,
  });
  const [loading, setLoading] = useState(true);

  axios.interceptors.request.use((config) => {
    const token = getTokenFromCookie();
    if (token) {
      config.headers = config.headers || ({} as any);
      (config.headers as any)["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  const fetchDashboardStats = async () => {
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      
      // Fetch admins
      const adminsRes = await axios.get(`${base}/admin/emails`);
      const admins = adminsRes.data?.data?.admins || [];
      
      setStats({
        totalAdmins: admins.length,
        activeAdmins: admins.filter((a: any) => a.status === "Active").length,
        totalStudents: 0, // You can add endpoint for students
        totalExams: 0, // You can add endpoint for total exams
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleLogout = () => {
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/");
  };

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
                <span style={{ fontSize: "18px", transition: "transform 0.3s ease" }}>📊</span>
                <span style={{ flex: 1 }}>Dashboard</span>
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
                onClick={() => router.push("/superAdmin/admins")}
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
                <span style={{ fontSize: "18px", transition: "transform 0.3s ease" }}>👥</span>
                Admin Management
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
                      Dashboard
                    </h1>
                    <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "14px" }}>
                      Manage your administrator team
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Stats Cards */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
            gap: "24px", 
            marginBottom: "32px"
          }}>
            {/* Total Admins */}
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px var(--shadow)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px var(--shadow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px var(--shadow)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  👥
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Total Admins
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {loading ? "..." : stats.totalAdmins}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "var(--success-color)" }}>
                  {stats.activeAdmins} Active
                </p>
              </div>
            </div>

            {/* Total Students */}
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px var(--shadow)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px var(--shadow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px var(--shadow)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  🎓
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Total Students
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {loading ? "..." : stats.totalStudents}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                  Across all exams
                </p>
              </div>
            </div>

            {/* Total Exams */}
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px var(--shadow)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px var(--shadow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px var(--shadow)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  📝
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Total Exams
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {loading ? "..." : stats.totalExams}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                  All time
                </p>
              </div>
            </div>

            {/* Active Admins */}
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: "16px",
                padding: "24px",
                border: "1px solid var(--border-color)",
                boxShadow: "0 4px 20px var(--shadow)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 32px var(--shadow)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 20px var(--shadow)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  ✅
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "var(--text-secondary)", fontWeight: "500" }}>
                  Active Admins
                </p>
                <h3 style={{ margin: 0, fontSize: "32px", fontWeight: "700", color: "var(--text-primary)" }}>
                  {loading ? "..." : stats.activeAdmins}
                </h3>
                <p style={{ margin: "8px 0 0 0", fontSize: "12px", color: "var(--success-color)" }}>
                  Currently online
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: "16px",
              padding: "24px",
              border: "1px solid var(--border-color)",
              boxShadow: "0 4px 20px var(--shadow)"
            }}
          >
            <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>
              Quick Actions
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <button
                onClick={() => router.push("/superAdmin/admins")}
                style={{
                  padding: "16px",
                  background: "var(--secondary-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent-color)";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "var(--accent-color)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontSize: "20px" }}>➕</span>
                <div>
                  <div style={{ fontWeight: "600" }}>Add New Admin</div>
                  <div style={{ fontSize: "12px", opacity: 0.8 }}>Create administrator account</div>
                </div>
              </button>

              <button
                onClick={() => router.push("/superAdmin/admins")}
                style={{
                  padding: "16px",
                  background: "var(--secondary-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent-color)";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "var(--accent-color)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--secondary-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <span style={{ fontSize: "20px" }}>👥</span>
                <div>
                  <div style={{ fontWeight: "600" }}>View All Admins</div>
                  <div style={{ fontSize: "12px", opacity: 0.8 }}>Manage administrator list</div>
                </div>
              </button>
            </div>
          </div>

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
