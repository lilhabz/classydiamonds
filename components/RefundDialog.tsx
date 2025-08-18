// 📦 components/RefundDialog.tsx
import { useEffect, useMemo, useRef, useState } from "react";

type StripeReason =
  | "requested_by_customer"
  | "duplicate"
  | "fraudulent"
  | "general";

function parseUsdToCents(input: string): number | null {
  if (input == null) return null;
  const cleaned = String(input)
    .trim()
    .replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const value = parseFloat(cleaned);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  return cents >= 0 ? cents : null;
}

export default function RefundDialog({
  orderId, // Stripe session id (your backend accepts either)
  sessionId, // same
  maxCents,
  onClose,
  onSuccess,
}: {
  orderId: string;
  sessionId: string;
  maxCents: number; // refundable balance in cents
  onClose: () => void;
  onSuccess: (data: any) => void;
}) {
  const [amount, setAmount] = useState<string>(""); // dollars string
  const [fullRefund, setFullRefund] = useState<boolean>(false);
  const [reason, setReason] = useState<StripeReason>("requested_by_customer");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the amount input when opened
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !loading) submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside to close
  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const cents = useMemo(() => {
    if (fullRefund) return maxCents;
    const parsed = parseUsdToCents(amount);
    return parsed == null ? null : parsed;
  }, [amount, fullRefund, maxCents]);

  const amountError = useMemo(() => {
    if (fullRefund) return null;
    if (amount.trim() === "") return null; // allowed: blank = full (but only if fullRefund checked)
    const c = parseUsdToCents(amount);
    if (c == null) return "Enter a valid amount (e.g., 49.99).";
    if (c <= 0) return "Amount must be greater than $0.00.";
    if (c > maxCents) return "Amount exceeds refundable balance.";
    return null;
  }, [amount, fullRefund, maxCents]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (fullRefund) return maxCents > 0;
    if (amount.trim() === "") return false; // if not full refund, amount is required
    return !amountError && (cents ?? 0) > 0 && (cents ?? 0) <= maxCents;
  }, [loading, fullRefund, amount, amountError, cents, maxCents]);

  async function submit() {
    setErr(null);
    setLoading(true);
    try {
      // Validate again server-side style
      let payloadAmount: number | undefined = undefined;
      if (!fullRefund) {
        const parsed = parseUsdToCents(amount);
        if (parsed == null || parsed <= 0) {
          throw new Error("Enter a valid amount (e.g., 49.99).");
        }
        if (parsed > maxCents) {
          throw new Error("Amount exceeds refundable balance.");
        }
        payloadAmount = parsed;
      }

      const res = await fetch("/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId, // stripeSessionId OK
          sessionId, // explicit backup
          amount: payloadAmount, // cents; omit for full
          reason, // server will map/ignore "general" as needed
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refund failed");

      const refundedCents =
        typeof data?.refund?.amount === "number"
          ? data.refund.amount
          : payloadAmount ?? maxCents;

      alert(
        `✅ Refund successful: $${(refundedCents / 100).toFixed(
          2
        )}\nRefund ID: ${data?.refund?.refundId || "—"}`
      );
      onSuccess(data);
    } catch (e: any) {
      setErr(e?.message || "Refund failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={onOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Issue refund dialog"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2 text-gray-900">
          Issue Refund
        </h3>

        <p className="text-sm text-gray-700 mb-3">
          <strong>Refund up to ${((maxCents || 0) / 100).toFixed(2)}</strong>.
        </p>

        {/* Full refund toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-900 mb-2 select-none">
          <input
            type="checkbox"
            checked={fullRefund}
            onChange={(e) => {
              setFullRefund(e.target.checked);
              if (e.target.checked) setAmount("");
            }}
          />
          Full refund (entire remaining balance)
        </label>

        {/* Amount input (disabled if full refund) */}
        <label className="block text-sm font-medium text-gray-900">
          Amount (USD)
        </label>
        <input
          ref={inputRef}
          className={`mt-1 w-full rounded-lg border px-3 py-2 text-gray-900 placeholder-gray-400 ${
            amountError ? "border-red-400" : "border-gray-300"
          } ${fullRefund ? "bg-gray-100 cursor-not-allowed" : ""}`}
          placeholder="e.g. 49.99"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          disabled={fullRefund}
        />
        {amountError && (
          <p className="mt-1 text-xs text-red-600">{amountError}</p>
        )}

        {/* Reason */}
        <label className="mt-3 block text-sm font-medium text-gray-900">
          Reason
        </label>
        <select
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          value={reason}
          onChange={(e) => setReason(e.target.value as StripeReason)}
        >
          <option value="requested_by_customer">Requested by customer</option>
          <option value="duplicate">Duplicate</option>
          <option value="fraudulent">Fraudulent</option>
          <option value="general">Other / Internal</option>
        </select>

        {/* Note */}
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

        {/* Inline status */}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        {!err && (
          <p className="mt-3 text-xs text-gray-600">
            {fullRefund
              ? `Will refund $${(maxCents / 100).toFixed(2)}.`
              : cents != null && cents > 0
              ? `Will refund $${(cents / 100).toFixed(2)} of $${(
                  maxCents / 100
                ).toFixed(2)}.`
              : `Enter an amount or choose full refund.`}
          </p>
        )}

        {/* Actions */}
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
            disabled={!canSubmit}
            title={
              !canSubmit ? "Fill a valid amount or choose full refund" : ""
            }
          >
            {loading ? "Processing..." : "Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}
