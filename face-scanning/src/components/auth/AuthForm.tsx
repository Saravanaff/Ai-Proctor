import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "../../styles/AuthForm.module.css";
import { setExamId, setGlobalIdentity } from "@/constants/AuthStore";
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
  const [showPassword, setShowPassword] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);


  const router = useRouter();

  if (
    typeof userId === "string" &&
    typeof userName === "string" &&
    typeof userEmail === "string"
  ) {
    setGlobalIdentity(userName, userEmail, userId);

    localStorage.setItem("examId", examId || "unknown");
    setExamId(examId || "unknown");
    router.push(redirect);
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Validate format
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Only JPG or PNG format is allowed.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2 MB.");
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
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

        if (role === 'student' && !photo) {
          throw new Error("Photo must be uploaded.");
        }

        if (!isPasswordStrong) {
          throw new Error(
            "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
          );
        }
      }

      const baseURL =
        process.env.NEXT_PUBLIC_BACKEND_URL;

      const endpoint = isRegister ? `${baseURL}/register` : `${baseURL}/login`;
      let payload: any;
      if (isRegister) {
        payload = new FormData();
        payload.append("name", name);
        payload.append("email", email);
        payload.append("password", password);
        payload.append("role", role);

        if (role === "student" && photo) {
          payload.append("photo", photo);
        }
      }
      else {
        payload = { email, password };
      }

      const config = {
        headers: isRegister
          ? { "Content-Type": "multipart/form-data" }
          : { "Content-Type": "application/json" },
        withCredentials: false,
      };

      const { data } = await axios.post(endpoint, payload, config);

      const token: string | undefined = data?.token;
      const user = data?.user;

      if (isRegister) {
        setIsRegister(false);
        setPassword("");
        setEmail("");
        setName("");
        setShowPassword(false);
        setLoading(false);
        return;
      }

      if (!token || !user?.id || !user?.name || !user?.email) {
        throw new Error(data?.message || "Invalid response");
      }

      if (typeof window !== "undefined") {
        document.cookie = `authToken=${token}; Path=/; Max-Age=${60 * 60 * 2
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
    setIsRegister(v => !v);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
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

            {isRegister && role === "student" && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Upload Formal Photo</label>

                {/* Frame */}
                <div
                  style={{
                    width: 150,
                    height: 180,
                    border: "2px dashed var(--border-color)",
                    borderRadius: 8,
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    background: "#f7f7f7",
                  }}
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ color: "#666" }}>No Photo</span>
                  )}
                </div>

                {/* File Input */}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handlePhotoChange}
                  className={styles.input}
                  required={role === "student"}
                />

                {role === "student" && !photo && (
                  <p style={{ color: "red", fontSize: 12 }}>Photo is required for students</p>
                )}
              </div>
            )}

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
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder={isRegister ? 'Create password' : 'Password'}
                  onFocus={() => isRegister && setShowPasswordReqs(true)}
                  onBlur={() => setShowPasswordReqs(false)}
                  required
                  style={{ paddingRight: 60 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--secondary-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    fontSize: 11,
                    padding: '6px 8px',
                    cursor: 'pointer',
                    lineHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    /* Eye off icon */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.82 21.82 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    /* Eye icon */
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {isRegister && showPasswordReqs && (
                <div style={{ marginTop: 10, fontSize: 12 }}>
                  {(() => {
                    const passwordChecks = {
                      length: password.length >= 8,
                      upper: /[A-Z]/.test(password),
                      lower: /[a-z]/.test(password),
                      number: /\d/.test(password),
                      special: /[^A-Za-z0-9]/.test(password),
                    };
                    const passwordRequirements = [
                      { key: 'length', label: 'At least 8 characters', passed: passwordChecks.length },
                      { key: 'upper', label: 'One uppercase letter', passed: passwordChecks.upper },
                      { key: 'lower', label: 'One lowercase letter', passed: passwordChecks.lower },
                      { key: 'number', label: 'One number', passed: passwordChecks.number },
                      { key: 'special', label: 'One special character', passed: passwordChecks.special },
                    ];
                    return passwordRequirements.map(req => (
                      <div key={req.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                        <span style={{
                          width: 16,
                          height: 16,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          background: req.passed ? 'var(--success-color)' : 'transparent',
                          border: `2px solid ${req.passed ? 'var(--success-color)' : 'var(--border-color)'}`,
                          color: req.passed ? '#fff' : 'var(--text-secondary)',
                          fontSize: 10,
                          fontWeight: 600
                        }}>{req.passed ? '✓' : '•'}</span>
                        <span style={{ color: req.passed ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{req.label}</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
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
              disabled={loading}
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
