import { useRouter } from "next/router";
import RegisterForm from "@/components/auth/RegisterForm";

const RegisterPage = () => {
  const router = useRouter();
  const { redirect } = router.query;

  return <RegisterForm redirect={(redirect as string) || "/"} />;
};

export default RegisterPage;
