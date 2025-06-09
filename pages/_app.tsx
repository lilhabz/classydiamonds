// 📄 pages/_app.tsx – App with Scroll Restoration & Speed Insights Integration 🚀

import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import AutoLogout from "@/components/AutoLogout";

// ⚡ Import the SpeedInsights component (no HOC wrapper needed)
import { SpeedInsights } from "@vercel/speed-insights/next";

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // 🎯 Prevent browser from auto-restoring scroll
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // 🔄 Only scroll to top on full route changes (skip same-page query changes)
    const handleRouteChangeStart = (url: string) => {
      const toPath = url.split("?")[0];
      const fromPath = router.asPath.split("?")[0];
      if (toPath !== fromPath) {
        window.scrollTo(0, 0);
      }
    };

    // 📡 Listen for route changes
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
        {/* 🌐 Navbar */}
        <Navbar />
        {/* ⏳ Auto logout after inactivity */}
        <AutoLogout />

        {/* 📦 Main Content */}
        <div className="pt-20 flex flex-col min-h-screen bg-[#1f2a44] text-[#e0e0e0]">
          <Component {...pageProps} />
        </div>

        {/* 🦶 Footer */}
        <Footer />

        {/* ⚡ Insert SpeedInsights here */}
        <SpeedInsights />
      </CartProvider>
    </SessionProvider>
  );
}

export default App;
