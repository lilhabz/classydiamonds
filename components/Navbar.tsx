"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FiUser, FiShoppingCart, FiSearch, FiMenu, FiX } from "react-icons/fi";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const cartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        setCartOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 bg-[#1f2a44] transition-all duration-300 ${
        scrolled ? "h-16" : "h-20"
      }`}
    >
      <div className="flex items-center justify-between w-full h-full px-4 md:px-6">
        {/* Logo & Slogan */}
        <Link
          href="/"
          className="flex flex-col text-white font-bold text-lg hover:opacity-80 hover:scale-105 transition-transform duration-300"
        >
          <span>Classy Diamonds</span>
          <span className="text-xs font-light">
            <i>A Cut Above The Rest</i>
          </span>
        </Link>

        {/* Middle Nav Links */}
        <nav className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 space-x-10 text-[#e0e0e0] font-semibold text-sm">
          <Link
            href="/"
            className="hover:text-white hover:scale-105 transition-transform duration-300 text-base md:text-lg"
          >
            Home
          </Link>

          {/* Jewelry Link with Dropdown */}
          <div className="relative group">
            <Link
              href="/jewelry"
              className="hover:text-white hover:scale-105 transition-transform duration-300 text-base md:text-lg"
            >
              Jewelry
            </Link>

            {/* Jewelry Dropdown with rgba background */}
            <div
              style={{ backgroundColor: "rgba(31, 42, 68, 0.9)" }}
              className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 rounded-2xl shadow-lg flex flex-col text-center text-sm py-2 w-48 z-50 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-in-out"
            >
              {[
                { label: "Engagement Rings", href: "/engagement-rings" },
                { label: "Wedding Bands", href: "/wedding-bands" },
                { label: "Rings", href: "/rings" },
                { label: "Bracelets", href: "/bracelets" },
                { label: "Necklaces", href: "/necklaces" },
                { label: "Earrings", href: "/earrings" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="px-2 py-1 text-[#cfd2d6] hover:text-white transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/custom"
            className="hover:text-white hover:scale-105 transition-transform duration-300 text-base md:text-lg"
          >
            Custom
          </Link>
          <Link
            href="/contact"
            className="hover:text-white hover:scale-105 transition-transform duration-300 text-base md:text-lg"
          >
            Contact
          </Link>
        </nav>

        {/* User Icons */}
        <div className="hidden md:flex space-x-6 text-[#e0e0e0] text-xl relative">
          <Link
            href="/search"
            className="hover:text-white hover:scale-105 transition-transform duration-300"
          >
            <FiSearch />
          </Link>
          <Link
            href="/account"
            className="hover:text-white hover:scale-105 transition-transform duration-300"
          >
            <FiUser />
          </Link>

          {/* Cart Icon */}
          <div className="relative">
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="hover:text-white hover:scale-105 transition-transform duration-300"
            >
              <FiShoppingCart />
            </button>

            {cartOpen && (
              <div
                ref={cartRef}
                className="absolute right-0 mt-4 w-80 bg-[#1f2a44] rounded-2xl shadow-lg p-6 flex flex-col gap-4 z-50"
              >
                {/* Dummy Cart Items */}
                <div className="flex items-center gap-4">
                  <img
                    src="/products/engagement-ring.jpg"
                    alt="Product"
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                  <div className="flex flex-col">
                    <p className="text-sm text-[#cfd2d6]">Diamond Ring</p>
                    <p className="text-sm text-gray-400">$4,200</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <img
                    src="/products/tennis-bracelet.jpg"
                    alt="Product"
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                  <div className="flex flex-col">
                    <p className="text-sm text-[#cfd2d6]">Tennis Bracelet</p>
                    <p className="text-sm text-gray-400">$1,800</p>
                  </div>
                </div>

                <Link
                  href="/cart"
                  onClick={() => setCartOpen(false)}
                  className="mt-4 text-center bg-white text-[#1f2a44] py-3 rounded-xl font-semibold hover:bg-gray-100 transition"
                >
                  View Full Cart
                </Link>
              </div>
            )}
          </div>
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
          <Link href="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link href="/jewelry" onClick={() => setMenuOpen(false)}>
            Jewelry
          </Link>

          {/* Mobile Categories */}
          <div className="flex flex-col space-y-4 text-sm">
            <Link href="/engagement-rings" onClick={() => setMenuOpen(false)}>
              Engagement Rings
            </Link>
            <Link href="/wedding-bands" onClick={() => setMenuOpen(false)}>
              Wedding Bands
            </Link>
            <Link href="/rings" onClick={() => setMenuOpen(false)}>
              Rings
            </Link>
            <Link href="/bracelets" onClick={() => setMenuOpen(false)}>
              Bracelets
            </Link>
            <Link href="/necklaces" onClick={() => setMenuOpen(false)}>
              Necklaces
            </Link>
            <Link href="/earrings" onClick={() => setMenuOpen(false)}>
              Earrings
            </Link>
          </div>

          <Link href="/custom" onClick={() => setMenuOpen(false)}>
            Custom
          </Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>

          <div className="flex space-x-6 mt-4">
            <Link href="/search">
              <FiSearch />
            </Link>
            <Link href="/account">
              <FiUser />
            </Link>
            <Link href="/cart">
              <FiShoppingCart />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
