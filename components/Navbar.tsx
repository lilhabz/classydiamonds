"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation"; // 🧭
import { FiUser, FiShoppingCart, FiSearch, FiMenu, FiX } from "react-icons/fi";
import { useCart } from "@/context/CartContext"; // 🛒

const Navbar = () => {
  const pathname = usePathname();
  const { cartItems, increaseQty, decreaseQty, removeFromCart, addedItemName } =
    useCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  // 📜 Scroll + Click Outside Cart
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
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

  // 🧠 Total Quantity
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // 🗑 Confirm Remove
  const handleRemove = (id: number) => {
    if (confirm("Are you sure you want to remove this item from your cart?")) {
      removeFromCart(id);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 bg-[#1f2a44] transition-all duration-300 ${
        scrolled ? "h-16" : "h-20"
      }`}
    >
      {/* ✅ Popup Notification */}
      {addedItemName && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in z-[9999]">
          ✅ {addedItemName} added to cart!
        </div>
      )}

      {/* 🧱 Main Bar */}
      <div className="flex items-center justify-between w-full h-full px-4 md:px-6">
        {/* 💎 Logo */}
        <Link
          href="/"
          className="flex flex-col text-white font-bold text-lg hover:opacity-80 hover:scale-105 transition-transform duration-300"
        >
          <span>Classy Diamonds</span>
          <span className="text-xs font-light">
            <i>A Cut Above The Rest</i>
          </span>
        </Link>

        {/* 🧭 Center Links */}
        <nav className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 space-x-10 text-[#e0e0e0] font-semibold text-sm">
          {[
            { name: "Home", href: "/" },
            { name: "Jewelry", href: "/jewelry" },
            { name: "Custom", href: "/custom" },
            { name: "Contact", href: "/contact" },
          ].map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`hover:text-white hover:scale-105 transition-transform duration-300 text-base md:text-lg ${
                pathname === link.href
                  ? "text-white underline underline-offset-4"
                  : ""
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* 📦 Right Side */}
        <div className="hidden md:flex space-x-6 text-[#e0e0e0] text-xl relative">
          {/* 🔍 */}
          <Link
            href="/search"
            className="hover:text-white hover:scale-105 transition-transform duration-300"
          >
            <FiSearch />
          </Link>

          {/* 👤 */}
          <Link
            href="/account"
            className="hover:text-white hover:scale-105 transition-transform duration-300"
          >
            <FiUser />
          </Link>

          {/* 🛒 Cart */}
          <div className="relative">
            <button
              onClick={() => setCartOpen((prev) => !prev)}
              className="cursor-pointer hover:text-white hover:scale-105 transition-transform duration-300 relative"
            >
              <FiShoppingCart />
              {totalQuantity > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {totalQuantity}
                </span>
              )}
            </button>

            {/* 🛍 Cart Dropdown */}
            {cartOpen && (
              <div
                ref={cartRef}
                className="absolute right-0 mt-4 w-80 bg-[#1f2a44]/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 flex flex-col gap-6 z-50 animate-fade-in"
              >
                {cartItems.length === 0 ? (
                  <p className="text-center text-[#cfd2d6]">
                    Your cart is empty
                  </p>
                ) : (
                  <>
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center border-b border-[#2d3a56] pb-4"
                      >
                        {/* 🖼️ */}
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 object-cover rounded-xl mr-4"
                        />

                        {/* 📄 Info */}
                        <div className="flex-1 flex flex-col">
                          <p className="text-sm text-[#cfd2d6]">{item.name}</p>
                          <p className="text-xs text-gray-400">
                            ${(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>

                        {/* ➕➖ and 🗑 */}
                        <div className="flex flex-col items-center space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => decreaseQty(item.id)}
                              className="px-2 py-1 text-xs bg-white text-[#1f2a44] rounded hover:bg-gray-100"
                            >
                              -
                            </button>
                            <span className="text-sm">{item.quantity}</span>
                            <button
                              onClick={() => increaseQty(item.id)}
                              className="px-2 py-1 text-xs bg-white text-[#1f2a44] rounded hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* 🚪 View Cart */}
                    <Link
                      href="/cart"
                      onClick={() => setCartOpen(false)}
                      className="mt-4 text-center bg-white text-[#1f2a44] py-3 rounded-xl font-semibold hover:bg-gray-100 transition"
                    >
                      View Full Cart
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 🍔 Mobile */}
        <div className="md:hidden flex items-center text-2xl text-[#e0e0e0]">
          {menuOpen ? (
            <FiX onClick={() => setMenuOpen(false)} />
          ) : (
            <FiMenu onClick={() => setMenuOpen(true)} />
          )}
        </div>
      </div>

      {/* 📱 Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#1f2a44] flex flex-col items-center space-y-6 py-8 text-[#e0e0e0] text-lg">
          {[
            { name: "Home", href: "/" },
            { name: "Jewelry", href: "/jewelry" },
            { name: "Custom", href: "/custom" },
            { name: "Contact", href: "/contact" },
          ].map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
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
