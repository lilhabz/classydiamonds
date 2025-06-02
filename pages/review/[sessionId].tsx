// 🚀 pages/review/[sessionId].tsx – Customer Review Form for Stripe Session 📝💎
// (Full file – do NOT remove any lines. This page lets the user rate “How easy was checkout?” and leave comments.)
// When submitted, it calls POST /api/reviews/create with { sessionId, rating, comments }.

"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { getSession } from "next-auth/react"; // Optional: if you want to restrict to logged-in users

export default function ReviewPage() {
  const router = useRouter();
  const { sessionId } = router.query as { sessionId?: string };

  // State for form inputs
  const [rating, setRating] = useState<number>(5); // default “5 – Very Easy”
  const [comments, setComments] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Optional: If you want to ensure only the buyer (logged in) can leave a review for their session:
  // useEffect(() => {
  //   getSession().then((session) => {
  //     if (!session) {
  //       router.replace("/auth"); // or show a “please log in” message
  //     }
  //   });
  // }, []);

  // Handle form submission
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sessionId) {
      setSubmitError("Missing session ID.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/reviews/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          rating,
          comments,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unknown error");
      }

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Review submission error:", err);
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // If we don’t yet have sessionId (page still loading), show nothing
  if (!sessionId) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Leave a Review – Classy Diamonds</title>
        <meta
          name="description"
          content="Tell us how your checkout experience was!"
        />
      </Head>

      <main className="min-h-screen bg-white flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6">
          {/* Page Heading */}
          <h1 className="text-3xl font-extrabold text-gray-900 text-center">
            Leave a Review for Your Purchase
          </h1>
          <p className="text-sm text-gray-600 text-center mb-4">
            Session ID:{" "}
            <code className="bg-gray-100 px-1 rounded">{sessionId}</code>
          </p>

          {/* If submission succeeded */}
          {submitSuccess ? (
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-green-800 mb-2">
                Thank you for your feedback! ✨
              </h2>
              <p className="text-green-700">
                We appreciate you taking the time to let us know how we did. You
                can close this page or{" "}
                <Link href="/jewelry" passHref>
                  <span className="text-indigo-600 font-medium underline cursor-pointer">
                    continue browsing
                  </span>
                </Link>
                .
              </p>
            </div>
          ) : (
            /* Review Form */
            <form
              onSubmit={handleSubmit}
              className="bg-gray-50 p-8 rounded-lg shadow-lg space-y-6"
            >
              {/* Rating Section */}
              <div>
                <label
                  htmlFor="rating"
                  className="block text-sm font-medium text-gray-700"
                >
                  How easy was the checkout process? 🤔
                </label>
                <select
                  id="rating"
                  name="rating"
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value={5}>5 – Very Easy</option>
                  <option value={4}>4 – Easy</option>
                  <option value={3}>3 – Neutral</option>
                  <option value={2}>2 – Difficult</option>
                  <option value={1}>1 – Very Difficult</option>
                </select>
                {/* Tailwind Explanation:
                    - mt-1: small top margin
                    - block w-full: full-width dropdown
                    - pl-3 pr-10 py-2: comfortable padding
                    - border-gray-300: light gray border
                    - focus:ring-indigo-500: indigo focus outline
                    - rounded-md: smooth corners
                */}
              </div>

              {/* Comments Section */}
              <div>
                <label
                  htmlFor="comments"
                  className="block text-sm font-medium text-gray-700"
                >
                  Any additional feedback? 💭
                </label>
                <textarea
                  id="comments"
                  name="comments"
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
                  placeholder="What did you like? How can we improve?"
                ></textarea>
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="text-red-600 text-sm">⚠️ {submitError}</div>
              )}

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                    isSubmitting
                      ? "bg-gray-400"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
