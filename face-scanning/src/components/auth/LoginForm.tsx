import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "../../styles/AuthForm.module.css";
import { setGlobalIdentity } from "@/constants/AuthStore";
import Link from "next/link";

interface LoginFormProps {
  redirect: string;
}

const LoginForm = ({ redirect }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
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
        if (user.role === "examiner") {
          dest = "/examiner/CreateExamPage";
        } else if (user.role === "student") {
          dest = "/candidate/JoinExam";
        } else {
          dest = "/";
        }
      }

      // Use replace instead of push to prevent back button issues
      await router.replace(dest);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Something went wrong"
      );
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}></div>
            <span className={styles.logoText}>AI Proctor</span>
          </div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>
            Sign in to access your exam dashboard
          </p>
        </div>

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
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
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Password"
                  required
                  style={{ paddingRight: 60 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "var(--secondary-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 6,
                    fontSize: 11,
                    padding: "6px 8px",
                    cursor: "pointer",
                    lineHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.82 21.82 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <Link href="/auth/forgot-password" legacyBehavior>
                  <a
                    style={{
                      fontSize: 14,
                      color: "var(--primary-color)",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    Forgot Password?
                  </a>
                </Link>
              </div>
            </div>

            {error && (
              <div className={styles.error}>
                <div className={styles.errorIcon}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
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
                  <span>Sign In</span>
                  <div className={styles.buttonIcon}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                </>
              )}
            </button>
          </form>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <Link href="/auth/register" legacyBehavior>
            <a className={styles.toggleButton}>Need an account? Create one</a>
          </Link>
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

export default LoginForm;
