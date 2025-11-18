import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { isAuthenticated, hasRole } from "@/utils/auth";

interface SuperAdminGuardProps {
  children: React.ReactNode;
}

export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({ children }) => {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (!isAuthenticated()) {
      router.push("/");
      return;
    }

    if (!hasRole("HEAD")) {
      router.push("/");
      return;
    }

    setIsAuthorized(true);
  }, [router, isClient]);

  if (!isClient || !isAuthorized) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        fontSize: "18px",
        color: "var(--text-secondary)"
      }}>
        Loading...
      </div>
    );
  }

  return <>{children}</>;
};
