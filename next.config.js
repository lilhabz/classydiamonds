/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Disable Critters to avoid missing module errors during build
    optimizeCss: false,
  },
  images: {
    domains: [
      "res.cloudinary.com", // allow Cloudinary‑hosted images
    ],
  },
  eslint: {
    // Allow production builds to successfully complete even if
    // there are ESLint errors in the project.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
