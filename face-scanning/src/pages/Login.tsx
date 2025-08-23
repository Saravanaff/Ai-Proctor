import AuthForm from "@/components/auth/AuthForm";
import { useRouter } from "next/router";

export default function AuthPage() {
  const router = useRouter();
  const redirect = router.query.redirect as string;
  return <AuthForm defaultMode="login" redirect={redirect} />;
}
