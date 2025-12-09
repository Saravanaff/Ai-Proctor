import { useRouter } from "next/router";
import RegisterForm from "@/components/auth/RegisterForm";
import { useEffect } from "react";

const RegisterPage = () => {
  const router = useRouter();
  const { redirect } = router.query;

  useEffect(() => {
    // Set body background to match register form
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

  return <RegisterForm redirect={(redirect as string) || "/"} />;
};

export default RegisterPage;
