// next.config.ts
import { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Disable Critters to avoid missing module errors during build
    optimizeCss: false,
  },
  images: {
    domains: [
      "res.cloudinary.com", // allow Cloudinary-hosted images
      // add any other hosts you need here
    ],
  },
  eslint: {
    // Allow production builds to complete even if ESLint errors exist
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
