// 📄 pages/_app.tsx – Global Layout with Fixed Top Padding & Footer at Bottom

import "@/styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

// ⚡ Speed Insights – optional, leave here if you still need it
import { SpeedInsights } from "@vercel/speed-insights/next";

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Prevent browser from auto-restoring scroll
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Only scroll to top on full route changes (ignore same-page query changes)
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
        {/* 🌐 Navbar always at top */}
        <Navbar />

        {/* 
          📦 Main area fills available space between Navbar and Footer.
          pt-[5rem] gives a fixed gap under the Navbar (adjust as needed).
        */}
        <main className="flex flex-col flex-grow pt-[5rem] px-4 bg-[var(--bg-page)] text-[var(--foreground)]">
          <Component {...pageProps} />
        </main>

        {/* 🦶 Footer stays its original height (py-8 inside Footer) */}
        <Footer />

        {/* ⚡ Speed Insights widget at very bottom, if desired */}
        <SpeedInsights />
      </CartProvider>
    </SessionProvider>
  );
}

export default App;
