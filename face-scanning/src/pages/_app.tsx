import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ToastProvider } from "@/components/Toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const PUBLIC_ROUTES = new Set<string>(["/Login"]);

function hasAuthClient(): boolean {
  if (typeof document === "undefined") return true; // SSR fallback; middleware covers SSR
  return /(?:^|; )(?:authToken|ai_proctor_auth)=/.test(document.cookie);
}

// Page transition wrapper component
function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleStart = () => setIsAnimating(true);
    const handleComplete = () => setIsAnimating(false);

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
        className={isAnimating ? 'page-transition-enter' : 'page-transition-enter-active'}
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
    <ThemeProvider>
      <ClientAuth>
        <ToastProvider>
          <PageTransition>
            <ThemeToggle />
            <Component {...pageProps} />
          </PageTransition>
        </ToastProvider>
      </ClientAuth>
    </ThemeProvider>
  );
}
