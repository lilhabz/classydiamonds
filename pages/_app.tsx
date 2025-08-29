// 📄 pages/_app.tsx – App with Scroll Restoration & Speed Insights Integration 🚀

import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import IdleTimerProvider from "@/components/AutoLogout";

// ⚡ Import the SpeedInsights component (no HOC wrapper needed)
import { SpeedInsights } from "@vercel/speed-insights/next";

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // 🎯 Prevent browser from auto-restoring scroll
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // ✅ Match target routes where the hero must be visible on load
    const isSubcatUrl = (url: string) =>
      /^\/category\/[^/]+\/subcategory\/[^/]+(?:\?|$)/.test(url.split("#")[0]);
    const isJewelryUrl = (url: string) =>
      url.split("#")[0].split("?")[0] === "/jewelry";

    // 🔄 Only scroll to top on full route changes (skip same-page query changes)
    const handleRouteChangeStart = (url: string) => {
      const toPath = url.split("?")[0];
      const fromPath = router.asPath.split("?")[0];
      if (toPath !== fromPath) {
        // Force top BEFORE paint for Jewelry/Subcategory (unless ?scroll=true)
        if (
          (isSubcatUrl(url) || isJewelryUrl(url)) &&
          !url.includes("scroll=true")
        ) {
          window.scrollTo(0, 0);
        } else {
          // Keep original behavior for other full route changes
          window.scrollTo(0, 0);
        }
      }
    };

    // 🧷 Some browsers restore after paint — guard again on complete
    const handleRouteChangeComplete = (url: string) => {
      if (
        (isSubcatUrl(url) || isJewelryUrl(url)) &&
        !url.includes("scroll=true")
      ) {
        window.scrollTo(0, 0);
        // Double-RAF guard against late layout nudges/hydration shifts
        requestAnimationFrame(() => window.scrollTo(0, 0));
      }
    };

    // 📡 Listen for route changes
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
        <IdleTimerProvider>
          {/* 🌐 Navbar */}
          <Navbar />

          {/* 📦 Main Content */}
          <div className="pt-20 flex flex-col min-h-screen bg-[#1f2a44] text-[#e0e0e0]">
            <Component {...pageProps} />
          </div>

          {/* 🦶 Footer */}
          <Footer />

          {/* ⚡ Insert SpeedInsights here */}
          <SpeedInsights />
        </IdleTimerProvider>
      </CartProvider>
    </SessionProvider>
  );
}

export default App;
