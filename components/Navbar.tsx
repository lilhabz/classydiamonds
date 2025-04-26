"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FiUser, FiShoppingCart, FiSearch, FiMenu, FiX } from "react-icons/fi";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? "py-2 bg-[#1f2a44]/90 backdrop-blur" : "py-4 bg-[#1f2a44]"}`}>
      <div className="flex items-center justify-between w-full px-4 md:px-6">

        {/* Logo & Slogan */}
        <Link href="/" className="flex flex-col text-white font-bold text-lg hover:opacity-80">
          <span>Classy Diamonds</span>
          <span className="text-xs font-light">A Cut Above The Rest</span>
        </Link>

        {/* Middle Nav Links */}
        <nav className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 space-x-10 text-[#e0e0e0] font-semibold text-sm">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/jewelry" className="hover:text-white">Jewelry</Link>
          <Link href="/custom" className="hover:text-white">Custom</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
        </nav>

        {/* User Icons */}
        <div className="hidden md:flex space-x-6 text-[#e0e0e0] text-xl">
          <Link href="/search" className="hover:text-white">
            <FiSearch />
          </Link>
          <Link href="/account" className="hover:text-white">
            <FiUser />
          </Link>
          <Link href="/cart" className="hover:text-white">
            <FiShoppingCart />
          </Link>
        </div>

        {/* Hamburger Icon */}
        <div className="md:hidden flex items-center text-2xl text-[#e0e0e0]">
          {menuOpen ? (
            <FiX onClick={() => setMenuOpen(false)} />
          ) : (
            <FiMenu onClick={() => setMenuOpen(true)} />
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#1f2a44] flex flex-col items-center space-y-6 py-8 text-[#e0e0e0] text-lg">
          <Link href="/" className="hover:text-white" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/jewelry" className="hover:text-white" onClick={() => setMenuOpen(false)}>Jewelry</Link>
          <Link href="/custom" className="hover:text-white" onClick={() => setMenuOpen(false)}>Custom</Link>
          <Link href="/contact" className="hover:text-white" onClick={() => setMenuOpen(false)}>Contact</Link>
          <div className="flex space-x-6 mt-4">
            <Link href="/search" className="hover:text-white">
              <FiSearch />
            </Link>
            <Link href="/account" className="hover:text-white">
              <FiUser />
            </Link>
            <Link href="/cart" className="hover:text-white">
              <FiShoppingCart />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
