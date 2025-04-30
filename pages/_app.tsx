import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react"; // ✅ Add this
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
      {" "}
      {/* ✅ Wrap for NextAuth */}
      <CartProvider>
        <Navbar />
        <div className="pt-24 min-h-screen flex flex-col">
          <Component {...pageProps} />
        </div>
        <Footer />
      </CartProvider>
    </SessionProvider>
  );
}
