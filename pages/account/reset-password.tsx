// pages/account/reset-password.tsx
"use client";

import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = (router.query.token as string) || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (router.isReady && !token) {
      setError("Missing or invalid reset token. Please request a new link.");
    }
  }, [router.isReady, token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("Passwords do not match.");
      return;
    }
    setStatus("saving");
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.ok === false) {
        setStatus("error");
        setError(
          data?.error ||
            "Unable to reset password. Request a new link and try again."
        );
        return;
      }
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password | Classy Diamonds</title>
      </Head>

      <main className="bg-[var(--bg-page)] text-[var(--foreground)] min-h-screen">
        <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 pt-8">
          <Breadcrumbs
            customLabels={{
              account: "Account",
              "reset-password": "Reset Password",
            }}
          />
        </div>

        <div className="max-w-xl mx-auto px-4 pb-16">
          <h1 className="text-3xl font-serif mt-6 mb-2">Set a new password</h1>
          <p className="text-sm opacity-90 mb-6">
            Choose a strong, unique password you don’t use elsewhere.
          </p>

          {status === "done" ? (
            <div className="rounded-xl bg-[var(--bg-nav)] border border-white/10 p-4">
              <p className="font-medium">
                Your password was reset successfully.
              </p>
              <a
                href="/auth?mode=login&confirmed=1"
                className="inline-block mt-3 rounded-xl bg-white text-[#1f2a44] px-4 py-2 font-medium hover:bg-white/90 transition"
              >
                Continue to sign in
              </a>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="bg-[var(--bg-nav)] border border-white/10 rounded-2xl p-6 space-y-4"
            >
              {!token && (
                <p className="text-red-300 text-sm">
                  Missing or invalid token. Please{" "}
                  <a className="underline" href="/account/forgot-password">
                    request a new reset link
                  </a>
                  .
                </p>
              )}

              <div className="relative">
                <label className="block text-sm font-medium mb-1">
                  New Password
                </label>
                <input
                  type={show ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg-nav)] text-[var(--foreground)] border border-white/10 focus:outline-none"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-9 text-gray-300"
                >
                  {show ? <FiEyeOff /> : <FiEye />}
                </button>
                <p className="text-xs text-gray-400 mt-1">
                  Must be at least 8 characters.
                </p>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1">
                  Confirm Password
                </label>
                <input
                  type={show ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg-nav)] text-[var(--foreground)] border border-white/10 focus:outline-none"
                  autoComplete="new-password"
                  placeholder="Re-enter your new password"
                />
              </div>

              {error && <p className="text-red-300 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={status === "saving" || !token}
                className="w-full rounded-xl bg-white text-[#1f2a44] py-2 font-medium hover:bg-white/90 transition disabled:opacity-60"
              >
                {status === "saving" ? "Saving..." : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
