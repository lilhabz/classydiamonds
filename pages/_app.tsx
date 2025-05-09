// 📂 pages/_app.tsx – With Vercel Speed Insights 🧪

import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react"; // 🔐 Session auth
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";
import { SpeedInsights } from "@vercel/speed-insights/next"; // 🚀 Performance tracking

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

        {/* 🧪 Vercel Speed Analytics */}
        <SpeedInsights />

        {/* 📄 Page Content with padding for navbar */}
        <div className="pt-20 flex flex-col min-h-screen bg-[#1f2a44] text-[#e0e0e0]">
          <Component {...pageProps} />
        </div>

        {/* 🔚 Global Footer */}
        <Footer />
      </CartProvider>
    </SessionProvider>
  );
}
