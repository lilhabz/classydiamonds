// 📄 pages/_document.tsx – Enhanced for SEO + Web Vitals 🚀

import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Mobile responsive viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* ✅ Preconnect to Google for Map iframe speed */}
        <link rel="preconnect" href="https://www.google.com" />
        <link
          rel="preconnect"
          href="https://maps.googleapis.com"
          crossOrigin="anonymous"
        />

        {/* 🧭 Canonical links should be page specific and will be set in each page */}

        {/* ⏱️ Recommended if adding Google Fonts manually */}
        {/* <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=YourFont&display=swap" /> */}
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
