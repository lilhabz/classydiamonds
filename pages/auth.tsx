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
  const [passwordValid, setPasswordValid] = useState(false); // ✅ Show visual feedback
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedForm = { ...formData, [name]: value };
    setFormData(updatedForm);

    if (name === "password") {
      setPasswordValid(validatePassword(value));
    }
  };

  const validatePassword = (password: string) => {
    const regex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        alert("Passwords do not match");
        return;
      }

      if (!validatePassword(formData.password)) {
        alert(
          "Password must be at least 8 characters, include an uppercase letter, a number, and a special character."
        );
        return;
      }
    }

    if (isLogin) {
      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (res?.ok) router.push("/"); // ✅ Redirect
      else alert("Login failed");
    } else {
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
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Login to Classy Diamonds 💎" : "Create Your Account 💍"}
        </h2>

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
            <>
              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full p-2 rounded bg-white text-black"
                required
              />
              <p
                className={`text-xs font-medium mt-1 ${
                  passwordValid ? "text-green-400" : "text-red-400"
                }`}
              >
                Must be 8+ chars, include 1 capital letter, 1 number, and 1
                special character.
              </p>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-[#f7c59f] hover:bg-[#e6b78d] text-black py-2 rounded font-semibold"
          >
            {isLogin ? "Login" : "Create Account"}
          </button>
        </form>

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center mt-4 border border-white py-2 rounded hover:bg-white hover:text-black transition"
        >
          <FcGoogle className="mr-2" /> Continue with Google
        </button>

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
