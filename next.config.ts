/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "res.cloudinary.com", // allow Cloudinary-hosted images
    ],
    formats: ["image/avif", "image/webp"],
  },
  eslint: {
    // Allow production builds to successfully complete even if
    // there are ESLint errors in the project.
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;
