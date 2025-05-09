// 📂 components/Navbar.tsx – Fully Working + Desktop Dropdown Fix + Mobile Menu Position Fix 💎

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { FiUser, FiShoppingCart, FiSearch, FiMenu, FiX } from "react-icons/fi";
import { useCart } from "@/context/CartContext";

const Navbar = () => {
  const router = useRouter();
  const pathname = router.pathname;
  const { data: session } = useSession();
  const { cartItems, increaseQty, decreaseQty, removeFromCart, addedItemName } =
    useCart();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const cartRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (cartButtonRef.current?.contains(target)) return;
      if (userButtonRef.current?.contains(target)) return;
      if (cartRef.current && !cartRef.current.contains(target))
        setCartOpen(false);
      if (userRef.current && !userRef.current.contains(target))
        setUserMenuOpen(false);
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mouseup", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mouseup", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setMenuOpen(false);
      setCartOpen(false);
      setUserMenuOpen(false);
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, [router]);

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const handleRemove = (id: number) => {
    if (confirm("Are you sure you want to remove this item from your cart?")) {
      removeFromCart(id);
    }
  };

  const handleUserToggle = () => {
    if (!session) {
      router.push("/auth");
      return;
    }
    setUserMenuOpen((prev) => !prev);
    setCartOpen(false);
  };

  const handleCartToggle = () => {
    setCartOpen((prev) => !prev);
    setUserMenuOpen(false);
  };

  return (
    <>
      {/* 🧭 Navbar Container */}
      <header
        className={`fixed top-0 left-0 w-full bg-[#1f2a44] transition-all duration-300 z-50 flex items-center ${
          scrolled ? "h-16" : "h-20"
        }`}
      >
        {addedItemName && (
          <div className="fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-fade-in z-[9999]">
            ✅ {addedItemName} added to cart!
          </div>
        )}

        {/* 📱 Mobile Top Row */}
        <div className="md:hidden flex items-center justify-between w-full px-4 h-full">
          <div className="text-2xl text-[#e0e0e0]">
            {menuOpen ? (
              <FiX onClick={() => setMenuOpen(false)} />
            ) : (
              <FiMenu onClick={() => setMenuOpen(true)} />
            )}
          </div>

          <Link
            href="/"
            className="text-[#e0e0e0] font-bold text-lg text-center hover:text-white hover:scale-105 transition-transform duration-300"
          >
            <div>
              <div>Classy Diamonds</div>
              <div className="text-xs font-light italic">
                A Cut Above The Rest
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-4 text-2xl text-[#e0e0e0]">
            <button
              ref={userButtonRef}
              onClick={handleUserToggle}
              className="cursor-pointer hover:text-white"
            >
              <FiUser />
            </button>
            <button
              ref={cartButtonRef}
              onClick={handleCartToggle}
              className="relative cursor-pointer hover:text-white"
            >
              <FiShoppingCart />
              {totalQuantity > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {totalQuantity}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 💻 Desktop Layout */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-y-4 px-4 py-2 w-full">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="flex flex-col text-[#e0e0e0] font-bold text-lg hover:text-white hover:scale-105 transition-transform duration-300"
            >
              <span>Classy Diamonds</span>
              <span className="text-xs font-light italic">
                A Cut Above The Rest
              </span>
            </Link>
            {session && (
              <p className="hidden lg:block text-sm text-white font-light mt-1">
                Welcome,{" "}
                {session.user?.name?.split(" ")[0] || session.user?.email}
              </p>
            )}
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-[#e0e0e0] font-semibold text-sm">
            {"Home Jewelry Custom Contact".split(" ").map((name) => {
              const href = `/${name === "Home" ? "" : name.toLowerCase()}`;
              return (
                <Link
                  key={name}
                  href={href}
                  className={`cursor-pointer text-[#e0e0e0] hover:text-white hover:scale-105 transition-transform duration-300 text-sm md:text-base ${
                    pathname === href
                      ? "text-white underline underline-offset-4"
                      : ""
                  }`}
                >
                  {name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 text-[#e0e0e0] text-xl">
            <Link
              href="/search"
              className="cursor-pointer hover:text-white hover:scale-105 transition-transform duration-300"
            >
              <FiSearch />
            </Link>
            <div className="relative">
              <button
                ref={userButtonRef}
                onClick={handleUserToggle}
                className="cursor-pointer hover:text-white hover:scale-105 transition-transform duration-300"
              >
                <FiUser />
              </button>
              {/* ✅ Desktop User Dropdown - Now fully clickable */}
              {userMenuOpen && (
                <div
                  ref={userRef}
                  className="absolute right-0 mt-2 w-48 bg-[#1f2a44]/95 backdrop-blur-sm rounded-xl shadow-lg py-2 text-sm text-white z-[9999] pointer-events-auto"
                >
                  {[
                    // 💎 Use <Link><a>... for better click reliability
                    { href: "/account", label: "My Account" },
                    { href: "/account/orders", label: "Order History" },
                    { href: "/account/track", label: "Track Orders" },
                    { href: "/custom", label: "Custom Requests" },
                  ].map(({ href, label }) => (
                    <Link key={label} href={href} passHref>
                      <a
                        onClick={() => setUserMenuOpen(false)}
                        className="block w-full text-left px-4 py-2 hover:bg-[#2a374f]"
                      >
                        {label}
                      </a>
                    </Link>
                  ))}

                  {(session?.user as any)?.isAdmin && (
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setUserMenuOpen(false);
                        router.push("/admin");
                      }}
                      className="block w-full text-left px-4 py-2 text-yellow-400 hover:bg-[#2a374f] hover:text-yellow-300"
                    >
                      Admin 🛠️
                    </button>
                  )}
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setUserMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-[#2a374f] hover:text-red-500"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
            <button
              ref={cartButtonRef}
              onClick={handleCartToggle}
              className="relative cursor-pointer hover:text-white hover:scale-105 transition-transform duration-300"
            >
              <FiShoppingCart />
              {totalQuantity > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {totalQuantity}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 📱 Mobile Menu Dropdown – ⬇️ moved below navbar */}
      {menuOpen && (
        <div
          className="md:hidden fixed top-[80px] w-full bg-[#25304f] px-6 py-4 space-y-4 text-[#e0e0e0] text-lg z-40"
          style={{ borderRadius: "0 0 0.75rem 0.75rem" }}
        >
          {"Home Jewelry Custom Contact".split(" ").map((name) => {
            const href = `/${name === "Home" ? "" : name.toLowerCase()}`;
            return (
              <Link
                key={name}
                href={href}
                className="block cursor-pointer hover:text-white hover:underline"
                onClick={() => setMenuOpen(false)}
              >
                {name}
              </Link>
            );
          })}
        </div>
      )}

      {/* 📲 Mobile User Dropdown – ✅ unchanged */}
      {userMenuOpen && session?.user && (
        <div
          ref={userRef}
          className="md:hidden fixed right-0 w-80 bg-[#1f2a44]/95 backdrop-blur-sm shadow-lg text-sm text-white z-40 animate-slide-fade-in transition-all duration-300 pointer-events-auto"
          style={{
            top: scrolled ? "64px" : "80px",
            borderRadius: "0 0 0.75rem 0.75rem",
            padding: "1rem 1.5rem",
          }}
        >
          <Link href="/account" className="block px-4 py-2 hover:bg-[#2a374f]">
            My Account
          </Link>
          <Link
            href="/account/orders"
            className="block px-4 py-2 hover:bg-[#2a374f]"
          >
            Order History
          </Link>
          <Link
            href="/account/track"
            className="block px-4 py-2 hover:bg-[#2a374f]"
          >
            Track Orders
          </Link>
          <Link href="/custom" className="block px-4 py-2 hover:bg-[#2a374f]">
            Custom Requests
          </Link>
          {(session?.user as any)?.isAdmin && (
            <Link
              href="/admin"
              className="block px-4 py-2 text-yellow-400 hover:bg-[#2a374f] hover:text-yellow-300"
            >
              Admin 🛠️
            </Link>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-[#2a374f] hover:text-red-500"
          >
            Sign Out
          </button>
        </div>
      )}
      {/* 🛒 Cart Dropdown – ✅ restored */}
      {cartOpen && (
        <div
          ref={cartRef}
          className="fixed right-0 w-80 bg-[#1f2a44]/95 backdrop-blur-sm shadow-lg text-sm text-white z-40 animate-slide-fade-in transition-all duration-300"
          style={{
            top: scrolled ? "64px" : "80px",
            borderRadius: "0 0 0.75rem 0.75rem",
            padding: "1rem 1.5rem",
          }}
        >
          {cartItems.length === 0 ? (
            <p className="text-center text-[#cfd2d6]">Your cart is empty</p>
          ) : (
            <>
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center border-b border-[#2d3a56] pb-4 mb-4"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 object-cover rounded-xl mr-4"
                  />
                  <div className="flex-1 flex flex-col">
                    <p className="text-sm text-[#cfd2d6]">{item.name}</p>
                    <p className="text-xs text-gray-400">
                      ${(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
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
              <Link
                href="/cart"
                onClick={() => setCartOpen(false)}
                className="block text-center bg-white text-[#1f2a44] py-1 text-xs rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                View Full Cart
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Navbar;
//psuh
