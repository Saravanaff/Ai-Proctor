import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "../../styles/RegisterForm.module.css";
import Link from "next/link";

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

  const router = useRouter();

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
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}></div>
            <span className={styles.logoText}>AI Proctor</span>
          </div>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>
            Join our secure AI-powered proctoring platform
          </p>

          {/* Step Indicator */}
          <div className={styles.stepIndicator}>
            <div
              className={`${styles.step} ${step >= 1 ? styles.stepActive : ""}`}
            >
              <div className={styles.stepNumber}>1</div>
              <span className={styles.stepLabel}>Account Details</span>
            </div>
            <div className={styles.stepLine}></div>
            <div
              className={`${styles.step} ${step >= 2 ? styles.stepActive : ""}`}
            >
              <div className={styles.stepNumber}>2</div>
              <span className={styles.stepLabel}>Verify Email</span>
            </div>
          </div>
        </div>

        <div className={styles.formCard}>
          {step === 1 ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendOtp();
              }}
              className={styles.form}
            >
              {/* Name */}
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
              {/* Department */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Department</label>
                <input
                  type="text"
                  placeholder="Enter your department"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              {/* Date of Birth */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Date of Birth</label>
                <input
                  type="date"
                  placeholder="Select your date of birth"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              {/* Registration Number */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Registration Number</label>
                <input
                  type="text"
                  placeholder="Enter your registration number"
                  value={reg}
                  onChange={(e) => setReg(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              {/* Email */}
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
              {/* Password */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Create a strong password"
                    onFocus={() => setShowPasswordReqs(true)}
                    onBlur={() => setShowPasswordReqs(false)}
                    required
                    style={{ paddingRight: 60 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className={styles.passwordToggle}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
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
                {showPasswordReqs && (
                  <div className={styles.passwordReqs}>
                    {passwordRequirements.map((req) => (
                      <div key={req.key} className={styles.passwordReq}>
                        <span
                          className={`${styles.passwordReqIcon} ${req.passed ? styles.passwordReqPassed : ""
                            }`}
                        >
                          {req.passed ? "✓" : ""}
                        </span>
                        <span
                          className={
                            req.passed ? styles.passwordReqTextPassed : ""
                          }
                        >
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
                    <span>Continue to Verification</span>
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
          ) : (
            <form onSubmit={handleVerifyAndRegister} className={styles.form}>
              <div className={styles.otpSection}>
                <div className={styles.otpIcon}>
                  <svg
                    width="60"
                    height="60"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h3 className={styles.otpTitle}>Verify Your Email</h3>
                <p className={styles.otpDesc}>
                  We've sent a 6-digit verification code to
                  <strong> {email}</strong>
                </p>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Verification Code</label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className={`${styles.input} ${styles.otpInput}`}
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                  />
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
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <div className={styles.spinner}></div>
                  ) : (
                    <>
                      <span>Verify & Create Account</span>
                      <div className={styles.buttonIcon}>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    </>
                  )}
                </button>

                <div className={styles.resendSection}>
                  {resendTimer > 0 ? (
                    <p className={styles.resendTimer}>
                      Resend code in {resendTimer}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className={styles.resendButton}
                      disabled={loading}
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={styles.backButton}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ marginRight: "8px" }}
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back to edit details
                </button>
              </div>
            </form>
          )}

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <Link href="/auth/login" legacyBehavior>
            <a className={styles.toggleButton}>
              Already have an account? Sign In
            </a>
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

export default RegisterForm;
