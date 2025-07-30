import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Disable Critters to avoid missing module errors during build
    optimizeCss: false,
  },
  images: {
    domains: [
      "res.cloudinary.com", // generic Cloudinary host
      "my‑cloud.res.cloudinary.com", // <–– your actual cloud name here
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
