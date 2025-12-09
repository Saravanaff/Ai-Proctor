import LoginForm from "@/components/auth/LoginForm";
import { useRouter } from "next/router";
import { setExamId, setGlobalIdentity } from "@/constants/AuthStore";
import { useEffect } from "react";

export default function AuthPage() {
  const router = useRouter();
  const redirect = router.query.redirect as string;
  const userId = router.query.userId as string;
  const examId = router.query.examId as string;
  const email = router.query.email as string;
  const name = router.query.name as string;

  useEffect(() => {
    // Set body background to match login form
    document.body.style.background = "#f8fafc";
    document.body.style.minHeight = "100vh";
    document.documentElement.style.background = "#f8fafc";
    
    return () => {
      // Cleanup on unmount
      document.body.style.background = "";
      document.body.style.minHeight = "";
      document.documentElement.style.background = "";
    };
  }, []);

  useEffect(() => {
    // Auto-login if all parameters are provided
    if (
      typeof userId === "string" &&
      typeof name === "string" &&
      typeof email === "string"
    ) {
      setGlobalIdentity(name, email, userId);

      if (examId && typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("examId", examId);
        setExamId(examId);
      }

      router.push(redirect || "/");
    }
  }, [userId, name, email, examId, redirect, router]);

  return <LoginForm redirect={redirect} />;
}
