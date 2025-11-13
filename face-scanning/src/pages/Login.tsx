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
    // Auto-login if all parameters are provided
    if (
      typeof userId === "string" &&
      typeof name === "string" &&
      typeof email === "string"
    ) {
      setGlobalIdentity(name, email, userId);

      if (examId) {
        localStorage.setItem("examId", examId);
        setExamId(examId);
      }

      router.push(redirect || "/");
    }
  }, [userId, name, email, examId, redirect, router]);

  return <LoginForm redirect={redirect} />;
}
