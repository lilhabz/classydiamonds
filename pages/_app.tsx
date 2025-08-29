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
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const pathnameOf = (url: string) =>
      new URL(url, window.location.origin).pathname;

    const isJewelryPath = (p: string) => p === "/jewelry";
    const isSubcatPath = (p: string) =>
      /^\/category\/[^/]+\/subcategory\/[^/]+$/.test(p);

    // ⬇️ Only scroll to top when the PATHNAME changes (ignore query-only)
    const handleRouteChangeStart = (url: string) => {
      const toPath = pathnameOf(url);
      const fromPath = pathnameOf(router.asPath);
      if (toPath !== fromPath) {
        window.scrollTo(0, 0);
      }
    };

    // ⬇️ Keep the “open from top” behavior for first loads into
    // /jewelry and subcategory pages — but again, ONLY on pathname change.
    const handleRouteChangeComplete = (url: string) => {
      const toPath = pathnameOf(url);
      const fromPath = pathnameOf(router.asPath);

      // if only queries changed (filters), do nothing
      if (toPath === fromPath) return;

      const params = new URL(url, window.location.origin).searchParams;
      const wantScroll = params.get("scroll") === "true";

      if (!wantScroll && (isJewelryPath(toPath) || isSubcatPath(toPath))) {
        // ensure the hero is visible after content paints
        requestAnimationFrame(() =>
          window.scrollTo({ top: 0, behavior: "auto" })
        );
      }
    };

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
