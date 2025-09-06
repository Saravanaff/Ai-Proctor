import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "../../styles/AuthForm.module.css";
import { setGlobalIdentity } from "@/constants/AuthStore";
import { setGlobal } from "next/dist/trace";

interface AuthFormProps {
  defaultMode?: "login" | "register";
  redirect: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  examId?: string;
}

const AuthForm = ({
  defaultMode = "login",
  redirect,
  userId,
  userEmail,
  userName,
  examId,
}: AuthFormProps) => {
  const [isRegister, setIsRegister] = useState(defaultMode === "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswordReqs, setShowPasswordReqs] = useState(false);

  const router = useRouter();

  if (
    typeof userId === "string" &&
    typeof userName === "string" &&
    typeof userEmail === "string"
  ) {
    setGlobalIdentity(userName, userEmail, userId);
    localStorage.setItem("examId", examId || "unknown");
    router.push(redirect);
  }

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const isPasswordStrong =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.special;

  const passwordRequirements = [
    {
      key: "length",
      label: "At least 8 characters",
      passed: passwordChecks.length,
    },
    {
      key: "upper",
      label: "At least one uppercase letter",
      passed: passwordChecks.upper,
    },
    {
      key: "lower",
      label: "At least one lowercase letter",
      passed: passwordChecks.lower,
    },
    {
      key: "number",
      label: "At least one number",
      passed: passwordChecks.number,
    },
    {
      key: "special",
      label: "At least one special character",
      passed: passwordChecks.special,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister && !isPasswordStrong) {
        throw new Error(
          "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
        );
      }

      const baseURL =
        process.env.NEXT_PUBLIC_BACKEND_URL ;
      
      const endpoint = isRegister ? `${baseURL}/register` : `${baseURL}/login`;
      const payload = isRegister
        ? { name, email, password, role }
        : { email, password };

      const { data } = await axios.post(endpoint, payload, {
        withCredentials: false,
      });
      const token: string | undefined = data?.token;
      const user = data?.user;

      if (isRegister) {
        setIsRegister(false);
        setPassword("");
        try {
          router.replace(
            {
              pathname: router.pathname,
              query: { ...router.query, mode: "login" },
            },
            undefined,
            { shallow: true }
          );
        } catch {}
        setLoading(false);
        return;
      }

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
        if (user.role === "examiner") {
          dest = "/examiner/CreateExamPage";
        } else if (user.role === "student") {
          dest = "/candidate/JoinExam";
        } else {
          dest = "/"; // fallback
        }
      }

      router.push(dest);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}></div>
            <span className={styles.logoText}>AI Proctor</span>
          </div>
          <h1 className={styles.title}>
            {isRegister ? "Create Account" : "Welcome Back"}
          </h1>
          <p className={styles.subtitle}>
            {isRegister
              ? "Join our secure AI-powered proctoring platform"
              : "Sign in to access your exam dashboard"}
          </p>
        </div>

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {isRegister && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
            )}

            <div className={styles.inputGroup}>
              <label className={styles.label}>Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                placeholder={
                  isRegister
                    ? "Create a strong password"
                    : "Enter your password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
                onFocus={() => setShowPasswordReqs(true)}
                onBlur={() => setShowPasswordReqs(false)}
              />
              {(() => {
                const visible = showPasswordReqs;
                return (
                  <div
                    aria-live="polite"
                    aria-hidden={!visible}
                    style={{
                      marginTop: 10,
                      border: "1px dashed var(--border-color)",
                      borderRadius: 10,
                      background: "var(--secondary-bg)",
                      // animation
                      maxHeight: visible ? 220 : 0,
                      opacity: visible ? 1 : 0,
                      transform: visible ? "translateY(0)" : "translateY(-6px)",
                      transition:
                        "max-height 280ms ease, opacity 220ms ease, transform 220ms ease, padding 200ms ease, box-shadow 200ms ease",
                      overflow: "hidden",
                      padding: visible ? "12px 14px" : "0 14px",
                      boxShadow: visible
                        ? "0 6px 18px rgba(0,0,0,0.06)"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                        color: "var(--text-secondary)",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "var(--accent-color)",
                          boxShadow: "0 0 0 3px rgba(2,132,199,0.15)",
                        }}
                      />
                      Password requirements
                    </div>

                    {passwordRequirements.map((req) => (
                      <div
                        key={req.key}
                        role="listitem"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "6px 0",
                          color: req.passed
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            background: req.passed
                              ? "var(--success-color)"
                              : "transparent",
                            border: `2px solid ${
                              req.passed
                                ? "var(--success-color)"
                                : "var(--border-color)"
                            }`,
                            color: req.passed
                              ? "#fff"
                              : "var(--text-secondary)",
                            transition: "all 180ms ease",
                          }}
                        >
                          {req.passed ? "✓" : "•"}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {isRegister && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={`${styles.input} ${styles.selectInput}`}
                  required
                  style={{
                    color: "var(--text-primary)",
                    backgroundColor: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    fontSize: "16px",
                    fontWeight: "500",
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: "right 12px center",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "16px",
                    paddingRight: "40px",
                  }}
                >
                  <option
                    value="student"
                    style={{
                      color: "var(--text-primary)",
                      backgroundColor: "var(--input-bg)",
                    }}
                  >
                    👨‍🎓 Student
                  </option>
                  <option
                    value="examiner"
                    style={{
                      color: "var(--text-primary)",
                      backgroundColor: "var(--input-bg)",
                    }}
                  >
                    👨‍🏫 Examiner
                  </option>
                </select>
              </div>
            )}

            {error && (
              <div className={styles.error}>
                <div className={styles.errorIcon}>⚠</div>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || (isRegister && !isPasswordStrong)}
            >
              {loading ? (
                <div className={styles.spinner}></div>
              ) : (
                <>
                  <span>{isRegister ? "Create Account" : "Sign In"}</span>
                  <div className={styles.buttonIcon}>→</div>
                </>
              )}
            </button>
          </form>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            type="button"
            className={styles.toggleButton}
            onClick={toggleMode}
          >
            {isRegister
              ? "Already have an account? Sign In"
              : "Need an account? Create one"}
          </button>
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
