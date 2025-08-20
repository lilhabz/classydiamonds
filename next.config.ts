// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizeCss: false,
  },
  images: {
    // Prefer remotePatterns over domains; it's more explicit and future-proof
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Add any others you actually use:
      // { protocol: "https", hostname: "images.unsplash.com" },
      // { protocol: "https", hostname: "cdn.shopify.com" },
      // { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // { protocol: "https", hostname: "your-bucket.s3.amazonaws.com" },
    ],
    // (Optional) keep formats for better perf
    formats: ["image/avif", "image/webp"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
