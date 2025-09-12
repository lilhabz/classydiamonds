// 📤 pages/cart.tsx – Guest Checkout Enabled: Shipping Form + Prefill + Unified Payload 💎
// + Password Guidance, Eye Toggles, and Duplicate-Account Handling

"use client";

import Head from "next/head";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useEffect, useMemo, useState, useRef } from "react"; // 👈 added useRef
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { FiEye, FiEyeOff } from "react-icons/fi"; // 👈 NEW

// 🔒 Centralized password policy (match pages/auth.tsx)
const PASSWORD_RULES = {
  minLength: 8,
  requireUpper: true,
  requireLower: true,
  requireNumber: true,
  requireSymbol: true,
};

const hasUpper = (v: string) => /[A-Z]/.test(v);
const hasLower = (v: string) => /[a-z]/.test(v);
const hasNumber = (v: string) => /\d/.test(v);
const hasSymbol = (v: string) => /[^A-Za-z0-9]/.test(v);

const passwordMeetsRules = (v: string) => {
  if (v.length < PASSWORD_RULES.minLength) return false;
  if (PASSWORD_RULES.requireUpper && !hasUpper(v)) return false;
  if (PASSWORD_RULES.requireLower && !hasLower(v)) return false;
  if (PASSWORD_RULES.requireNumber && !hasNumber(v)) return false;
  if (PASSWORD_RULES.requireSymbol && !hasSymbol(v)) return false;
  return true;
};

export default function CartPage() {
  const { cartItems, removeFromCart, increaseQty, decreaseQty } = useCart();
  const { data: session } = useSession();

  const [isLoading, setIsLoading] = useState(false);

  // 🧮 Calculate cart total using salePrice
  const total = cartItems.reduce(
    (sum, item) => sum + item.salePrice * item.quantity,
    0
  );

  // 🧾 Shipping / Contact fields (guest-friendly, prefilled if logged in)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");

  // 🆕 Toggles
  const [createAccount, setCreateAccount] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // 🆕 Account fields (revealed only when createAccount is checked)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 👁️ Show/hide toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 🧯 Inline errors (per-field)
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 👤 If the email already has an account (409), show targeted guidance + reset link
  const [accountExistsEmail, setAccountExistsEmail] = useState<string | null>(
    null
  );

  // 🔔 NEW: Scroll to the account-exists notice when it appears
  const accountExistsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (accountExistsEmail) {
      accountExistsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [accountExistsEmail]);

  // 📥 Prefill from session (if available) but do not require login
  useEffect(() => {
    if (!session?.user) return;

    const u = session.user as any;
    setName((prev) => prev || u?.name || "");
    setEmail((prev) => prev || u?.email || "");
    setPhone((prev) => prev || u?.phone || "");

    const addr = u?.address || {};
    setLine1((prev) => prev || addr?.street || addr?.line1 || "");
    setLine2((prev) => prev || addr?.line2 || "");
    setCity((prev) => prev || addr?.city || "");
    setState((prev) => prev || addr?.state || "");
    setZip((prev) => prev || addr?.zip || addr?.postal_code || "");
    setCountry((prev) => prev || addr?.country || "US");
  }, [session]);

  /* ------------------------------ Validation ------------------------------ */
  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const required = (v: string) => v.trim().length > 0;

  const validateField = (key: string, value: string) => {
    let msg = "";
    switch (key) {
      case "name":
        if (!required(value)) msg = "Please enter your full name.";
        break;
      case "email":
        if (!required(value)) msg = "Email is required.";
        else if (!isEmail(value)) msg = "Please enter a valid email.";
        break;
      case "line1":
        if (!required(value)) msg = "Street address is required.";
        break;
      case "city":
        if (!required(value)) msg = "City is required.";
        break;
      case "state":
        if (!required(value)) msg = "State is required.";
        break;
      case "zip":
        if (!required(value)) msg = "ZIP / Postal Code is required.";
        break;
      case "country":
        if (!required(value)) msg = "Country is required.";
        break;
      case "password":
        if (createAccount) {
          if (!required(value)) msg = "Password is required.";
          else if (!passwordMeetsRules(value)) {
            msg =
              "Use at least 8 characters with upper & lower case letters, a number, and a symbol.";
          }
        }
        break;
      case "confirmPassword":
        if (createAccount) {
          if (!required(value)) msg = "Please confirm your password.";
          else if (value !== password) msg = "Passwords do not match.";
        }
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [key]: msg }));
    return msg === "";
  };

  // Validate on blur to show inline messages
  const onBlur =
    (key: string) =>
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      validateField(key, e.target.value);
    };

  // Overall form validity (disables button)
  const formValid = useMemo(() => {
    // basic requireds
    const basicsOk =
      cartItems.length > 0 &&
      required(name) &&
      isEmail(email) &&
      required(line1) &&
      required(city) &&
      required(state) &&
      required(zip) &&
      required(country);

    if (!basicsOk) return false;

    // account path checks
    if (createAccount) {
      if (!required(password) || !passwordMeetsRules(password)) return false;
      if (!required(confirmPassword) || confirmPassword !== password)
        return false;
    }
    return true;
  }, [
    cartItems.length,
    name,
    email,
    line1,
    city,
    state,
    zip,
    country,
    createAccount,
    password,
    confirmPassword,
  ]);

  const validateAll = () => {
    const keys = ["name", "email", "line1", "city", "state", "zip", "country"];
    if (createAccount) {
      keys.push("password", "confirmPassword");
    }
    let ok = true;
    for (const k of keys) {
      const v =
        {
          name,
          email,
          line1,
          city,
          state,
          zip,
          country,
          password,
          confirmPassword,
        }[k] ?? "";
      const thisOk = validateField(k, String(v));
      if (!thisOk) ok = false;
    }
    return ok;
  };

  /* ------------------------------ Submit ------------------------------ */
  const handleCheckout = async () => {
    // We rely on disabled button, but also guard here to populate errors if clicked
    if (!validateAll()) return;

    setIsLoading(true);
    setAccountExistsEmail(null);
    setErrors((prev) => ({ ...prev, submit: "" }));

    try {
      const payload: any = {
        items: cartItems.map((i) => ({
          id: i.id,
          slug: i.slug,
          name: i.name,
          quantity: i.quantity,
          price: i.salePrice, // charge salePrice
          image: i.image,
          size: i.size ?? null,
        })),
        customer: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: {
            line1: line1.trim(),
            line2: line2.trim(),
            city: city.trim(),
            state: state.trim(),
            postal_code: zip.trim(),
            country: country.trim(),
          },
        },
        notes: "", // keep for future order notes if needed
        paymentMethod: "stripe",
        // 🆕 Flags
        createAccount,
        marketingOptIn,
      };

      // Only include password when an account is requested and provided
      if (createAccount && password) {
        payload.password = password;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 👇 Handle duplicate account cleanly
      if (response.status === 409) {
        setIsLoading(false);
        setAccountExistsEmail(email.trim());
        return;
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        if (data?.url) {
          window.location.href = data.url;
        } else {
          console.error("❌ Raw response:", text);
          setErrors((prev) => ({
            ...prev,
            submit: "Checkout failed. Please try again.",
          }));
        }
      } catch (err) {
        console.error("❌ Could not parse response:", text);
        setErrors((prev) => ({
          ...prev,
          submit:
            "Checkout failed due to a server response error. Please try again.",
        }));
      }
    } catch (error) {
      console.error("❌ Checkout fetch error:", error);
      setErrors((prev) => ({
        ...prev,
        submit: "Network error during checkout. Please try again.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Shared input style
  const inputClass =
    "w-full rounded-lg px-3 py-2 bg-[var(--bg-page)] text-white placeholder-gray-400 border border-transparent focus:outline-none focus:ring-2 focus:ring-white/20";
  const errorClass = "text-xs text-red-400 mt-1";

  // Small helper for password checklist
  const Rule = ({
    ok,
    children,
  }: {
    ok: boolean;
    children: React.ReactNode;
  }) => (
    <li className={`text-xs ${ok ? "text-emerald-300" : "text-gray-300"}`}>
      {ok ? "✓" : "•"} {children}
    </li>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Your Cart | Classy Diamonds</title>
        <meta name="description" content="Cart, summary, and checkout." />
      </Head>

      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
        <Breadcrumbs />
      </div>

      {/* 📦 Main Layout */}
      <main className="flex flex-col lg:flex-row px-4 sm:px-6 pt-24 pb-32 max-w-7xl mx-auto w-full gap-10">
        {/* 🛒 Cart Items */}
        <section className="lg:w-[65%] flex flex-col gap-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Your Shopping Cart</h1>

          {cartItems.length > 0 ? (
            cartItems.map((item) => (
              <div
                key={`${item.id}::${item.size ?? ""}`}
                className="flex flex-col md:flex-row gap-4 items-center bg-[var(--bg-nav)] rounded-xl p-4 sm:p-6 shadow"
              >
                {/* 📸 Product Image */}
                <div className="w-full md:w-1/5 h-28 sm:h-32 overflow-hidden rounded-xl">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 📝 Product Info */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-lg sm:text-xl font-semibold text-[#cfd2d6]">
                    {item.name}
                  </h2>

                  {/* 🆕 Ring Size Badge */}
                  {item.size && (
                    <div className="mt-1">
                      <span className="inline-block text-xs px-2 py-1 rounded-full bg-[#364763] text-white">
                        Size: {item.size}
                      </span>
                    </div>
                  )}

                  {/* 💲 Price Display */}
                  {item.salePrice < item.originalPrice ? (
                    <div className="text-sm sm:text-base mt-2">
                      <span className="line-through text-gray-400 mr-2">
                        ${item.originalPrice.toFixed(2)}
                      </span>
                      <span className="text-green-400 font-semibold">
                        ${item.salePrice.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mt-2">
                      ${item.originalPrice.toFixed(2)}
                    </p>
                  )}

                  {/* 🧮 Subtotal if Quantity > 1 */}
                  {item.quantity > 1 && (
                    <p className="text-sm text-gray-400 mt-1">
                      Subtotal: ${(item.salePrice * item.quantity).toFixed(2)}
                    </p>
                  )}

                  {/* 🔢 Quantity Controls */}
                  <div className="mt-3 flex items-center justify-center md:justify-start gap-3">
                    <button
                      onClick={() => decreaseQty(item.id, item.size)}
                      className="w-7 h-7 rounded-full bg-gray-700 text-white text-lg hover:bg-gray-600"
                    >
                      −
                    </button>
                    <span className="text-base font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => increaseQty(item.id, item.size)}
                      className="w-7 h-7 rounded-full bg-gray-700 text-white text-lg hover:bg-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* ❌ Remove Button */}
                <button
                  onClick={() => removeFromCart(item.id, item.size)}
                  className="mt-4 md:mt-0 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="text-center text-lg text-gray-400">
              <p>Your cart is empty. Start shopping!</p>
              <Link
                href="/jewelry"
                className="mt-4 inline-block px-6 py-3 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-xl font-semibold hover:bg-gray-100 transition hover:scale-105"
              >
                Browse Jewelry
              </Link>
            </div>
          )}
        </section>

        {/* 📋 Order Summary + Shipping + Checkout */}
        <aside className="lg:w-[35%] bg-[#25304f] rounded-xl p-6 shadow flex flex-col gap-6 sticky top-24 h-fit">
          <h2 className="text-xl font-bold border-b border-[var(--bg-page)] pb-2">
            Order Summary
          </h2>

          <p className="text-sm">Items: {cartItems.length}</p>
          <p className="text-lg font-semibold">Total: ${total.toFixed(2)}</p>

          {/* 🛒 Continue Shopping */}
          <Link
            href="/jewelry"
            className="text-sm text-white underline hover:text-gray-300"
          >
            ← Continue Shopping
          </Link>

          {/* 🔔 Account exists notice (409) */}
          {accountExistsEmail && (
            <div
              ref={accountExistsRef} // 👈 NEW: attach ref for auto-scroll
              className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm"
            >
              <p className="mb-2">
                An account already exists for{" "}
                <span className="font-medium">{accountExistsEmail}</span>.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/account/forgot-password?email=${encodeURIComponent(
                    accountExistsEmail
                  )}`} // 👈 NEW: point to forgot-password
                  className="underline underline-offset-4 hover:opacity-90"
                >
                  Reset your password
                </Link>
                <span className="opacity-80">or</span>
                <Link
                  href={`/auth?mode=login&email=${encodeURIComponent(
                    accountExistsEmail
                  )}`}
                  className="underline underline-offset-4 hover:opacity-90"
                >
                  Log in instead
                </Link>
              </div>
            </div>
          )}

          {/* 🚚 Shipping Details (works for guests & logged-in users) */}
          <div className="mt-2">
            <h3 className="text-lg font-semibold mb-3">Shipping Details</h3>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={onBlur("name")}
                  placeholder="Full Name *"
                  className={inputClass}
                />
                {errors.name && <p className={errorClass}>{errors.name}</p>}
              </div>

              <div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={onBlur("email")}
                  placeholder="Email *"
                  type="email"
                  className={inputClass}
                />
                {errors.email && <p className={errorClass}>{errors.email}</p>}
              </div>

              <div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className={inputClass}
                />
              </div>

              <div>
                <input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  onBlur={onBlur("line1")}
                  placeholder="Street Address *"
                  className={inputClass}
                />
                {errors.line1 && <p className={errorClass}>{errors.line1}</p>}
              </div>

              <div>
                <input
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="Apt, Suite, etc. (optional)"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={onBlur("city")}
                    placeholder="City *"
                    className={inputClass}
                  />
                  {errors.city && <p className={errorClass}>{errors.city}</p>}
                </div>
                <div>
                  <input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    onBlur={onBlur("state")}
                    placeholder="State *"
                    className={inputClass}
                  />
                  {errors.state && <p className={errorClass}>{errors.state}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    onBlur={onBlur("zip")}
                    placeholder="ZIP / Postal Code *"
                    className={inputClass}
                  />
                  {errors.zip && <p className={errorClass}>{errors.zip}</p>}
                </div>
                <div>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    onBlur={onBlur("country")}
                    placeholder="Country *"
                    className={inputClass}
                  />
                  {errors.country && (
                    <p className={errorClass}>{errors.country}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 🆕 Engagement options */}
          <div className="space-y-3">
            {/* Create account checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createAccount}
                onChange={(e) => {
                  setCreateAccount(e.target.checked);
                  // Clear password fields + errors when toggling off
                  if (!e.target.checked) {
                    setPassword("");
                    setConfirmPassword("");
                    setErrors((prev) => {
                      const { password, confirmPassword, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm">
                <span className="font-semibold">Create an account</span>{" "}
                <span className="opacity-80">
                  (optional — faster checkout next time)
                </span>
              </span>
            </label>

            {/* Reveal password fields if checked */}
            {createAccount && (
              <div className="grid grid-cols-1 gap-3">
                {/* Password with eye toggle */}
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={onBlur("password")}
                    placeholder="Password *"
                    className={`${inputClass} pr-10`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                  {errors.password && (
                    <p className={errorClass}>{errors.password}</p>
                  )}
                </div>

                {/* Confirm with eye toggle */}
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={onBlur("confirmPassword")}
                    placeholder="Confirm Password *"
                    className={`${inputClass} pr-10`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={
                      showConfirm ? "Hide confirmation" : "Show confirmation"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
                  >
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                  {errors.confirmPassword && (
                    <p className={errorClass}>{errors.confirmPassword}</p>
                  )}
                </div>

                {/* 📋 Password rules (live) */}
                <ul className="mt-1 space-y-1">
                  <Rule ok={password.length >= PASSWORD_RULES.minLength}>
                    At least {PASSWORD_RULES.minLength} characters
                  </Rule>
                  <Rule ok={!PASSWORD_RULES.requireUpper || hasUpper(password)}>
                    Uppercase letter (A-Z)
                  </Rule>
                  <Rule ok={!PASSWORD_RULES.requireLower || hasLower(password)}>
                    Lowercase letter (a-z)
                  </Rule>
                  <Rule
                    ok={!PASSWORD_RULES.requireNumber || hasNumber(password)}
                  >
                    Number (0-9)
                  </Rule>
                  <Rule
                    ok={!PASSWORD_RULES.requireSymbol || hasSymbol(password)}
                  >
                    Symbol (!@#$…)
                  </Rule>
                </ul>
              </div>
            )}

            {/* Marketing opt-in */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span className="text-sm">
                <span className="font-semibold">
                  Email me deals and updates
                </span>{" "}
                <span className="opacity-80">(optional)</span>
              </span>
            </label>
          </div>

          {/* 🔒 Checkout Button */}
          <div className="mt-2">
            {/* Submit-level error (e.g., network/API issues) */}
            {errors.submit && (
              <p className="mb-3 text-sm text-red-300">{errors.submit}</p>
            )}

            <button
              onClick={handleCheckout}
              disabled={isLoading || !formValid}
              className="w-full px-6 py-3 bg-white text-[#1f2a44] rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 transition hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                "Processing..."
              ) : (
                <>
                  🔒 <span>Secure Checkout</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
