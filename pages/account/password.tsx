// 📄 pages/account/password.tsx – Change Password Page 🛡️💎

import { useState } from "react";
import Head from "next/head";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function ChangePasswordPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage("All fields are required.");
      setIsError(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      setIsError(true);
      return;
    }

    if (newPassword.length < 8) {
      setMessage("New password must be at least 8 characters long.");
      setIsError(true);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/account/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: session?.user?.email,
          oldPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setMessage(data.error || "Something went wrong.");
        setIsError(true);
      } else {
        setMessage("✅ Password updated successfully!");
        setIsError(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setLoading(false);
      setMessage("❌ Failed to update password.");
      setIsError(true);
    }
  };

  return (
    <>
      <Head>
        <title>Change Password | Classy Diamonds</title>
      </Head>

      <main className="bg-[#1f2a36] text-white min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white/10 backdrop-blur p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">
            🔑 Change Your Password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 🔐 Old Password */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1">
                Current Password
              </label>
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#2a374f] text-white focus:outline-none"
              />
              <span
                className="absolute right-3 top-9 text-gray-400 cursor-pointer"
                onClick={() => setShowOld(!showOld)}
              >
                {showOld ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            {/* 🔒 New Password */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1">
                New Password
              </label>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#2a374f] text-white focus:outline-none"
              />
              <span
                className="absolute right-3 top-9 text-gray-400 cursor-pointer"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <FaEyeSlash /> : <FaEye />}
              </span>
              <p className="text-xs text-gray-400 mt-1">
                Must be at least 8 characters.
              </p>
            </div>

            {/* ✅ Confirm Password */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1">
                Confirm New Password
              </label>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[#2a374f] text-white focus:outline-none"
              />
              <span
                className="absolute right-3 top-9 text-gray-400 cursor-pointer"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>

            {message && (
              <div
                className={`text-sm mt-2 px-3 py-2 rounded ${
                  isError ? "bg-red-500 text-white" : "bg-green-500 text-white"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold transition"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => router.push("/account")}
              className="text-blue-400 text-sm hover:underline"
            >
              ← Back to Account
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
