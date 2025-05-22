// 📄 pages/_app.tsx – Final Scroll Restoration Fix 💎

import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // ✅ Prevent browser from auto-restoring scroll (fixes jump)
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const handleBeforeUnload = () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };

    const handleRouteChangeStart = () => {
      // 🧹 Scroll to top on route changes
      window.scrollTo(0, 0);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    router.events.on("routeChangeStart", handleRouteChangeStart);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
        <SpeedInsights />
      </CartProvider>
    </SessionProvider>
  );
}
