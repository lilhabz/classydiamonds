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
import { SpeedInsights } from "@vercel/speed-insights/next";

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Ensure the browser does NOT restore previous scroll positions across routes
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {}

    const pathnameOf = (url: string) =>
      new URL(url, window.location.origin).pathname;

    const hasDeepLink = (url: string) => {
      // Respect anchors and explicit deep-link query
      if (!url) return false;
      if (url.includes("#")) return true;
      if (/\bscroll=true\b/.test(url)) return true;
      return false;
    };

    const isJewelryPath = (p: string) => p === "/jewelry";
    const isSubcatPath = (p: string) =>
      /^\/category\/[^/]+\/subcategory\/[^/]+$/.test(p);

    const forceScrollTopOnce = () => {
      // Temporarily disable smooth behavior so the jump is immediate and cannot "race"
      const html = document.documentElement as HTMLElement & { style: any };
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      html.style.scrollBehavior = prev || "";
    };

    // We ONLY act on routeChangeComplete, after the new page is ready.
    const handleRouteChangeComplete = (url: string) => {
      const toPath = pathnameOf(url);
      const fromPath = pathnameOf(router.asPath);

      // If only the query changed (filters on the same page), do nothing.
      if (toPath === fromPath) return;

      // Skip if user explicitly deep-linked.
      if (hasDeepLink(url)) return;

      // Guarantee top for Jewelry and its subcategory pages.
      if (isJewelryPath(toPath) || isSubcatPath(toPath)) {
        // After paint, force the top once with smooth behavior briefly disabled
        requestAnimationFrame(() => {
          forceScrollTopOnce();
        });
      }
    };

    router.events.on("routeChangeComplete", handleRouteChangeComplete);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
      try {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = "auto";
        }
      } catch {}
    };
  }, [router]);

  return (
    <SessionProvider session={session}>
      <CartProvider>
        <IdleTimerProvider>
          <Navbar />
          <div className="pt-20 flex flex-col min-h-screen bg-[#1f2a44] text-[#e0e0e0]">
            <Component {...pageProps} />
          </div>
          <Footer />
          <SpeedInsights />
        </IdleTimerProvider>
      </CartProvider>
    </SessionProvider>
  );
}

export default App;
