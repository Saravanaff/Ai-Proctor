import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { setGlobalIdentity } from "@/constants/AuthStore";
import Link from "next/link";
import { Moon, Sun, Eye, EyeOff, ArrowRight, AlertCircle, Lock, Mail } from "lucide-react";

interface LoginFormProps {
  redirect: string;
}

const LoginForm = ({ redirect }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const themes = {
    dark: {
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      cardBg: "rgba(30, 41, 59, 0.8)",
      cardBorder: "rgba(51, 65, 85, 0.5)",
      textPrimary: "#f1f5f9",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      accentPrimary: "#3b82f6",
      inputBg: "rgba(15, 23, 42, 0.6)",
      inputBorder: "rgba(51, 65, 85, 0.6)",
    },
    light: {
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
      cardBg: "rgba(255, 255, 255, 0.95)",
      cardBorder: "rgba(203, 213, 225, 0.6)",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#64748b",
      accentPrimary: "#3b82f6",
      inputBg: "rgba(248, 250, 252, 0.9)",
      inputBorder: "rgba(203, 213, 225, 0.7)",
    }
  };

  const currentTheme = isDarkTheme ? themes.dark : themes.light;

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const endpoint = `${baseURL}/login`;
      const payload = { email, password };

      const config = {
        headers: { "Content-Type": "application/json" },
        withCredentials: false,
      };

      const { data } = await axios.post(endpoint, payload, config);

      const token: string | undefined = data?.token;
      const user = data?.user;

      if (!token || !user?.id || !user?.name || !user?.email) {
        throw new Error(data?.message || "Invalid response");
      }

      if (typeof window !== "undefined") {
        document.cookie = `authToken=${token}; Path=/; Max-Age=${
          60 * 60 * 2
        }; SameSite=Lax`;
        setGlobalIdentity(user.name, user.email, user.id);
      }

      let dest = redirect as string;
      if (!dest) {
        if (user.role === "HEAD") {
          dest = "/superAdmin";
        } else if (user.role === "examiner" || user.role === "admin") {
          dest = "/examiner/CreateExamPage";
        } else if (user.role === "student") {
          dest = "/candidate/JoinExam";
        } else {
          dest = "/";
        }
      }

      await router.replace(dest);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Something went wrong"
      );
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: currentTheme.background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      transition: "background 0.3s ease",
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: "absolute",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: isDarkTheme ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)",
        filter: "blur(80px)",
        top: "-200px",
        right: "-100px",
        animation: "float 8s ease-in-out infinite",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute",
        width: "300px",
        height: "300px",
        borderRadius: "50%",
        background: isDarkTheme ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.1)",
        filter: "blur(80px)",
        bottom: "-150px",
        left: "-50px",
        animation: "float 10s ease-in-out infinite reverse",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: "460px",
        width: "100%",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          textAlign: "center",
          marginBottom: "32px",
          animation: "slideDown 0.6s ease",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "24px",
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(59, 130, 246, 0.4)",
            }}>
              <Lock size={24} color="#ffffff" strokeWidth={2.5} />
            </div>
            <span style={{
              fontSize: "28px",
              fontWeight: "800",
              color: currentTheme.textPrimary,
              letterSpacing: "-0.02em",
              transition: "color 0.3s ease",
            }}>AI Proctor</span>
          </div>
          <h1 style={{
            fontSize: "32px",
            fontWeight: "800",
            color: currentTheme.textPrimary,
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
            transition: "color 0.3s ease",
          }}>Welcome Back</h1>
          <p style={{
            fontSize: "15px",
            color: currentTheme.textSecondary,
            margin: 0,
            transition: "color 0.3s ease",
          }}>
            Sign in to access your exam dashboard
          </p>
        </div>

        <div style={{
          background: currentTheme.cardBg,
          backdropFilter: "blur(40px)",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          border: `1px solid ${currentTheme.cardBorder}`,
          transition: "all 0.3s ease",
          animation: "scaleIn 0.6s ease",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: currentTheme.textPrimary,
                marginBottom: "8px",
                transition: "color 0.3s ease",
              }}>Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail size={18} color={currentTheme.textMuted} style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  transition: "color 0.3s ease",
                }} />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px 14px 48px",
                    fontSize: "15px",
                    background: currentTheme.inputBg,
                    border: `2px solid ${currentTheme.inputBorder}`,
                    borderRadius: "12px",
                    color: currentTheme.textPrimary,
                    outline: "none",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.accentPrimary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.inputBorder;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: currentTheme.textPrimary,
                marginBottom: "8px",
                transition: "color 0.3s ease",
              }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={18} color={currentTheme.textMuted} style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  transition: "color 0.3s ease",
                }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: "100%",
                    padding: "14px 52px 14px 48px",
                    fontSize: "15px",
                    background: currentTheme.inputBg,
                    border: `2px solid ${currentTheme.inputBorder}`,
                    borderRadius: "12px",
                    color: currentTheme.textPrimary,
                    outline: "none",
                    transition: "all 0.3s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.accentPrimary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${isDarkTheme ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.inputBorder;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    color: currentTheme.textMuted,
                    transition: "color 0.3s ease",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = currentTheme.accentPrimary}
                  onMouseLeave={(e) => e.currentTarget.style.color = currentTheme.textMuted}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div style={{ textAlign: "right", marginTop: "8px" }}>
                <Link href="/auth/forgot-password" style={{
                  fontSize: "14px",
                  color: currentTheme.accentPrimary,
                  textDecoration: "none",
                  fontWeight: "600",
                  transition: "opacity 0.3s ease",
                }}>
                  Forgot Password?
                </Link>
              </div>
            </div>

            {error && (
              <div style={{
                padding: "14px 16px",
                borderRadius: "12px",
                background: isDarkTheme ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${isDarkTheme ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.3)"}`,
                display: "flex",
                alignItems: "center",
                gap: "12px",
                animation: "slideIn 0.3s ease",
              }}>
                <AlertCircle size={18} color="#ef4444" strokeWidth={2.5} />
                <span style={{
                  fontSize: "14px",
                  color: "#ef4444",
                  fontWeight: "500",
                }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "16px",
                fontWeight: "700",
                color: "#ffffff",
                background: loading
                  ? (isDarkTheme ? "rgba(100, 116, 139, 0.5)" : "rgba(148, 163, 184, 0.5)")
                  : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                border: "none",
                borderRadius: "12px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: loading ? "none" : "0 4px 16px rgba(59, 130, 246, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                letterSpacing: "0.5px",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(59, 130, 246, 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(59, 130, 246, 0.4)";
                }
              }}
            >
              {loading ? (
                <div style={{
                  width: "20px",
                  height: "20px",
                  border: "3px solid rgba(255, 255, 255, 0.3)",
                  borderTop: "3px solid #ffffff",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            margin: "24px 0",
          }}>
            <div style={{ flex: 1, height: "1px", background: currentTheme.inputBorder, transition: "background 0.3s ease" }} />
            <span style={{ fontSize: "14px", color: currentTheme.textMuted, fontWeight: "500", transition: "color 0.3s ease" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: currentTheme.inputBorder, transition: "background 0.3s ease" }} />
          </div>

          <Link href="/auth/register" style={{
            display: "block",
            width: "100%",
            padding: "14px",
            fontSize: "15px",
            fontWeight: "600",
            color: currentTheme.accentPrimary,
            background: isDarkTheme ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.08)",
            border: `2px solid ${isDarkTheme ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)"}`,
            borderRadius: "12px",
            textAlign: "center",
            textDecoration: "none",
            transition: "all 0.3s ease",
          }}>Need an account? Create one</Link>
        </div>

        <p style={{
          textAlign: "center",
          fontSize: "13px",
          color: currentTheme.textMuted,
          marginTop: "24px",
          lineHeight: 1.6,
          transition: "color 0.3s ease",
        }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsDarkTheme(!isDarkTheme)}
        style={{
          position: "fixed",
          bottom: "32px",
          right: "32px",
          padding: "14px",
          borderRadius: "50%",
          background: currentTheme.cardBg,
          backdropFilter: "blur(20px)",
          border: `2px solid ${currentTheme.cardBorder}`,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          transition: "all 0.3s ease",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
        }}
      >
        {isDarkTheme ? <Sun size={20} color={currentTheme.textPrimary} strokeWidth={2.5} /> : <Moon size={20} color={currentTheme.textPrimary} strokeWidth={2.5} />}
      </button>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -30px); }
          66% { transform: translate(-20px, 20px); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginForm;
