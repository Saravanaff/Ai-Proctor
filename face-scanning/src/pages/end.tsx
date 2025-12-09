import { useEffect, useState } from "react";
import { getExamId, getUserId } from "@/constants/AuthStore";
import { CheckCircle2, Loader } from "lucide-react";

const EndPage = () => {
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Get userId and examId inside component
  const userId = getUserId() || "unknown";
  const examId = getExamId();

  useEffect(() => {
    console.log("=".repeat(60));
    console.log("📊 END PAGE MOUNTED");
    console.log("User ID:", userId);
    console.log("Exam ID:", examId);
    console.log("=".repeat(60));
    
    // ✅ Just show success after a brief moment
    // All data was already saved in FullScreen.tsx before navigation
    const timer = setTimeout(() => {
      console.log("✅ Showing success screen (data already saved)");
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [userId, examId]);

  // Professional High-Tech Black Theme
  const themes = {
    dark: {
      background: "#0f172a",
      cardBg: "rgba(30, 41, 59, 0.98)",
      cardBorder: "rgba(71, 85, 105, 0.5)",
      textPrimary: "#ffffff",
      textSecondary: "#e2e8f0",
      textMuted: "#94a3b8",
      successBg: "rgba(34, 197, 94, 0.08)",
      successBorder: "rgba(34, 197, 94, 0.4)",
      successText: "#22c55e",
      errorBg: "rgba(239, 68, 68, 0.08)",
      errorBorder: "rgba(239, 68, 68, 0.4)",
      errorText: "#ef4444",
      iconBg: "#3b82f6",
    },
    light: {
      background: "#f8fafc",
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
      iconBg: "#3b82f6",
    }
  };

  const currentTheme = themes.light;

  return (
    <div style={{
      minHeight: "100vh",
      background: currentTheme.background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden",
      transition: "background 0.3s ease",
    }}>
      {/* Animated Background Orbs - Cyan Glow */}
      <div style={{
        position: "absolute",
        top: "-10%",
        right: "-5%",
        width: "600px",
        height: "600px",
        background: "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "float 8s ease-in-out infinite, pulse 4s ease-in-out infinite",
        transition: "background 0.3s ease",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        left: "-5%",
        width: "500px",
        height: "500px",
        background: "radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "float 10s ease-in-out infinite reverse, pulse 6s ease-in-out infinite",
        transition: "background 0.3s ease",
      }} />

      <div style={{
        width: "100%",
        maxWidth: "600px",
        background: currentTheme.cardBg,
        backdropFilter: "blur(40px)",
        borderRadius: "32px",
        padding: "64px 48px",
        border: `1px solid ${currentTheme.cardBorder}`,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        position: "relative",
        zIndex: 10,
        textAlign: "center",
        transition: "all 0.3s ease",
      }}>
        {isLoading ? (
          <>
            <div style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px",
              boxShadow: "0 12px 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(59, 130, 246, 0.2)",
              animation: "glow 2s ease-in-out infinite, spin 2s linear infinite",
            }}>
              <Loader size={40} color="white" strokeWidth={3} />
            </div>
            <h1 style={{
              fontSize: "32px",
              fontWeight: "800",
              color: currentTheme.textPrimary,
              marginBottom: "16px",
              letterSpacing: "-0.02em",
              transition: "color 0.3s ease",
            }}>Processing Results...</h1>
            <p style={{
              fontSize: "16px",
              color: currentTheme.textSecondary,
              lineHeight: "1.6",
              marginBottom: "24px",
              transition: "color 0.3s ease",
            }}>Your exam has been submitted successfully</p>
            <div style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              marginTop: "32px",
            }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: currentTheme.iconBg,
                animation: "bounce 1.4s ease-in-out infinite",
              }} />
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: currentTheme.iconBg,
                animation: "bounce 1.4s ease-in-out 0.2s infinite",
              }} />
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: currentTheme.iconBg,
                animation: "bounce 1.4s ease-in-out 0.4s infinite",
              }} />
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: "110px",
              height: "110px",
              borderRadius: "50%",
              background: currentTheme.successBg,
              border: `3px solid ${currentTheme.successBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px",
              animation: "scaleIn 0.5s ease",
              boxShadow: "0 8px 24px rgba(34, 197, 94, 0.3)",
            }}>
              <CheckCircle2 size={60} color={currentTheme.successText} strokeWidth={2.5} />
            </div>
            <h1 style={{
              fontSize: "36px",
              fontWeight: "800",
              color: currentTheme.textPrimary,
              marginBottom: "16px",
              letterSpacing: "-0.02em",
              transition: "color 0.3s ease",
            }}>Exam Submitted Successfully</h1>
            <p style={{
              fontSize: "18px",
              color: currentTheme.textSecondary,
              lineHeight: "1.6",
              marginBottom: "40px",
              transition: "color 0.3s ease",
            }}>Thank you for participating in the examination</p>
            
            {/* Success Details Card */}
            <div style={{
              padding: "32px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)",
              border: `2px solid ${currentTheme.successBorder}`,
              marginBottom: "24px",
              transition: "all 0.3s ease",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
                marginBottom: "24px",
              }}>
                <div style={{ textAlign: "left" }}>
                  <p style={{
                    fontSize: "12px",
                    color: currentTheme.textMuted,
                    marginBottom: "8px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transition: "color 0.3s ease",
                  }}>Exam ID</p>
                  <p style={{
                    fontSize: "18px",
                    color: currentTheme.textPrimary,
                    fontWeight: "700",
                    transition: "color 0.3s ease",
                  }}>#{examId}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{
                    fontSize: "12px",
                    color: currentTheme.textMuted,
                    marginBottom: "8px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transition: "color 0.3s ease",
                  }}>User ID</p>
                  <p style={{
                    fontSize: "18px",
                    color: currentTheme.textPrimary,
                    fontWeight: "700",
                    transition: "color 0.3s ease",
                  }}>#{userId}</p>
                </div>
              </div>
              
              <div style={{
                height: "1px",
                background: currentTheme.cardBorder,
                marginBottom: "24px",
              }} />
              
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
              }}>
                <div style={{ textAlign: "left" }}>
                  <p style={{
                    fontSize: "12px",
                    color: currentTheme.textMuted,
                    marginBottom: "8px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transition: "color 0.3s ease",
                  }}>Status</p>
                  <p style={{
                    fontSize: "16px",
                    color: currentTheme.successText,
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}>
                    <span style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: currentTheme.successText,
                      display: "inline-block",
                      animation: "pulse 2s ease-in-out infinite",
                    }} />
                    Completed
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{
                    fontSize: "12px",
                    color: currentTheme.textMuted,
                    marginBottom: "8px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transition: "color 0.3s ease",
                  }}>Submitted At</p>
                  <p style={{
                    fontSize: "16px",
                    color: currentTheme.textPrimary,
                    fontWeight: "700",
                    transition: "color 0.3s ease",
                  }}>{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
            
            {/* Info Message */}
            <div style={{
              padding: "20px",
              borderRadius: "16px",
              background: "rgba(59, 130, 246, 0.05)",
              border: `1px solid rgba(59, 130, 246, 0.2)`,
              transition: "all 0.3s ease",
            }}>
              <p style={{
                fontSize: "14px",
                color: currentTheme.textSecondary,
                lineHeight: "1.6",
                margin: 0,
                transition: "color 0.3s ease",
              }}>
                Your responses have been recorded and saved. You will be notified once your results are available.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Advanced Professional Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(5deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
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

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(0, 153, 255, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 153, 255, 0.3);
          }
        }
      `}</style>
    </div>
  );
};

export default EndPage;
