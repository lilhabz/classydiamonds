// 📄 pages/account/password.tsx – Change Password Page 🛡️💎 (Improved UI + Breadcrumb)

import { useState } from "react";
import Head from "next/head";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ChangePasswordPage() {
  const { data: session } = useSession();

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
        headers: { "Content-Type": "application/json" },
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

      <main className="bg-[var(--bg-page)] text-[var(--foreground)] min-h-screen px-4 py-10">
        {/* 🧭 Breadcrumb */}
        <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mb-6 -mt-2">
          <Breadcrumbs
            customLabels={{ account: "Account", password: "Change Password" }}
          />
        </div>

        <div className="max-w-md mx-auto bg-[var(--foreground)]/10 backdrop-blur p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center text-[var(--foreground)]">
            🔑 Change Your Password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 🔐 Old Password */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
                Current Password
              </label>
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-nav)] text-[var(--foreground)] focus:outline-none"
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
              <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
                New Password
              </label>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-nav)] text-[var(--foreground)] focus:outline-none"
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
              <label className="block text-sm font-medium mb-1 text-[var(--foreground)]">
                Confirm New Password
              </label>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-nav)] text-[var(--foreground)] focus:outline-none"
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
                  isError
                    ? "bg-red-500 text-[var(--foreground)]"
                    : "bg-green-500 text-[var(--foreground)]"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--foreground)] hover:bg-white text-[var(--bg-nav)] py-2 rounded-lg font-semibold transition"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
