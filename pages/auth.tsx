// 📄 pages/auth.tsx - Login + Signup with Email Confirmation Flow + Auto-Polling 💎

"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff } from "react-icons/fi";
import zxcvbn from "zxcvbn"; // 📊 Strength meter library

export default function AuthPage() {
  const router = useRouter();
  const { confirmed, needsConfirmation, email: queryEmail } = router.query;

  // 🔄 Toggle login/signup
  const [isLogin, setIsLogin] = useState(true);
  const [showCheckEmailBanner, setShowCheckEmailBanner] = useState(false);
  const [showConfirmedBanner, setShowConfirmedBanner] = useState(false);

  // 📝 Form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // 👀 Show/hide passwords
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // 🎯 Password criteria
  const hasLength = formData.password.length >= 8;
  const hasUpper = /[A-Z]/.test(formData.password);
  const hasLower = /[a-z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/\?]/.test(
    formData.password
  );
  const passwordValid =
    hasLength && hasUpper && hasLower && hasNumber && hasSymbol;

  // 📊 Strength meter
  const [strengthScore, setStrengthScore] = useState(0);
  useEffect(
    () => setStrengthScore(zxcvbn(formData.password).score),
    [formData.password]
  );

  // Polling ref
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Handle query flags and polling
  useEffect(() => {
    if (needsConfirmation === "true" && typeof queryEmail === "string") {
      setShowCheckEmailBanner(true);
      setIsLogin(false);
      setFormData((prev) => ({ ...prev, email: queryEmail }));

      // Start polling confirmation status
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/confirm-status?email=${encodeURIComponent(queryEmail)}`
          );
          const data = await res.json();
          if (data.confirmed) {
            clearInterval(pollRef.current!);
            setShowCheckEmailBanner(false);
            setShowConfirmedBanner(true);
            setIsLogin(true);
          }
        } catch {
          // ignore errors during polling
        }
      }, 5000);
    }

    if (confirmed === "true" && typeof queryEmail === "string") {
      setShowConfirmedBanner(true);
      setIsLogin(true);
      setFormData((prev) => ({ ...prev, email: queryEmail }));
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [needsConfirmation, confirmed, queryEmail]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match");
        return;
      }
      if (!passwordValid) {
        alert("Password does not meet requirements.");
        return;
      }
    }

    if (isLogin) {
      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });
      if (res?.ok) router.push("/");
      else alert("Login failed");
    } else {
      try {
        const response = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          // Show banner and keep on signup page for polling
          setShowCheckEmailBanner(true);
          setIsLogin(false);
          return;
        }
        const result = await response.json();
        alert(result.error || "Signup failed");
      } catch {
        alert("An error occurred during signup");
      }
    }
  };

  return (
    <div
      className="
        bg-[var(--bg-page)] text-[var(--foreground)] min-h-screen flex justify-center pt-10 px-4
        /* ✅ Updated: removed items-center to stop centering vertically, added pt-20 to move form closer to navbar */
      "
    >
      <div className="bg-[var(--bg-nav)] p-8 sm:p-10 rounded-2xl shadow-xl w-full max-w-md">
        {/* Title */}
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isLogin ? "Login to Classy Diamonds 💎" : "Create Your Account 💍"}
        </h2>

        {/* Banners */}
        {showCheckEmailBanner && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
            Check your email to confirm your address (opens a new tab to log
            in).
          </div>
        )}
        {showConfirmedBanner && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">
            Your email has been confirmed! You can now log in.
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              name="name"
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              required
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-3 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
            required
          />
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              className="w-full p-3 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          {!isLogin && (
            <>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl bg-[#1f2a36] text-white placeholder-gray-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {formData.confirmPassword && (
                <p
                  className={`text-xs font-medium mt-1 ${
                    formData.password === formData.confirmPassword
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formData.password === formData.confirmPassword
                    ? "✅ Passwords match"
                    : "❌ Passwords do not match"}
                </p>
              )}
            </>
          )}
          {!isLogin && (passwordFocused || formData.password) && (
            <ul className="text-xs space-y-1 mt-1">
              <li className={hasLength ? "text-green-400" : "text-red-400"}>
                {hasLength ? "✅" : "❌"} At least 8 characters
              </li>
              <li className={hasUpper ? "text-green-400" : "text-red-400"}>
                {hasUpper ? "✅" : "❌"} One uppercase letter
              </li>
              <li className={hasLower ? "text-green-400" : "text-red-400"}>
                {hasLower ? "✅" : "❌"} One lowercase letter
              </li>
              <li className={hasNumber ? "text-green-400" : "text-red-400"}>
                {hasNumber ? "✅" : "❌"} One number
              </li>
              <li className={hasSymbol ? "text-green-400" : "text-red-400"}>
                {hasSymbol ? "✅" : "❌"} One special character
              </li>
            </ul>
          )}
          {!isLogin && formData.password && (
            <div className="mt-2">
              <progress
                className="w-full h-2 rounded-xl overflow-hidden"
                value={strengthScore}
                max={4}
              />
              <p className="text-xs mt-1">
                {["Very Weak", "Weak", "Fair", "Good", "Strong"][strengthScore]}
              </p>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-[var(--foreground)] hover:bg-gray-100 text-[var(--bg-nav)] py-3 rounded-xl font-semibold transition hover:scale-105"
          >
            {isLogin ? "Login" : "Create Account"}
          </button>
        </form>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center mt-4 bg-[var(--foreground)] hover:bg-gray-100 text-[var(--bg-nav)] font-semibold py-3 rounded-xl transition hover:scale-105"
        >
          <FcGoogle className="mr-2 text-xl" /> Continue with Google
        </button>
        <p className="mt-6 text-center text-sm">
          {isLogin ? (
            <>
              Don’t have an account?{" "}
              <button
                onClick={() => setIsLogin(false)}
                className="underline text-[#f7c59f]"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setIsLogin(true)}
                className="underline text-[#f7c59f]"
              >
                Login
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
