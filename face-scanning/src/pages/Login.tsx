import AuthForm from "@/components/auth/AuthForm";
import { useRouter } from "next/router";

export default function AuthPage() {
  const router = useRouter();
  const redirect = router.query.redirect as string;
  const userId = router.query.userId as string;
  const email = router.query.email as string;
  const name = router.query.name as string;
  return <AuthForm defaultMode="login" redirect={redirect} userId={userId} userEmail={email} userName={name} />;
}
