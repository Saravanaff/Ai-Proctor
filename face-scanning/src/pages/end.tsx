import { useRef, useEffect, useState } from "react";
import socket from "@/components/socket";
import { getExamId, getUserId } from "@/constants/AuthStore";
import axios from "axios";
import { getTokenFromCookie } from "@/constants/AuthStore";
import {
  getNumberOfMicrophones,
  getTabSwitchViolations,
} from "@/constants/violationConsts";
import { CheckCircle2, XCircle, AlertCircle, Moon, Sun } from "lucide-react";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

const EndPage = () => {
  const hasSavedScore = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  
  // ✅ Get userId and examId inside component
  const userId = getUserId() || "unknown";
  const examId = getExamId();

  const postData = async (endpoint: string, data: any) => {
    const token = getTokenFromCookie();
    console.log(`Posting to: ${baseUrl}${endpoint}`);
    console.log("Request data:", data);
    console.log("Token:", token ? "Present" : "Missing");

    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, data, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        timeout: 10000, // ✅ 10 second timeout
      });
      console.log("✅ Request successful:", response.data);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // Server responded with error status
        console.error("❌ Server error:", {
          status: error.response.status,
          data: error.response.data,
          endpoint
        });
      } else if (error.request) {
        // Request made but no response
        console.error("❌ No response from server:", endpoint);
      } else {
        // Something else happened
        console.error("❌ Request error:", error.message);
      }
      throw error;
    }
  };

  useEffect(() => {
    console.log("📊 End page mounted - saving final score");
    if (!hasSavedScore.current) {
      hasSavedScore.current = true;
      
      // ✅ Add a small delay to ensure backend is ready
      setTimeout(() => {
        postData("/saveScore", {
          status: "completed",
          userId: Number(userId),
          examId: Number(examId),
          numberOfMicrophones: getNumberOfMicrophones() || 0,
          tabSwitchViolations: getTabSwitchViolations() || 0,
        })
        .then((data) => {
          console.log("✅ Score saved successfully:", data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("❌ Failed to save score:", {
            error: err.response?.data || err.message,
            userId,
            examId,
          });
        });
      }, 1000); // Wait 1 second for backend to be ready
    }
  }, []);

  // Theme configurations
  const themes = {
    dark: {
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      cardBg: "rgba(30, 41, 59, 0.9)",
      cardBorder: "rgba(51, 65, 85, 0.8)",
      textPrimary: "#ffffff",
      textSecondary: "#cbd5e1",
      textMuted: "#94a3b8",
      successBg: "rgba(34, 197, 94, 0.15)",
      successBorder: "rgba(34, 197, 94, 0.4)",
      successText: "#22c55e",
      errorBg: "rgba(239, 68, 68, 0.15)",
      errorBorder: "rgba(239, 68, 68, 0.4)",
      errorText: "#ef4444",
      iconBg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    },
    light: {
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)",
      cardBg: "rgba(255, 255, 255, 0.95)",
      cardBorder: "rgba(226, 232, 240, 0.9)",
      textPrimary: "#0f172a",
      textSecondary: "#475569",
      textMuted: "#64748b",
      successBg: "rgba(34, 197, 94, 0.1)",
      successBorder: "rgba(34, 197, 94, 0.3)",
      successText: "#16a34a",
      errorBg: "rgba(239, 68, 68, 0.1)",
      errorBorder: "rgba(239, 68, 68, 0.3)",
      errorText: "#dc2626",
      iconBg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    }
  };

  const theme = isDarkTheme ? themes.dark : themes.light;

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden",
      transition: "background 0.3s ease",
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: "absolute",
        top: "-10%",
        right: "-5%",
        width: "500px",
        height: "500px",
        background: isDarkTheme 
          ? "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        animation: "float 8s ease-in-out infinite",
        transition: "background 0.3s ease",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        left: "-5%",
        width: "400px",
        height: "400px",
        background: isDarkTheme
          ? "radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        animation: "float 10s ease-in-out infinite reverse",
        transition: "background 0.3s ease",
      }} />

      <div style={{
        width: "100%",
        maxWidth: "600px",
        background: theme.cardBg,
        backdropFilter: "blur(40px)",
        borderRadius: "32px",
        padding: "64px 48px",
        border: `1px solid ${theme.cardBorder}`,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        position: "relative",
        zIndex: 10,
        textAlign: "center",
        transition: "all 0.3s ease",
      }}>
        {isLoading ? (
          <>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: theme.iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px",
              boxShadow: "0 12px 40px rgba(59, 130, 246, 0.4)",
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                border: "4px solid rgba(255, 255, 255, 0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
            </div>
            <h1 style={{
              fontSize: "32px",
              fontWeight: "800",
              color: theme.textPrimary,
              marginBottom: "16px",
              letterSpacing: "-0.02em",
              transition: "color 0.3s ease",
            }}>Submitting Exam...</h1>
            <p style={{
              fontSize: "16px",
              color: theme.textSecondary,
              lineHeight: "1.6",
              transition: "color 0.3s ease",
            }}>Please wait while we save your results</p>
          </>
        ) : errorMessage ? (
          <>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: theme.errorBg,
              border: `2px solid ${theme.errorBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px",
              animation: "slideDown 0.4s ease",
            }}>
              <XCircle size={48} color={theme.errorText} strokeWidth={2} />
            </div>
            <h1 style={{
              fontSize: "32px",
              fontWeight: "800",
              color: theme.textPrimary,
              marginBottom: "16px",
              letterSpacing: "-0.02em",
              transition: "color 0.3s ease",
            }}>Submission Error</h1>
            <div style={{
              padding: "24px",
              borderRadius: "16px",
              background: theme.errorBg,
              border: `2px solid ${theme.errorBorder}`,
              marginBottom: "24px",
              transition: "all 0.3s ease",
            }}>
              <p style={{
                fontSize: "15px",
                color: theme.errorText,
                fontWeight: "600",
                marginBottom: "12px",
              }}>{errorMessage}</p>
            </div>
            <div style={{
              padding: "20px",
              borderRadius: "16px",
              background: isDarkTheme ? "rgba(51, 65, 85, 0.3)" : "rgba(226, 232, 240, 0.5)",
              border: `1px solid ${theme.cardBorder}`,
              transition: "all 0.3s ease",
            }}>
              <div style={{
                display: "flex",
                alignItems: "start",
                gap: "12px",
                marginBottom: "12px",
              }}>
                <AlertCircle size={20} color={theme.textSecondary} style={{ flexShrink: 0, marginTop: "2px" }} />
                <p style={{
                  fontSize: "14px",
                  color: theme.textSecondary,
                  textAlign: "left",
                  lineHeight: "1.6",
                  transition: "color 0.3s ease",
                }}>Please contact your exam administrator with the error above.</p>
              </div>
              <p style={{
                fontSize: "13px",
                color: theme.textMuted,
                textAlign: "left",
                lineHeight: "1.5",
                transition: "color 0.3s ease",
              }}>Check the browser console (F12) for more details.</p>
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              background: theme.successBg,
              border: `2px solid ${theme.successBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px",
              animation: "scaleIn 0.5s ease",
            }}>
              <CheckCircle2 size={56} color={theme.successText} strokeWidth={2} />
            </div>
            <h1 style={{
              fontSize: "36px",
              fontWeight: "800",
              color: theme.textPrimary,
              marginBottom: "16px",
              letterSpacing: "-0.02em",
              transition: "color 0.3s ease",
            }}>Exam Submitted Successfully</h1>
            <p style={{
              fontSize: "18px",
              color: theme.textSecondary,
              lineHeight: "1.6",
              marginBottom: "32px",
              transition: "color 0.3s ease",
            }}>Thank you for participating in the examination</p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              padding: "24px",
              borderRadius: "16px",
              background: isDarkTheme ? "rgba(51, 65, 85, 0.3)" : "rgba(226, 232, 240, 0.5)",
              border: `1px solid ${theme.cardBorder}`,
              transition: "all 0.3s ease",
            }}>
              <div style={{ textAlign: "left" }}>
                <p style={{
                  fontSize: "12px",
                  color: theme.textMuted,
                  marginBottom: "4px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  transition: "color 0.3s ease",
                }}>Status</p>
                <p style={{
                  fontSize: "16px",
                  color: theme.successText,
                  fontWeight: "700",
                }}>Completed</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{
                  fontSize: "12px",
                  color: theme.textMuted,
                  marginBottom: "4px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  transition: "color 0.3s ease",
                }}>Time</p>
                <p style={{
                  fontSize: "16px",
                  color: theme.textPrimary,
                  fontWeight: "700",
                  transition: "color 0.3s ease",
                }}>{new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Theme Toggle Switch */}
      <div style={{
        position: "fixed",
        bottom: "30px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
      }}>
        <button
          onClick={() => setIsDarkTheme(!isDarkTheme)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 24px",
            borderRadius: "100px",
            background: theme.cardBg,
            backdropFilter: "blur(20px)",
            border: `2px solid ${theme.cardBorder}`,
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 15px 50px rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 40px rgba(0, 0, 0, 0.2)";
          }}
        >
          <div style={{
            width: "50px",
            height: "26px",
            borderRadius: "100px",
            background: isDarkTheme 
              ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
              : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            position: "relative",
            transition: "all 0.3s ease",
            boxShadow: isDarkTheme
              ? "0 4px 12px rgba(59, 130, 246, 0.4) inset"
              : "0 4px 12px rgba(251, 191, 36, 0.4) inset",
          }}>
            <div style={{
              position: "absolute",
              top: "3px",
              left: isDarkTheme ? "3px" : "27px",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "white",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {isDarkTheme ? (
                <Moon size={12} color="#3b82f6" strokeWidth={2.5} />
              ) : (
                <Sun size={12} color="#f59e0b" strokeWidth={2.5} />
              )}
            </div>
          </div>
          <span style={{
            fontSize: "14px",
            fontWeight: "600",
            color: theme.textPrimary,
            transition: "color 0.3s ease",
          }}>
            {isDarkTheme ? "Dark" : "Light"} Theme
          </span>
        </button>
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

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default EndPage;
