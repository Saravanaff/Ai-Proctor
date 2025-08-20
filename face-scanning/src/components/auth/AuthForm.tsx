import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "./AuthForm.module.css";
import { setGlobalIdentity } from "@/constants/AuthStore";

interface AuthFormProps {
  defaultMode?: "login" | "register";
}

const AuthForm = ({ defaultMode = "login" }: AuthFormProps) => {
  const [isRegister, setIsRegister] = useState(defaultMode === "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const baseURL =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const endpoint = isRegister ? `${baseURL}/register` : `${baseURL}/login`;
      const payload = isRegister
        ? { name, email, password }
        : { email, password };

      const { data } = await axios.post(endpoint, payload, {
        withCredentials: false,
      });
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

      const dest = (router.query.redirect as string) || "/photo";
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
              />
            </div>

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
