// 📦 components/RefundDialog.tsx
import { useState } from "react";

export default function RefundDialog({
  orderId, // Mongo _id (string) – optional on detail page
  sessionId, // Stripe session id (string)
  maxCents,
  onClose,
  onSuccess,
}: {
  orderId?: string;
  sessionId: string;
  maxCents: number; // e.g., order.amount - order.refundedTotal (in cents)
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

  const submit = async () => {
    setErr(null);
    setLoading(true);
    try {
      const cents = amount ? Math.round(parseFloat(amount) * 100) : undefined;
      if (amount && (isNaN(Number(amount)) || (cents || 0) <= 0)) {
        throw new Error("Enter a valid amount.");
      }
      if (cents && cents > maxCents) {
        throw new Error("Amount exceeds refundable balance.");
      }

      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId, // may be undefined on detail page; backend will use sessionId
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
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold mb-2">Issue Refund</h3>
        <p className="text-sm text-gray-600 mb-3">
          Refund up to ${(maxCents / 100).toFixed(2)}. Leave amount blank for a
          full refund.
        </p>

        <label className="block text-sm font-medium">Amount (USD)</label>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2"
          placeholder="e.g. 49.99"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />

        <label className="mt-3 block text-sm font-medium">Reason</label>
        <select
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={reason}
          onChange={(e) => setReason(e.target.value as any)}
        >
          <option value="requested_by_customer">Requested by customer</option>
          <option value="duplicate">Duplicate</option>
          <option value="fraudulent">Fraudulent</option>
          <option value="general">Other / Internal</option>
        </select>

        <label className="mt-3 block text-sm font-medium">Internal note</label>
        <textarea
          className="mt-1 w-full rounded-lg border px-3 py-2"
          rows={3}
          placeholder="Optional note (e.g., return condition, restocking)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded-lg border px-4 py-2"
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
