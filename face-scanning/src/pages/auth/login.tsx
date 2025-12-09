import { useRouter } from "next/router";
import LoginForm from "@/components/auth/LoginForm";
import { useEffect, useState } from "react";

const LoginPage = () => {
  const router = useRouter();
  const { redirect, registered, reset } = router.query;
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Enforce light theme
  useEffect(() => {
    document.body.style.background = "#f8fafc";
    document.body.style.minHeight = "100vh";
    return () => {
      document.body.style.background = "";
      document.body.style.minHeight = "";
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (registered === "true") {
      setSuccessMessage("Registration successful! Please login.");
      setShowSuccess(true);
      timer = setTimeout(() => setShowSuccess(false), 5000);
    } else if (reset === "true") {
      setSuccessMessage(
        "Password reset successful! Please login with your new password."
      );
      setShowSuccess(true);
      timer = setTimeout(() => setShowSuccess(false), 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [registered, reset]);

  return (
    <>
      {showSuccess && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: "#10b981",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            animation: "slideInFromRight 0.3s ease",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span style={{ fontWeight: 600 }}>{successMessage}</span>
        </div>
      )}
      <LoginForm redirect={(redirect as string) || "/"} />
      <style jsx global>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

export default LoginPage;
