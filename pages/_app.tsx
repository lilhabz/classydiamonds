// 📄 pages/_app.tsx – Global Layout (Navbar, vertically‐centered content, Footer)

import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

// ⚡ Speed Insights (optional—leave it in if you still want it)
import { SpeedInsights } from "@vercel/speed-insights/next";

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Prevent browser from auto‐restoring scroll
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Only scroll to top on full route changes (skip same‐page query changes)
    const handleRouteChangeStart = (url: string) => {
      const toPath = url.split("?")[0];
      const fromPath = router.asPath.split("?")[0];
      if (toPath !== fromPath) {
        window.scrollTo(0, 0);
      }
    };

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
        {/*
          ┌────────────────────────────────────────┐
          │ 1) Navbar always sits at top          │
          └────────────────────────────────────────┘
        */}
        <Navbar />

        {/*
          ┌───────────────────────────────────────────────────────────────────┐
          │ 2) “Middle” area that grows to fill remaining space             │
          │    – flex‐grow ensures Footer stays at the bottom.              │
          │    – items‐center + justify‐center vertically/horizontally cent│
          │      ers your page content (e.g. the Auth form) exactly halfway│
          │      between Navbar and Footer.                                 │
          └───────────────────────────────────────────────────────────────────┘
        */}
        <div className="flex flex-col flex-grow bg-[var(--bg-page)] text-[var(--foreground)] px-4">
          <div className="flex flex-grow items-center justify-center">
            <Component {...pageProps} />
          </div>
        </div>

        {/*
          ┌────────────────────────────────────────┐
          │ 3) Footer always at bottom (no extra │
          │    top padding inside Footer itself). │
          └────────────────────────────────────────┘
        */}
        <Footer />

        {/*
          ⚡ Speed Insights at bottom, if still needed.
        */}
        <SpeedInsights />
      </CartProvider>
    </SessionProvider>
  );
}

export default App;
