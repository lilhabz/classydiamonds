// 📦 components/RefundDialog.tsx
import { useState } from "react";

export default function RefundDialog({
  orderId, // pass the Stripe session id here (see callers)
  sessionId, // same as above
  maxCents,
  onClose,
  onSuccess,
}: {
  orderId: string;
  sessionId: string;
  maxCents: number; // cents cap (total - refundedTotal)
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
      const parsed = amount.trim() === "" ? undefined : Number(amount);
      if (parsed !== undefined && (!Number.isFinite(parsed) || parsed <= 0)) {
        throw new Error("Enter a valid amount (e.g., 49.99).");
      }
      const cents = parsed !== undefined ? Math.round(parsed * 100) : undefined;
      if (typeof cents === "number" && cents > maxCents) {
        throw new Error("Amount exceeds refundable balance.");
      }

      // IMPORTANT: orderId is the Stripe session id in our flows (backend accepts either)
      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId, // stripeSessionId OK (backend will fallback to sessionId if orderId isn't ObjectId)
          sessionId, // explicit backup
          amount: cents, // cents; omit for full
          reason,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");
      alert(
        `✅ Refund successful: $${((data.refund?.amount || 0) / 100).toFixed(
          2
        )}\nRefund ID: ${data.refund?.refundId || "—"}`
      );
      onSuccess(data);
    } catch (e: any) {
      setErr(e.message || "Refund failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold mb-2 text-gray-900">
          Issue Refund
        </h3>
        <p className="text-sm text-gray-700 mb-3">
          <strong>Refund up to ${((maxCents || 0) / 100).toFixed(2)}</strong>.
          Leave amount blank for a full refund.
        </p>

        <label className="block text-sm font-medium text-gray-900">
          Amount (USD)
        </label>
        <input
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400"
          placeholder="e.g. 49.99"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />

        <label className="mt-3 block text-sm font-medium text-gray-900">
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

        <label className="mt-3 block text-sm font-medium text-gray-900">
          Internal note
        </label>
        <textarea
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
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
