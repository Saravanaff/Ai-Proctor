import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import styles from "../../styles/ForgotPassword.module.css";
import Link from "next/link";

const ForgotPasswordForm = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const router = useRouter();
  const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const validatePassword = () => {
    const passwordChecks = {
      length: newPassword.length >= 8,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      number: /\d/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
    };
    return (
      passwordChecks.length &&
      passwordChecks.upper &&
      passwordChecks.lower &&
      passwordChecks.number &&
      passwordChecks.special
    );
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Check if email exists
      const checkResponse = await axios.post(`${baseURL}/otp/check-email`, {
        email,
      });

      if (!checkResponse.data.success) {
        throw new Error("No account found with this email address");
      }

      // Send OTP
      const { data } = await axios.post(`${baseURL}/otp/forgot-password/send`, {
        email,
      });

      if (data.success) {
        setSuccess("OTP sent successfully to your email");
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data } = await axios.post(
        `${baseURL}/otp/forgot-password/verify`,
        {
          email,
          otp,
        }
      );

      if (data.success) {
        setSuccess("OTP verified successfully");
        setStep(3);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!validatePassword()) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
      );
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(`${baseURL}/otp/reset-password`, {
        email,
        otp,
        newPassword,
      });

      if (data.success) {
        setSuccess("Password reset successfully! Redirecting to login...");
        setTimeout(() => {
          router.push("/auth/login?reset=true");
        }, 2000);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${baseURL}/otp/forgot-password/send`, {
        email,
      });

      if (data.success) {
        setSuccess("OTP resent successfully");
        setResendTimer(60);

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

  const passwordChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.header}>
          <h1>Reset Password</h1>
          <p>
            {step === 1 && "Enter your email to receive an OTP"}
            {step === 2 && "Enter the OTP sent to your email"}
            {step === 3 && "Create your new password"}
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        {step === 1 && (
          <form onSubmit={handleSendOtp} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>

            <div className={styles.linkContainer}>
              <Link href="/auth/login">Back to Login</Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="otp">Enter OTP</label>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                required
                disabled={loading}
                className={styles.otpInput}
              />
              <small>Check your email for the OTP code</small>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className={styles.resendContainer}>
              {resendTimer > 0 ? (
                <p>Resend OTP in {resendTimer}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className={styles.resendButton}
                  disabled={loading}
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div className={styles.linkContainer}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className={styles.backButton}
              >
                Back
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="newPassword">New Password</label>
              <div className={styles.passwordInputContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <div className={styles.passwordRequirements}>
              <p>Password must contain:</p>
              <ul>
                <li className={passwordChecks.length ? styles.valid : ""}>
                  At least 8 characters
                </li>
                <li className={passwordChecks.upper ? styles.valid : ""}>
                  One uppercase letter
                </li>
                <li className={passwordChecks.lower ? styles.valid : ""}>
                  One lowercase letter
                </li>
                <li className={passwordChecks.number ? styles.valid : ""}>
                  One number
                </li>
                <li className={passwordChecks.special ? styles.valid : ""}>
                  One special character
                </li>
              </ul>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !validatePassword()}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
