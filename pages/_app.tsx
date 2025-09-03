// 📄 pages/_app.tsx – App with reliable Scroll Reset, Device Classes & Speed Insights Integration

import "@/styles/globals.css";
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import IdleTimerProvider from "@/components/AutoLogout";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/tiffany-cards.css";

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();

  // Keep the FROM path stable across route events
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Don’t let the browser restore prior offsets automatically
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
    } catch {}

    const pathnameOf = (url: string) =>
      new URL(url, window.location.origin).pathname;

    const hasDeepLink = (url: string) =>
      url.includes("#") || /\bscroll=true\b/.test(url);

    const isJewelryPath = (p: string) => p === "/jewelry";
    const isSubcatPath = (p: string) =>
      /^\/category\/[^/]+\/subcategory\/[^/]+$/.test(p);

    const handleRouteChangeStart = () => {
      // Capture the path we’re leaving
      prevPathRef.current = pathnameOf(router.asPath);
    };

    const handleRouteChangeComplete = (url: string) => {
      const toPath = pathnameOf(url);
      const fromPath = prevPathRef.current;

      // If we somehow didn’t get a start event, fall back
      if (fromPath == null) {
        prevPathRef.current = toPath;
      }

      // Ignore query-only updates
      if (fromPath === toPath) return;

      // Honor hashes and explicit deep-link query
      if (hasDeepLink(url)) return;

      // Force top for Jewelry & its subcategory detail pages
      if (isJewelryPath(toPath) || isSubcatPath(toPath)) {
        const html = document.documentElement as HTMLElement & { style: any };
        const prev = html.style.scrollBehavior;

        // Disable smooth only for this jump to avoid racing with global smooth-scroll
        html.style.scrollBehavior = "auto";
        // Double RAF to win against late layout/image shifts
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          requestAnimationFrame(() => {
            window.scrollTo(0, 0);
            html.style.scrollBehavior = prev || "";
            // Let Navbar instantly reset its height (prevents h-20→h-16 push)
            window.dispatchEvent(new Event("force-scroll-top"));
          });
        });
      }
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    router.events.on("routeChangeComplete", handleRouteChangeComplete);

    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
      router.events.off("routeChangeComplete", handleRouteChangeComplete);
      try {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = "auto";
        }
      } catch {}
    };
  }, [router]);

  /* 🔍 UA detection → add body class for per-device tweaks */
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const body = document.body;

    if (ua.includes("iphone se")) body.classList.add("ua-iphonese");
    else if (ua.includes("iphone xr")) body.classList.add("ua-iphonexr");
    else if (ua.includes("iphone 12")) body.classList.add("ua-iphone12");
    else if (ua.includes("iphone 14")) body.classList.add("ua-iphone14");
    else if (ua.includes("pixel 7")) body.classList.add("ua-pixel7");
    else if (ua.includes("sm-g988")) body.classList.add("ua-s20ultra"); // Galaxy S20 Ultra UA code
    else if (ua.includes("sm-g955")) body.classList.add("ua-s8plus");   // Galaxy S8+
    // ➕ add more mappings as needed

    // Cleanup if hot reloaded
    return () => {
      body.className = body.className
        .split(" ")
        .filter((c) => !c.startsWith("ua-"))
        .join(" ");
    };
  }, []);

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
