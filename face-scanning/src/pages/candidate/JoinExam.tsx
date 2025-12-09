import React, { useState, useEffect } from "react";
import axios from "axios";
import { getTokenFromCookie, setExamId } from "@/constants/AuthStore";
import { configureAxiosInterceptor } from "@/utils/axiosConfig";
import { logout as authLogout, getUserName, getUserInitials } from "@/utils/auth";
import { useRouter } from "next/router";
import { LoadingScreen } from "@/components/PageTransition";
import { 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  Video, 
  Mic, 
  Monitor,
  LogOut,
  Sparkles
} from "lucide-react";

const JoinExam = () => {
  const [examKey, setExamKey] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileInitials, setProfileInitials] = useState<string>("U");
  const router = useRouter();

  // Enforce light theme
  useEffect(() => {
    document.body.style.background = "#f8fafc";
    document.body.style.minHeight = "100vh";
    return () => {
      document.body.style.background = "";
      document.body.style.minHeight = "";
    };
  }, []);

  // Configure axios interceptor once
  useEffect(() => {
    configureAxiosInterceptor();
  }, []);

  const handleJoinExam = async () => {
    if (!examKey.trim()) {
      setError("Please enter an exam key");
      return;
    }

    setIsJoining(true);
    setError(null);
    setSuccess(null);

    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL;
      const payload = {
        exam_key: examKey.trim(),
      };

      const res = await axios.post(`${base}/joinExam`, payload);

      if (res.data.success) {
        setSuccess("Successfully joined the exam.");
        setExamId(res.data.exam.id);
        setExamKey("");
        router.push("/photo");
      }
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e.message || "Failed to join exam"
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isJoining) {
      handleJoinExam();
    }
  };

  const handleLogout = () => {
    authLogout();
  };

  // Parse JWT payload to get user name
  useEffect(() => {
    const name = getUserName();
    if (name) {
      setProfileName(name);
      setProfileInitials(getUserInitials());
    }
  }, []);

  // Professional High-Tech Black Theme Configuration
  const themes = {
    dark: {
      background: "#0f172a",
      navBg: "rgba(26, 26, 46, 0.95)",
      navBorder: "rgba(71, 85, 105, 0.5)",
      logoBg: "#3b82f6",
      logoBorder: "rgba(71, 85, 105, 0.5)",
      logoShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
      titleColor: "white",
      subtitleColor: "rgba(226, 232, 240, 1)",
      textColor: "white",
      textSecondary: "rgba(226, 232, 240, 1)",
      featureCardBg: "rgba(30, 41, 59, 0.8)",
      featureCardBorder: "rgba(71, 85, 105, 0.5)",
      featureIconBg: "rgba(59, 130, 246, 0.15)",
      featureIconColor: "#3b82f6",
      formBg: "rgba(255, 255, 255, 0.98)",
      formShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
      formBorder: "rgba(226, 232, 240, 0.2)",
      formHeaderBg: "#3b82f6",
      formHeaderShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
      formTitleColor: "#ffffff",
      formTextColor: "#64748b",
      inputBorder: "#e2e8f0",
      inputBg: "#f8fafc",
      inputColor: "#0f172a",
      inputFocusBorder: "#3b82f6",
      inputFocusShadow: "0 0 0 4px rgba(59, 130, 246, 0.15)",
      buttonBg: "#3b82f6",
      buttonShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
      buttonHoverShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
      instructionBg: "#f8fafc",
      instructionBorder: "#e2e8f0",
      bulletColor: "#3b82f6",
    },
    light: {
      background: "#f8fafc",
      navBg: "rgba(255, 255, 255, 0.8)",
      navBorder: "rgba(226, 232, 240, 0.8)",
      logoBg: "#3b82f6",
      logoBorder: "rgba(203, 213, 225, 0.5)",
      logoShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      titleColor: "#0f172a",
      subtitleColor: "rgba(100, 116, 139, 1)",
      textColor: "#0f172a",
      textSecondary: "rgba(71, 85, 105, 1)",
      featureCardBg: "rgba(255, 255, 255, 0.7)",
      featureCardBorder: "rgba(226, 232, 240, 0.8)",
      featureIconBg: "rgba(59, 130, 246, 0.15)",
      featureIconColor: "#3b82f6",
      formBg: "rgba(255, 255, 255, 0.95)",
      formShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      formBorder: "rgba(226, 232, 240, 0.5)",
      formHeaderBg: "#3b82f6",
      formHeaderShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      formTitleColor: "#0f172a",
      formTextColor: "#64748b",
      inputBorder: "#cbd5e1",
      inputBg: "#ffffff",
      inputColor: "#0f172a",
      inputFocusBorder: "#3b82f6",
      inputFocusShadow: "0 0 0 4px rgba(59, 130, 246, 0.1)",
      buttonBg: "#3b82f6",
      buttonShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      buttonHoverShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
      instructionBg: "#ffffff",
      instructionBorder: "#e2e8f0",
      bulletColor: "#3b82f6",
    }
  };

  const theme = themes.light;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.background,
        position: "relative",
        overflow: "hidden",
        transition: "background 0.3s ease",
      }}
    >
      {/* Top Navigation */}
      <nav
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "24px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: theme.logoBg,
              backdropFilter: "blur(20px)",
              border: `1px solid ${theme.logoBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: theme.logoShadow,
              transition: "all 0.3s ease",
            }}
          >
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: theme.titleColor,
                letterSpacing: "-0.02em",
                transition: "color 0.3s ease",
              }}
            >
              AI Proctor
            </div>
            <div
              style={{
                fontSize: "11px",
                color: theme.subtitleColor,
                fontWeight: "500",
                transition: "color 0.3s ease",
              }}
            >
              Smart Examination
            </div>
          </div>
        </div>

        {/* User Profile & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 16px 8px 8px",
              borderRadius: "100px",
              background: theme.navBg,
              backdropFilter: "blur(20px)",
              border: `1px solid ${theme.navBorder}`,
              transition: "all 0.3s ease",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "700",
                color: "white",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              {profileInitials}
            </div>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: theme.titleColor,
                transition: "color 0.3s ease",
              }}
            >
              {profileName || "Student"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              borderRadius: "12px",
              background: theme.navBg,
              backdropFilter: "blur(20px)",
              border: `1px solid ${theme.navBorder}`,
              color: theme.titleColor,
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(226, 232, 240, 0.9)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.navBg;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            alignItems: "center",
          }}
        >
          {/* Left Side - Information */}
          <div style={{ padding: "0 20px" }}>
            <div
              style={{
                fontSize: "48px",
                fontWeight: "800",
                color: theme.textColor,
                marginBottom: "20px",
                letterSpacing: "-0.03em",
                lineHeight: "1.1",
                transition: "color 0.3s ease",
              }}
            >
              Welcome to Your
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Online Exam
              </span>
            </div>
            <p
              style={{
                fontSize: "18px",
                color: theme.textSecondary,
                marginBottom: "40px",
                lineHeight: "1.6",
                transition: "color 0.3s ease",
              }}
            >
              Enter your exam key to begin. Make sure you're in a quiet environment with stable internet.
            </p>

            {/* Feature List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { icon: Wifi, text: "Secure Connection" },
                { icon: Video, text: "Camera Monitoring" },
                { icon: Mic, text: "Audio Detection" },
                { icon: Monitor, text: "Screen Recording" },
              ].map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "12px",
                    background: theme.featureCardBg,
                    backdropFilter: "blur(10px)",
                    border: `1px solid ${theme.featureCardBorder}`,
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: theme.featureIconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.3s ease",
                    }}
                  >
                    <item.icon size={20} color={theme.featureIconColor} />
                  </div>
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: "600",
                      color: theme.textColor,
                      transition: "color 0.3s ease",
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Join Form */}
          <div
            style={{
              background: theme.formBg,
              backdropFilter: "blur(40px)",
              borderRadius: "24px",
              padding: "48px",
              boxShadow: theme.formShadow,
              border: `1px solid ${theme.formBorder}`,
              transition: "all 0.3s ease",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: "32px", textAlign: "center" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  background: theme.formHeaderBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  boxShadow: theme.formHeaderShadow,
                  transition: "all 0.3s ease",
                }}
              >
                <KeyRound size={28} color="white" />
              </div>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: theme.formTitleColor,
                  marginBottom: "8px",
                  letterSpacing: "-0.02em",
                  transition: "color 0.3s ease",
                }}
              >
                Join Your Exam
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: theme.formTextColor,
                  lineHeight: "1.5",
                  transition: "color 0.3s ease",
                }}
              >
                Enter the 6-digit key provided by your examiner
              </p>
            </div>

            {/* Exam Key Input */}
            <div style={{ marginBottom: "24px" }}>
              <label
                htmlFor="examKey"
                style={{
                  display: "block",
                  marginBottom: "10px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: theme.formTextColor,
                  letterSpacing: "-0.01em",
                  transition: "color 0.3s ease",
                }}
              >
                Exam Key
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="examKey"
                  type="text"
                  value={examKey}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setExamKey(value);
                    setError(null);
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="000000"
                  disabled={isJoining}
                  maxLength={6}
                  style={{
                    width: "100%",
                    padding: "16px 20px",
                    fontSize: "20px",
                    fontWeight: "700",
                    letterSpacing: "0.3em",
                    textAlign: "center",
                    borderRadius: "16px",
                    border: error 
                      ? "2px solid #ef4444" 
                      : `2px solid ${theme.inputBorder}`,
                    background: theme.inputBg,
                    color: theme.inputColor,
                    outline: "none",
                    transition: "all 0.3s ease",
                    fontFamily: "monospace",
                  }}
                  onFocus={(e) => {
                    if (!error) {
                      e.currentTarget.style.border = `2px solid ${theme.inputFocusBorder}`;
                      e.currentTarget.style.boxShadow = theme.inputFocusShadow;
                    }
                  }}
                  onBlur={(e) => {
                    if (!error) {
                      e.currentTarget.style.border = `2px solid ${theme.inputBorder}`;
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                />
              </div>
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  color: theme.formTextColor,
                  textAlign: "center",
                  transition: "color 0.3s ease",
                }}
              >
                {examKey.length}/6 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "start",
                  gap: "12px",
                  animation: "slideDown 0.3s ease",
                }}
              >
                <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#dc2626",
                      marginBottom: "2px",
                    }}
                  >
                    Error
                  </div>
                  <div style={{ fontSize: "13px", color: "#ef4444" }}>
                    {error}
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "start",
                  gap: "12px",
                  animation: "slideDown 0.3s ease",
                }}
              >
                <CheckCircle2 size={20} color="#22c55e" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#16a34a",
                      marginBottom: "2px",
                    }}
                  >
                    Success
                  </div>
                  <div style={{ fontSize: "13px", color: "#22c55e" }}>
                    {success}
                  </div>
                </div>
              </div>
            )}

            {/* Join Button */}
            <button
              onClick={handleJoinExam}
              disabled={isJoining || !examKey.trim() || examKey.length !== 6}
              style={{
                width: "100%",
                padding: "16px 24px",
                fontSize: "16px",
                fontWeight: "700",
                borderRadius: "16px",
                border: "none",
                background: isJoining || !examKey.trim() || examKey.length !== 6
                  ? "#e2e8f0"
                  : theme.buttonBg,
                color: "white",
                cursor: isJoining || !examKey.trim() || examKey.length !== 6 
                  ? "not-allowed" 
                  : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.3s ease",
                boxShadow: isJoining || !examKey.trim() || examKey.length !== 6
                  ? "none"
                  : theme.buttonShadow,
                opacity: isJoining || !examKey.trim() || examKey.length !== 6 ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isJoining && examKey.trim() && examKey.length === 6) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = theme.buttonHoverShadow;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = theme.buttonShadow;
              }}
            >
              {isJoining ? (
                <>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "3px solid rgba(255, 255, 255, 0.3)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Joining...
                </>
              ) : (
                <>
                  Join Exam
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {/* Instructions */}
            <div
              style={{
                marginTop: "28px",
                padding: "20px",
                borderRadius: "16px",
                background: theme.instructionBg,
                border: `1px solid ${theme.instructionBorder}`,
                transition: "all 0.3s ease",
              }}
            >
              <h4
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: theme.formTitleColor,
                  marginBottom: "12px",
                  letterSpacing: "-0.01em",
                  transition: "color 0.3s ease",
                }}
              >
                Before You Start
              </h4>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {[
                  "Ensure stable internet connection",
                  "Allow camera and microphone access",
                  "Close all unnecessary applications",
                  "Stay in a well-lit, quiet environment",
                ].map((item, index) => (
                  <li
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "start",
                      gap: "10px",
                      fontSize: "13px",
                      color: theme.formTextColor,
                      lineHeight: "1.5",
                      transition: "color 0.3s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: theme.bulletColor,
                        marginTop: "6px",
                        flexShrink: 0,
                        transition: "background 0.3s ease",
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default JoinExam;
