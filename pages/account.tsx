// 📂 components/Navbar.tsx – Fresh User Data Sync 💎 + Mobile/Desktop Menus

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { FiUser, FiShoppingCart, FiSearch, FiMenu, FiX } from "react-icons/fi";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const router = useRouter();
  const pathname = router.pathname;
  const { data: session } = useSession();
  const { cartItems, addedItemName } = useCart();

  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const cartRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLDivElement>(null);

  // ✅ Sync user name from session
  useEffect(() => {
    if (session?.user?.name) {
      setUserName(session.user.name.split(" ")[0]);
    }
  }, [session]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      const clickedOutsideCart =
        cartRef.current &&
        !cartRef.current.contains(target) &&
        !cartButtonRef.current?.contains(target);
      const clickedOutsideUser =
        userRef.current &&
        !userRef.current.contains(target) &&
        !userButtonRef.current?.contains(target);
      const clickedOutsideMenu =
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !menuButtonRef.current?.contains(target);

      if (clickedOutsideCart && clickedOutsideUser && clickedOutsideMenu) {
        setCartOpen(false);
        setUserMenuOpen(false);
        setMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mouseup", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mouseup", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setMenuOpen(false);
      setCartOpen(false);
      setUserMenuOpen(false);
    };

    router.events.on("routeChangeStart", handleRouteChange);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router]);

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleUserToggle = () => {
    if (!session) {
      router.push("/auth");
      return;
    }
    setUserMenuOpen((prev) => !prev);
    setCartOpen(false);
    setMenuOpen(false);
  };

  return (
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

      {/* 📱 Mobile Layout */}
      <div className="md:hidden flex items-center justify-between w-full px-4 h-full">
        <div className="text-2xl text-[#e0e0e0]" ref={menuButtonRef}>
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setUserMenuOpen(false);
              setCartOpen(false);
            }}
            className="cursor-pointer"
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>

        <Link
          href="/"
          aria-label="Go to homepage"
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
            aria-label="Account menu"
            className="cursor-pointer hover:text-white flex items-center gap-1"
          >
            {userName && (
              <span className="text-sm font-medium text-white">{userName}</span>
            )}
            <FiUser />
          </button>
        </div>
      </div>

      {/* 💻 Desktop Layout */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-y-4 px-4 py-2 w-full">
        <Link
          href="/"
          className="flex flex-col text-[#e0e0e0] font-bold text-lg hover:text-white hover:scale-105 transition-transform duration-300"
        >
          <span>Classy Diamonds</span>
          <span className="text-xs font-light italic">
            A Cut Above The Rest
          </span>
        </Link>

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
          {userName && (
            <span className="hidden lg:inline text-sm font-medium text-white mr-1">
              {userName}
            </span>
          )}
          <div className="relative">
            <button
              ref={userButtonRef}
              onClick={handleUserToggle}
              aria-label="Account menu"
              className="cursor-pointer hover:text-white hover:scale-105 transition-transform duration-300 flex items-center gap-2"
            >
              <FiUser />
            </button>
            {userMenuOpen && (
              <div
                ref={userRef}
                className="absolute right-0 mt-2 w-48 bg-[#1f2a44]/95 backdrop-blur-sm rounded-xl shadow-lg py-2 text-sm text-white z-[9999] pointer-events-auto"
              >
                <Link
                  href="/account"
                  className="block w-full text-left px-4 py-2 hover:bg-[#2a374f]"
                >
                  My Account
                </Link>
                <Link
                  href="/account/orders"
                  className="block w-full text-left px-4 py-2 hover:bg-[#2a374f]"
                >
                  Order History
                </Link>
                {session?.user?.isAdmin && (
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
            onClick={() => setCartOpen((prev) => !prev)}
            aria-label="View cart"
            className="relative cursor-pointer hover:text-white hover:scale-105 transition-transform duration-300"
          >
            <FiShoppingCart />
            {totalQuantity > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                {totalQuantity}
              </span>
            )}
          </button>

          <Link
            href="/search"
            aria-label="Search"
            className="cursor-pointer hover:text-white hover:scale-105 transition-transform duration-300"
          >
            <FiSearch />
          </Link>
        </div>
      </div>
    </header>
  );
}
