// 📄 pages/_app.tsx – Now with SpeedInsights 🧠

import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react"; // 🔐 Wrap app with session support
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      {/* 🔐 Provides user session state to all components */}
      <CartProvider>
        {/* 🧭 Global site layout */}
        <Navbar />

        {/* 📄 Page Content with padding for navbar */}
        <div className="pt-20 flex flex-col min-h-screen bg-[#1f2a44] text-[#e0e0e0]">
          <Component {...pageProps} />
        </div>

        {/* 🔚 Global Footer */}
        <Footer />

        {/* 🚀 Vercel Speed Insights */}
        <SpeedInsights />
      </CartProvider>
    </SessionProvider>
  );
}
