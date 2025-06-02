// 📄 components/Footer.tsx – Global Footer for All Pages 💎

import Link from "next/link";

// 🦶 Footer Component - Appears at the bottom of all pages
const Footer = () => {
  return (
    <footer className="bg-[#1f2a44] text-[#e0e0e0] text-center py-8">
      {/* 📅 Year & Site Info */}
      <div className="text-sm">
        © {new Date().getFullYear()} Classy Diamonds. All rights reserved.
      </div>

      {/* 🔗 Footer Navigation Links */}
      <div className="mt-4 flex justify-center space-x-6 text-xs">
        <Link href="/privacy" className="hover:text-white transition">
          Privacy Policy
        </Link>
        <span>|</span>
        <Link href="/terms" className="hover:text-white transition">
          Terms of Service
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
