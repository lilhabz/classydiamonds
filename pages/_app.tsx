// 📄 pages/_app.tsx – Conditional Scroll Restoration Fix 💎

import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // ✅ Prevent browser from auto-restoring scroll
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // 🧹 Only scroll to top on full route changes (skip same-page query changes)
    const handleRouteChangeStart = (url: string) => {
      const toPath = url.split("?")[0];
      const fromPath = router.asPath.split("?")[0];
      if (toPath !== fromPath) {
        window.scrollTo(0, 0);
      }
    };

    // 🎯 Listen for route changes
    router.events.on("routeChangeStart", handleRouteChangeStart);

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, [router]);

  return (
    <SessionProvider session={session}>
      <CartProvider>
        <Navbar />
        <div className="pt-20 flex flex-col min-h-screen bg-[#1f2a44] text-[#e0e0e0]">
          <Component {...pageProps} />
        </div>
        <Footer />
      </CartProvider>
    </SessionProvider>
  );
}
