// 📂 components/Navbar.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { FiUser, FiShoppingCart, FiSearch, FiMenu, FiX } from "react-icons/fi";
import { useCart } from "@/context/CartContext";

const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
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
      if (
        cartRef.current &&
        !cartRef.current.contains(target) &&
        cartButtonRef.current &&
        !cartButtonRef.current.contains(target)
      ) {
        setCartOpen(false);
      }
      if (
        userRef.current &&
        !userRef.current.contains(target) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setMenuOpen(false);
      setCartOpen(false);
      setUserMenuOpen(false);
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, [router]);

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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
      {addedItemName && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-fade-in z-[9999]">
          ✅ {addedItemName} added to cart!
        </div>
      )}

      <div className="relative">
        {/* 📱 Mobile Layout */}
        <div className="md:hidden flex items-center justify-between w-full px-4 h-full">
          <div className="absolute left-1/2 -translate-x-1/2 text-2xl text-[#e0e0e0]">
            {menuOpen ? (
              <FiX onClick={() => setMenuOpen(false)} />
            ) : (
              <FiMenu onClick={() => setMenuOpen(true)} />
            )}
          </div>

          <Link
            href="/"
            className="flex flex-col text-white font-bold text-lg hover:opacity-80 hover:scale-105 transition-transform duration-300"
          >
            <span>Classy Diamonds</span>
            <span className="text-xs font-light">
              <i>A Cut Above The Rest</i>
            </span>
          </Link>

          <div className="flex items-center gap-4 text-2xl text-[#e0e0e0]">
            <button
              ref={userButtonRef}
              onClick={() => setUserMenuOpen((prev) => !prev)}
              className="hover:text-white"
            >
              <FiUser />
            </button>
            <button
              ref={cartButtonRef}
              onClick={() => setCartOpen((prev) => !prev)}
              className="relative"
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

        {userMenuOpen && session && (
          <div
            ref={userRef}
            className="absolute right-0 top-full mt-2 w-48 bg-[#1f2a44]/95 backdrop-blur-sm rounded-xl shadow-lg py-2 text-sm text-white z-50 animate-slide-fade-in md:hidden"
          >
            <Link
              href="/account"
              className="block px-4 py-2 hover:bg-[#2a374f]"
            >
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
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left px-4 py-2 text-red-400 hover:bg-[#2a374f] hover:text-red-500"
            >
              Sign Out
            </button>
          </div>
        )}

        {cartOpen && (
          <div
            ref={cartRef}
            className="absolute right-0 top-full mt-2 w-80 bg-[#1f2a44]/95 backdrop-blur-sm rounded-l-xl shadow-lg p-6 flex flex-col gap-6 z-50 animate-slide-fade-in"
          >
            {cartItems.length === 0 ? (
              <p className="text-center text-[#cfd2d6]">Your cart is empty</p>
            ) : (
              <>
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center border-b border-[#2d3a56] pb-4"
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
                  className="mt-2 text-center bg-white text-[#1f2a44] py-1 text-sm rounded-lg font-semibold hover:bg-gray-100 transition"
                >
                  View Full Cart
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#1f2a44] flex flex-col items-center space-y-6 py-8 text-[#e0e0e0] text-lg">
          {"Home Jewelry Custom Contact".split(" ").map((name) => (
            <Link
              key={name}
              href={`/${name === "Home" ? "" : name.toLowerCase()}`}
              onClick={() => setMenuOpen(false)}
            >
              {name}
            </Link>
          ))}
        </div>
      )}

      <div className="hidden md:flex items-center justify-between w-full h-full px-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex flex-col text-white font-bold text-lg hover:opacity-80 hover:scale-105 transition-transform duration-300"
          >
            <span>Classy Diamonds</span>
            <span className="text-xs font-light">
              <i>A Cut Above The Rest</i>
            </span>
          </Link>
          {session && (
            <p className="hidden md:block text-sm text-white font-light mt-1">
              Welcome,{" "}
              {session.user?.name?.split(" ")[0] || session.user?.email}
            </p>
          )}
        </div>

        <nav className="absolute left-1/2 transform -translate-x-1/2 space-x-10 text-[#e0e0e0] font-semibold text-sm">
          {"Home Jewelry Custom Contact".split(" ").map((name) => {
            const href = `/${name === "Home" ? "" : name.toLowerCase()}`;
            return (
              <Link
                key={name}
                href={href}
                className={`hover:text-white hover:scale-105 transition-transform duration-300 text-base md:text-lg ${
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

        <div className="flex items-center gap-6 text-[#e0e0e0] text-xl">
          <Link
            href="/search"
            className="hover:text-white hover:scale-105 transition-transform duration-300"
          >
            <FiSearch />
          </Link>

          {/* 👤 User Icon */}
          <div className="relative" ref={userRef}>
            {session ? (
              <>
                <button
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="hover:text-white hover:scale-105 transition-transform duration-300 cursor-pointer"
                  ref={userButtonRef}
                >
                  <FiUser />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#1f2a44]/95 backdrop-blur-sm rounded-xl shadow-lg py-2 text-sm text-white z-50">
                    <Link
                      href="/account"
                      className="block px-4 py-2 hover:bg-[#2a374f]"
                    >
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
                    <Link
                      href="/custom"
                      className="block px-4 py-2 hover:bg-[#2a374f]"
                    >
                      Custom Requests
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full text-left px-4 py-2 text-red-400 hover:bg-[#2a374f] hover:text-red-500"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/auth"
                className="cursor-pointer hover:text-white hover:scale-105 transition-transform duration-300"
              >
                <FiUser />
              </Link>
            )}
          </div>

          {/* 🛒 Cart Icon */}
          <button
            ref={cartButtonRef}
            onClick={() => setCartOpen((prev) => !prev)}
            className="relative hover:text-white hover:scale-105 transition-transform duration-300"
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
  );
};

export default Navbar;
