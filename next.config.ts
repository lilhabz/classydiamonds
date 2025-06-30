/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "res.cloudinary.com", // allow Cloudinary-hosted images
    ],
  },
  eslint: {
    // Allow production builds to successfully complete even if
    // there are ESLint errors in the project.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
