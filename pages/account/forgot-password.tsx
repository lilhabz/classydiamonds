// pages/account/forgot-password.tsx
"use client";

import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const prefill = (router.query.email as string) || "";
  const [email, setEmail] = useState(prefill);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefill) setEmail(prefill);
  }, [prefill]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const r = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always treat as success (no enumeration)
      if (r.ok) setStatus("sent");
      else setStatus("sent");
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <Head>
        <title>Forgot Password | Classy Diamonds</title>
      </Head>

      <main className="bg-[var(--bg-page)] text-[var(--foreground)] min-h-screen">
        <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 pt-8">
          <Breadcrumbs
            customLabels={{
              account: "Account",
              "forgot-password": "Forgot Password",
            }}
          />
        </div>

        <div className="max-w-xl mx-auto px-4 pb-16">
          <h1 className="text-3xl font-serif mt-6 mb-2">
            Forgot your password?
          </h1>
          <p className="text-sm opacity-90 mb-6">
            Enter your account email and we’ll send you a link to reset your
            password.
          </p>

          {status === "sent" ? (
            <div className="rounded-xl bg-[var(--bg-nav)] border border-white/10 p-4">
              <p className="font-medium">
                If an account exists for{" "}
                <span className="underline">{email}</span>, a reset link has
                been sent.
              </p>
              <p className="text-sm opacity-80 mt-1">
                The link expires in 1 hour.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="bg-[var(--bg-nav)] border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <label className="block">
                <span className="text-sm">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="you@example.com"
                />
              </label>

              {error && <p className="text-red-300 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-xl bg-white text-[#1f2a44] py-2 font-medium hover:bg-white/90 transition"
              >
                {status === "sending" ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
