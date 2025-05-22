// 📄 pages/_app.tsx – Now with Scroll Fix + SpeedInsights 🧠

import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

import { useEffect } from "react";
import { useRouter } from "next/router"; // 👈 Add this

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const router = useRouter(); // 👈 Use the router

  useEffect(() => {
    const handleRouteChangeStart = () => {
      window.scrollTo(0, 0); // 🧹 Reset scroll BEFORE navigation
    };

    router.events.on("routeChangeStart", handleRouteChangeStart);
    return () => {
      router.events.off("routeChangeStart", handleRouteChangeStart);
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
