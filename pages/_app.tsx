import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/context/CartContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CartProvider>
      {" "}
      <Navbar />
      <div className="pt-24 min-h-screen flex flex-col">
        <Component {...pageProps} />
      </div>
      <Footer />
    </CartProvider>
  );
}
