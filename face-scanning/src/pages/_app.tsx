import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ToastProvider } from "@/components/Toaster";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const PUBLIC_ROUTES = new Set<string>(["/Login"]);

function hasAuthClient(): boolean {
  if (typeof document === "undefined") return true; // SSR fallback; middleware covers SSR
  return /(?:^|; )(?:authToken|ai_proctor_auth)=/.test(document.cookie);
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
      if (!hasAuthClient()) {
        const redirect = encodeURIComponent(router.asPath || "/");
        router.replace(`/Login?redirect=${redirect}`);
        return;
      }
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
        <Component {...pageProps} />
      </ToastProvider>
    </ClientAuth>
  );
}