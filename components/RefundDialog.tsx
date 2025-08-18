// 📦 components/RefundDialog.tsx
import { useState } from "react";

export default function RefundDialog({
  orderId, // Mongo _id (string)
  sessionId, // Stripe session id (string)
  maxCents, // may be undefined or NaN; we'll guard it
  onClose,
  onSuccess,
}: {
  orderId: string;
  sessionId: string;
  maxCents?: number;
  onClose: () => void;
  onSuccess: (data: any) => void;
}) {
  const [amount, setAmount] = useState<string>(""); // dollars string
  const [reason, setReason] = useState<
    "requested_by_customer" | "duplicate" | "fraudulent" | "general"
  >("requested_by_customer");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Normalize/guard maxCents so UI never shows NaN
  const safeMaxCents = Number.isFinite(maxCents as number)
    ? Math.max(0, Math.floor(maxCents as number))
    : 0;

  const parseDollarsToCents = (val: string): number | undefined => {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    // remove $, commas, spaces, anything except digits and dot
    const cleaned = trimmed.replace(/[^0-9.]/g, "");
    const num = Number.parseFloat(cleaned);
    if (!Number.isFinite(num) || num <= 0) return NaN as any;
    return Math.round(num * 100);
  };

  const submit = async () => {
    setErr(null);
    setLoading(true);
    try {
      const cents = parseDollarsToCents(amount); // undefined => full refund
      if (
        amount &&
        (cents as any) !== undefined &&
        !Number.isFinite(cents as number)
      ) {
        throw new Error("Enter a valid amount.");
      }
      if (typeof cents === "number" && cents > safeMaxCents) {
        throw new Error("Amount exceeds refundable balance.");
      }

      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          sessionId,
          amount: cents, // undefined = full refund
          reason,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");
      onSuccess(data);
    } catch (e: any) {
      setErr(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl text-gray-900">
        <h3 className="text-lg font-semibold mb-2 text-gray-900">
          Issue Refund
        </h3>
        <p className="text-sm text-gray-700 mb-3">
          Refund up to ${(safeMaxCents / 100).toFixed(2)}. Leave amount blank
          for a full refund.
        </p>

        <label className="block text-sm font-medium text-gray-800">
          Amount (USD)
        </label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 text-gray-900"
          placeholder="e.g. 49.99"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />

        <label className="mt-3 block text-sm font-medium text-gray-800">
          Reason
        </label>
        <select
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          value={reason}
          onChange={(e) => setReason(e.target.value as any)}
        >
          <option value="requested_by_customer">Requested by customer</option>
          <option value="duplicate">Duplicate</option>
          <option value="fraudulent">Fraudulent</option>
          <option value="general">Other / Internal</option>
        </select>

        <label className="mt-3 block text-sm font-medium text-gray-800">
          Internal note
        </label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400"
          rows={3}
          placeholder="Optional note (e.g., return condition, restocking)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Processing..." : "Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
