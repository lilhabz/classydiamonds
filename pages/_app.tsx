// 📄 pages/_app.tsx – Final Scroll Fix 💎

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
    // 🧹 Prevent browser restoring old scroll on back/forward
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // 🧼 Scroll to top as soon as route starts changing
    const handleRouteChangeStart = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    // ✅ Ensure we're at top again after render
    const handleRouteChangeComplete = () => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    };

    // 🎯 Listen for Next.js routing events
    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, [router]);

  return (
    <SessionProvider session={session}>
      <CartProvider>
        {/* 🌐 Global Site Layout */}
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
