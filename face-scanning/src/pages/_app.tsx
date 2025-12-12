import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ToastProvider } from "@/components/Toaster";
// import { ThemeProvider } from "@/contexts/ThemeContext"; // Removed - Light theme only
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader } from "lucide-react";

const PUBLIC_ROUTES = new Set<string>(["/Login"]);

function hasAuthClient(): boolean {
  if (typeof document === "undefined") return true; // SSR fallback; middleware covers SSR
  return /(?:^|; )(?:authToken|ai_proctor_auth)=/.test(document.cookie);
}

// Global Loading Screen Component
function GlobalLoadingScreen({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  const currentTheme = {
    background: "#f8fafc",
    cardBg: "rgba(255, 255, 255, 0.95)",
    iconBg: "#3b82f6",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: currentTheme.background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      transition: "opacity 0.3s ease",
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: "absolute",
        top: "-10%",
        right: "-5%",
        width: "500px",
        height: "500px",
        background: "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        animation: "float 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        bottom: "-10%",
        left: "-5%",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)",
        borderRadius: "50%",
        filter: "blur(60px)",
        animation: "float 10s ease-in-out infinite reverse",
      }} />

      {/* Loading Content */}
      <div style={{
        textAlign: "center",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 12px 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(59, 130, 246, 0.2)",
          animation: "glow 2s ease-in-out infinite, spin 2s linear infinite",
        }}>
          <Loader size={36} color="white" strokeWidth={3} />
        </div>
        <h2 style={{
          fontSize: "24px",
          fontWeight: "700",
          color: currentTheme.textPrimary,
          marginBottom: "8px",
        }}>Loading...</h2>
        <p style={{
          fontSize: "14px",
          color: currentTheme.textSecondary,
        }}>Please wait</p>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(59, 130, 246, 0.2);
          }
          50% {
            box-shadow: 0 12px 50px rgba(59, 130, 246, 0.6), 0 0 100px rgba(59, 130, 246, 0.3);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// Page transition wrapper component with loading screen
function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true);
    };

    const handleComplete = () => {
      // Small delay to ensure smooth transition
      setTimeout(() => setIsLoading(false), 300);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <>
      <GlobalLoadingScreen isLoading={isLoading} />
      <style jsx global>{`
        .page-transition-enter {
          opacity: 0;
          transform: translateY(10px);
        }
        .page-transition-enter-active {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
        }
      `}</style>
      <div
        key={router.pathname}
        className={isLoading ? 'page-transition-enter' : 'page-transition-enter-active'}
        style={{ display: isLoading ? 'none' : 'block' }}
      >
        {children}
      </div>
    </>
  );
}

function ClientAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = () => {
      const path = router.pathname;
      if (PUBLIC_ROUTES.has(path)) {
        setReady(true);
        return;
      }

      /* uncomment this on production */

      // if (!hasAuthClient()) {
      //   const redirect = encodeURIComponent(router.asPath || "/");
      //   router.replace(`/Login?redirect=${redirect}`);
      //   return;
      // }

      setReady(true);
    };

    check();
    const onComplete = () => check();
    router.events.on("routeChangeComplete", onComplete);
    return () => router.events.off("routeChangeComplete", onComplete);
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClientAuth>
      <ToastProvider>
        <PageTransition>
          <Component {...pageProps} />
        </PageTransition>
      </ToastProvider>
    </ClientAuth>
  );
}
