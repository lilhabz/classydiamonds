import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-[#1f2a44] text-[#e0e0e0] text-center py-8 mt-20">
      <div className="text-sm">
        © {new Date().getFullYear()} Classy Diamonds. All rights reserved.
      </div>
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
