// 📄 pages/auth.tsx - Login + Signup Combined Page 💎

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { FcGoogle } from "react-icons/fc";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true); // 🔄 Toggle between login/signup
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
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
      // Placeholder signup logic — 🔐 Replace with actual user creation
      try {
        const response = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const result = await response.json();

        if (response.ok) {
          alert("Account created successfully. You can now log in.");
          setIsLogin(true);
        } else {
          alert(result.error || "Signup failed");
        }
      } catch (error) {
        alert("An error occurred during signup");
      }
    }
  };

  return (
    <div className="bg-[#1f2a36] text-white min-h-screen flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur p-8 rounded-2xl shadow-xl w-full max-w-md">
        {/* 🧾 Header Title */}
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Login to Classy Diamonds 💎" : "Create Your Account 💍"}
        </h2>

        {/* 🔐 Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              name="name"
              type="text"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 rounded bg-white text-black"
              required
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white text-black"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 rounded bg-white text-black"
            required
          />
          {!isLogin && (
            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 rounded bg-white text-black"
              required
            />
          )}

          <button
            type="submit"
            className="w-full bg-[#f7c59f] hover:bg-[#e6b78d] text-black py-2 rounded font-semibold"
          >
            {isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        {/* 🔘 Google Login Option */}
        <button
          onClick={() => signIn("google")}
          className="w-full flex items-center justify-center mt-4 border border-white py-2 rounded hover:bg-white hover:text-black transition"
        >
          <FcGoogle className="mr-2" /> Continue with Google
        </button>

        {/* 🔁 Toggle Login/Signup */}
        <p className="mt-6 text-center text-sm">
          {isLogin ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
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
                type="button"
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
