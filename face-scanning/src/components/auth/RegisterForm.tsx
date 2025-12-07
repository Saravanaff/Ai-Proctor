import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";
import { Moon, Sun, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, Lock, Mail, User, Calendar, Hash, Building2, CheckCircle, Send } from "lucide-react";

interface RegisterFormProps {
  redirect?: string;
}

const RegisterForm = ({ redirect }: RegisterFormProps) => {
  const [step, setStep] = useState(1); // 1: Basic Info, 2: OTP Verification
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dept, setDept] = useState("");
  const [dob, setDob] = useState("");
  const [reg, setReg] = useState("");
  const role = "student";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const themes = {
    dark: {
      background: "linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #0f0f0f 100%)",
      cardBg: "rgba(10, 10, 10, 0.95)",
      cardBorder: "rgba(0, 255, 255, 0.3)",
      textPrimary: "#ffffff",
      textSecondary: "#e0e0e0",
      textMuted: "#a0a0a0",
      accentPrimary: "#00ffff",
      accentSecondary: "#00d9ff",
      inputBg: "rgba(0, 0, 0, 0.8)",
      inputBorder: "rgba(0, 255, 255, 0.2)",
      glowColor: "rgba(0, 255, 255, 0.4)",
      stepActive: "rgba(0, 255, 255, 0.2)",
      stepInactive: "rgba(80, 80, 80, 0.3)",
    },
    light: {
      background: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #e8e8e8 100%)",
      cardBg: "rgba(255, 255, 255, 0.95)",
      cardBorder: "rgba(0, 153, 255, 0.2)",
      textPrimary: "#1a1a1a",
      textSecondary: "#4a4a4a",
      textMuted: "#6a6a6a",
      accentPrimary: "#0099ff",
      accentSecondary: "#00d9ff",
      inputBg: "rgba(248, 248, 248, 0.9)",
      inputBorder: "rgba(0, 153, 255, 0.15)",
      glowColor: "rgba(0, 153, 255, 0.3)",
      stepActive: "rgba(0, 153, 255, 0.15)",
      stepInactive: "rgba(203, 213, 225, 0.5)",
    }
  };

  const currentTheme = isDarkTheme ? themes.dark : themes.light;

  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark');
    }
  }, []);

  const handleThemeToggle = () => {
    const newTheme = !isDarkTheme;
    setIsDarkTheme(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const validatePassword = () => {
    const passwordChecks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    return (
      passwordChecks.length &&
      passwordChecks.upper &&
      passwordChecks.lower &&
      passwordChecks.number &&
      passwordChecks.special
    );
  };

  const handleSendOtp = async () => {
    setError("");
    setLoading(true);

    try {
      // Validate all required fields
      if (!name || !email || !password || !dept || !dob || !reg) {
        throw new Error("Please fill in all required fields.");
      }

      if (!validatePassword()) {
        throw new Error(
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
        );
      }

      const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const { data } = await axios.post(`${baseURL}/otp/send`, { email });

      if (data.success) {
        setOtpSent(true);
        setStep(2);
        setResendTimer(60);

        // Start countdown timer
        const interval = setInterval(() => {
          setResendTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const { data } = await axios.post(`${baseURL}/otp/resend`, { email });

      if (data.success) {
        setResendTimer(60);
        setError("");

        // Start countdown timer
        const interval = setInterval(() => {
          setResendTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Failed to resend OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL;

      // First verify OTP
      const verifyResponse = await axios.post(`${baseURL}/otp/verify`, {
        email,
        otp,
      });

      if (!verifyResponse.data.success) {
        throw new Error("Invalid OTP");
      }

      // Then register user
      const payload = new FormData();
      payload.append("name", name);
      payload.append("email", email);
      payload.append("password", password);
      payload.append("role", role);
      payload.append("dept", dept);
      payload.append("dob", dob);
      payload.append("reg", reg);

      const config = {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: false,
      };

      const { data } = await axios.post(`${baseURL}/register`, payload, config);

      if (data.success !== false) {
        // Registration successful
        router.push("/auth/login?registered=true");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passwordRequirements = [
    {
      key: "length",
      label: "At least 8 characters",
      passed: passwordChecks.length,
    },
    {
      key: "upper",
      label: "One uppercase letter",
      passed: passwordChecks.upper,
    },
    {
      key: "lower",
      label: "One lowercase letter",
      passed: passwordChecks.lower,
    },
    { key: "number", label: "One number", passed: passwordChecks.number },
    {
      key: "special",
      label: "One special character",
      passed: passwordChecks.special,
    },
  ];

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
        background: isDarkTheme ? "rgba(0, 255, 255, 0.15)" : "rgba(0, 153, 255, 0.08)",
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
        background: isDarkTheme ? "rgba(0, 217, 255, 0.15)" : "rgba(0, 217, 255, 0.08)",
        filter: "blur(80px)",
        bottom: "-150px",
        left: "-50px",
        animation: "float 10s ease-in-out infinite reverse",
        pointerEvents: "none",
      }} />

      <div style={{
        maxWidth: "600px",
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
              background: isDarkTheme ? "linear-gradient(135deg, #00ffff 0%, #00d9ff 100%)" : "linear-gradient(135deg, #0099ff 0%, #00d9ff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isDarkTheme ? "0 8px 24px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.3)" : "0 8px 24px rgba(0, 153, 255, 0.4)",
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
          }}>Create Account</h1>
          <p style={{
            fontSize: "15px",
            color: currentTheme.textSecondary,
            margin: 0,
            transition: "color 0.3s ease",
          }}>
            Join our secure AI-powered proctoring platform
          </p>

          {/* Step Indicator */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginTop: "32px",
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: step >= 1 ? (isDarkTheme ? "linear-gradient(135deg, #00ffff 0%, #00d9ff 100%)" : "linear-gradient(135deg, #0099ff 0%, #00d9ff 100%)") : currentTheme.stepInactive,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "16px",
                transition: "all 0.3s ease",
                boxShadow: step >= 1 ? (isDarkTheme ? "0 4px 12px rgba(0, 255, 255, 0.5), 0 0 24px rgba(0, 255, 255, 0.3)" : "0 4px 12px rgba(0, 153, 255, 0.4)") : "none",
              }}>
                {step > 1 ? <CheckCircle size={20} strokeWidth={2.5} /> : "1"}
              </div>
              <span style={{
                fontSize: "12px",
                fontWeight: "600",
                color: step >= 1 ? currentTheme.textPrimary : currentTheme.textMuted,
                transition: "color 0.3s ease",
              }}>Account Details</span>
            </div>
            <div style={{
              width: "60px",
              height: "2px",
              background: step >= 2 ? currentTheme.accentPrimary : currentTheme.stepInactive,
              transition: "all 0.3s ease",
            }} />
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: step >= 2 ? (isDarkTheme ? "linear-gradient(135deg, #00ffff 0%, #00d9ff 100%)" : "linear-gradient(135deg, #0099ff 0%, #00d9ff 100%)") : currentTheme.stepInactive,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "16px",
                transition: "all 0.3s ease",
                boxShadow: step >= 2 ? (isDarkTheme ? "0 4px 12px rgba(0, 255, 255, 0.5), 0 0 24px rgba(0, 255, 255, 0.3)" : "0 4px 12px rgba(0, 153, 255, 0.4)") : "none",
              }}>2</div>
              <span style={{
                fontSize: "12px",
                fontWeight: "600",
                color: step >= 2 ? currentTheme.textPrimary : currentTheme.textMuted,
                transition: "color 0.3s ease",
              }}>Verify Email</span>
            </div>
          </div>
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
          {step === 1 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendOtp();
              }}
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Two columns layout for name and department */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: currentTheme.textPrimary,
                    marginBottom: "8px",
                    transition: "color 0.3s ease",
                  }}>Full Name</label>
                  <div style={{ position: "relative" }}>
                    <User size={18} color={currentTheme.textMuted} style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      transition: "color 0.3s ease",
                    }} />
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "12px 16px 12px 48px",
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
                  }}>Department</label>
                  <div style={{ position: "relative" }}>
                    <Building2 size={18} color={currentTheme.textMuted} style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      transition: "color 0.3s ease",
                    }} />
                    <input
                      type="text"
                      placeholder="Enter your department"
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "12px 16px 12px 48px",
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
                        e.currentTarget.style.boxShadow = isDarkTheme ? `0 0 0 3px rgba(0, 255, 255, 0.2), 0 0 20px rgba(0, 255, 255, 0.15)` : `0 0 0 3px rgba(0, 153, 255, 0.15)`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = currentTheme.inputBorder;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Two columns for DOB and Registration */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: currentTheme.textPrimary,
                    marginBottom: "8px",
                    transition: "color 0.3s ease",
                  }}>Date of Birth</label>
                  <div style={{ position: "relative" }}>
                    <Calendar size={18} color={currentTheme.textMuted} style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      transition: "color 0.3s ease",
                    }} />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "12px 16px 12px 48px",
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
                        e.currentTarget.style.boxShadow = isDarkTheme ? `0 0 0 3px rgba(0, 255, 255, 0.2), 0 0 20px rgba(0, 255, 255, 0.15)` : `0 0 0 3px rgba(0, 153, 255, 0.15)`;
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
                  }}>Registration Number</label>
                  <div style={{ position: "relative" }}>
                    <Hash size={18} color={currentTheme.textMuted} style={{
                      position: "absolute",
                      left: "16px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      transition: "color 0.3s ease",
                    }} />
                    <input
                      type="text"
                      placeholder="Enter your registration number"
                      value={reg}
                      onChange={(e) => setReg(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "12px 16px 12px 48px",
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
                        e.currentTarget.style.boxShadow = isDarkTheme ? `0 0 0 3px rgba(0, 255, 255, 0.2), 0 0 20px rgba(0, 255, 255, 0.15)` : `0 0 0 3px rgba(0, 153, 255, 0.15)`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = currentTheme.inputBorder;
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
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
                      padding: "12px 16px 12px 48px",
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
                      e.currentTarget.style.boxShadow = isDarkTheme ? `0 0 0 3px rgba(0, 255, 255, 0.2), 0 0 20px rgba(0, 255, 255, 0.15)` : `0 0 0 3px rgba(0, 153, 255, 0.15)`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = currentTheme.inputBorder;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password */}
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
                    placeholder="Create a strong password"
                    onFocus={() => setShowPasswordReqs(true)}
                    onBlur={() => setShowPasswordReqs(false)}
                    required
                    style={{
                      width: "100%",
                      padding: "12px 52px 12px 48px",
                      fontSize: "15px",
                      background: currentTheme.inputBg,
                      border: `2px solid ${currentTheme.inputBorder}`,
                      borderRadius: "12px",
                      color: currentTheme.textPrimary,
                      outline: "none",
                      transition: "all 0.3s ease",
                      boxSizing: "border-box",
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
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {showPasswordReqs && (
                  <div style={{
                    marginTop: "12px",
                    padding: "16px",
                    background: isDarkTheme ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.08)",
                    borderRadius: "12px",
                    border: `1px solid ${isDarkTheme ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.15)"}`,
                  }}>
                    {passwordRequirements.map((req) => (
                      <div key={req.key} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "8px",
                      }}>
                        <div style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          background: req.passed ? "#22c55e" : currentTheme.inputBg,
                          border: `2px solid ${req.passed ? "#22c55e" : currentTheme.inputBorder}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          color: "#ffffff",
                          fontWeight: "bold",
                          transition: "all 0.3s ease",
                        }}>
                          {req.passed && "✓"}
                        </div>
                        <span style={{
                          fontSize: "13px",
                          color: req.passed ? "#22c55e" : currentTheme.textSecondary,
                          fontWeight: "500",
                          transition: "color 0.3s ease",
                        }}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
                    : (isDarkTheme ? "linear-gradient(135deg, #00ffff 0%, #00d9ff 100%)" : "linear-gradient(135deg, #0099ff 0%, #00d9ff 100%)"),
                  border: "none",
                  borderRadius: "12px",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: loading ? "none" : (isDarkTheme ? "0 4px 16px rgba(0, 255, 255, 0.5), 0 0 30px rgba(0, 255, 255, 0.3)" : "0 4px 16px rgba(0, 153, 255, 0.4)"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  letterSpacing: "0.5px",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = isDarkTheme ? "0 6px 24px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 255, 255, 0.4)" : "0 6px 24px rgba(0, 153, 255, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = isDarkTheme ? "0 4px 16px rgba(0, 255, 255, 0.5), 0 0 30px rgba(0, 255, 255, 0.3)" : "0 4px 16px rgba(0, 153, 255, 0.4)";
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
                    <span>Continue to Verification</span>
                    <ArrowRight size={18} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndRegister} style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center", textAlign: "center" }}>
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: isDarkTheme ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}>
                <Send size={36} color={currentTheme.accentPrimary} strokeWidth={2} />
              </div>
              <div>
                <h3 style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: currentTheme.textPrimary,
                  margin: "0 0 12px 0",
                  transition: "color 0.3s ease",
                }}>Verify Your Email</h3>
                <p style={{
                  fontSize: "15px",
                  color: currentTheme.textSecondary,
                  margin: 0,
                  lineHeight: 1.6,
                  transition: "color 0.3s ease",
                }}>
                  We've sent a 6-digit verification code to<br />
                  <strong style={{ color: currentTheme.accentPrimary }}>{email}</strong>
                </p>
              </div>

              <div style={{ width: "100%", maxWidth: "300px" }}>
                <label style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: currentTheme.textPrimary,
                  marginBottom: "8px",
                  textAlign: "left",
                  transition: "color 0.3s ease",
                }}>Verification Code</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  style={{
                    width: "100%",
                    padding: "16px",
                    fontSize: "24px",
                    fontWeight: "700",
                    textAlign: "center",
                    letterSpacing: "8px",
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
                    e.currentTarget.style.boxShadow = isDarkTheme ? `0 0 0 3px rgba(0, 255, 255, 0.2), 0 0 20px rgba(0, 255, 255, 0.15)` : `0 0 0 3px rgba(0, 153, 255, 0.15)`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.inputBorder;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {error && (
                <div style={{
                  width: "100%",
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
                disabled={loading || otp.length !== 6}
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#ffffff",
                  background: (loading || otp.length !== 6)
                    ? (isDarkTheme ? "rgba(100, 116, 139, 0.5)" : "rgba(148, 163, 184, 0.5)")
                    : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  border: "none",
                  borderRadius: "12px",
                  cursor: (loading || otp.length !== 6) ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: (loading || otp.length !== 6) ? "none" : "0 4px 16px rgba(34, 197, 94, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  letterSpacing: "0.5px",
                }}
                onMouseEnter={(e) => {
                  if (!loading && otp.length === 6) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 24px rgba(34, 197, 94, 0.5)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && otp.length === 6) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(34, 197, 94, 0.4)";
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
                    <span>Verify & Create Account</span>
                    <CheckCircle size={18} strokeWidth={2.5} />
                  </>
                )}
              </button>

              <div style={{ width: "100%" }}>
                {resendTimer > 0 ? (
                  <p style={{
                    fontSize: "14px",
                    color: currentTheme.textMuted,
                    margin: 0,
                    transition: "color 0.3s ease",
                  }}>
                    Resend code in <strong style={{ color: currentTheme.accentPrimary }}>{resendTimer}s</strong>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    style={{
                      padding: "12px 24px",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: currentTheme.accentPrimary,
                      background: isDarkTheme ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.08)",
                      border: `2px solid ${isDarkTheme ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)"}`,
                      borderRadius: "10px",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "all 0.3s ease",
                    }}
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: currentTheme.textSecondary,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = currentTheme.accentPrimary}
                onMouseLeave={(e) => e.currentTarget.style.color = currentTheme.textSecondary}
              >
                <ArrowLeft size={16} strokeWidth={2.5} />
                <span>Back to edit details</span>
              </button>
            </form>
          )}

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

          <Link href="/auth/login" style={{
            display: "block",
            width: "100%",
            padding: "14px",
            fontSize: "15px",
            fontWeight: "600",
            color: currentTheme.accentPrimary,
            background: isDarkTheme ? "rgba(0, 255, 255, 0.1)" : "rgba(0, 153, 255, 0.08)",
            border: `2px solid ${isDarkTheme ? "rgba(0, 255, 255, 0.3)" : "rgba(0, 153, 255, 0.2)"}`,
            borderRadius: "12px",
            textAlign: "center",
            textDecoration: "none",
            transition: "all 0.3s ease",
          }}>Already have an account? Sign In</Link>
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
        onClick={handleThemeToggle}
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

export default RegisterForm;
