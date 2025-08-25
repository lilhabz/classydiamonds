// ================================
// components/AdminOrderCard.tsx
// Reusable card for Orders/Shipped/Delivered/Archived with identical layout
// ================================
import { useRouter } from "next/router";   
import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import RefundDialog from "@/components/RefundDialog";

// ---- Helpers ----
const n = (v: any, d = 0): number => {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.\-]/g, "");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : d;
  }
  return d;
};

export type AdminOrder = {
  _id?: string;
  customerName?: string;
  customerEmail?: string;
  customerAddress?: string;
  shipping_address_string?: string;
  items?: Array<{
    name?: string;
    quantity?: number | string;
    image?: string;
    size?: string;
    unitPrice?: number | string;
    salePrice?: number | string;
    discountedPrice?: number | string;
    originalPrice?: number | string;
    price?: number | string;
  }>;
  amount?: number | string; // dollars
  refundedTotal?: number | string; // cents
  createdAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  archivedAt?: string;
  shipped?: boolean;
  delivered?: boolean;
  archived?: boolean;
  orderNumber?: number | null;
  stripeSessionId?: string;
  trackingNumber?: string;
  carrier?: string;
};

export type CardContext = "orders" | "shipped" | "delivered" | "archived";

export default function AdminOrderCard({
  order,
  context,
  onRefresh,
  adminName,
}: {
  order: AdminOrder;
  context: CardContext;
  onRefresh: () => void;
  adminName: string;
}) {
  const [trackingInput, setTrackingInput] = useState(
    order.trackingNumber || ""
  );
  const [carrier, setCarrier] = useState(order.carrier || "USPS");
  const [savingTracking, setSavingTracking] = useState(false);
  const [refundTarget, setRefundTarget] = useState<{
    sessionId: string;
    maxCents: number;
  } | null>(null);

  const totalCents = useMemo(
    () => Math.max(0, Math.round(n(order.amount) * 100)),
    [order.amount]
  );
  const refundedCents = useMemo(
    () => Math.max(0, Math.round(n(order.refundedTotal))),
    [order.refundedTotal]
  );
  const refundableCents = Math.max(0, totalCents - refundedCents);

  const openRefund = () => {
    const sessionId = String(order.stripeSessionId || "");
    if (!sessionId) return alert("❌ Missing Stripe session id on this order.");
    if (refundableCents <= 0)
      return alert("Nothing left to refund for this order.");
    setRefundTarget({ sessionId, maxCents: refundableCents });
  };

  const markShipped = async () => {
    if (!confirm(`📦 Mark order ${String(order.stripeSessionId).slice(-8)} as shipped?`)) return;
    const res = await fetch("/api/shipped", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.stripeSessionId, adminName }),
    });
    if (!res.ok) alert("❌ " + (await res.json()).error);
    onRefresh();
  };

  const saveTracking = async () => {
    if (!trackingInput.trim()) return alert("❌ Please enter a tracking number.");
    setSavingTracking(true);
    try {
      const res = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.stripeSessionId,
          trackingNumber: trackingInput.trim(),
          carrier,
          adminName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save tracking");
      alert(data.emailSent ? "✅ Tracking saved and email sent." : "✅ Tracking saved.");
      onRefresh();
    } catch (e: any) {
      alert("❌ " + (e?.message || "Failed"));
    } finally {
      setSavingTracking(false);
    }
  };

  const markDelivered = async () => {
    if (!confirm(`📬 Mark order ${String(order.stripeSessionId).slice(-8)} as delivered?`)) return;
    const res = await fetch("/api/delivered", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.stripeSessionId, adminName }),
    });
    const data = await res.json();
    if (!res.ok) return alert("❌ " + (data?.error || "Failed"));
    onRefresh();
  };

  const archive = async () => {
    if (!confirm(`🗂 Archive order ${String(order.stripeSessionId).slice(-8)}?`)) return;
    const res = await fetch("/api/admin/archived", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.stripeSessionId, adminName }),
    });
    const data = await res.json();
    if (!res.ok) return alert("❌ " + (data?.error || "Failed"));
    onRefresh();
  };

  const restore = async () => {
    if (!confirm(`♻️ Restore order ${String(order.stripeSessionId).slice(-8)}?`)) return;
    const res = await fetch("/api/admin/archived", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.stripeSessionId, restore: true, adminName }),
    });
    const data = await res.json();
    if (!res.ok) return alert("❌ " + (data?.error || "Failed"));
    onRefresh();
  };

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="bg-[var(--bg-nav)] p-6 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-1">
        {order.customerName || "Customer"} ({order.customerEmail || "—"})
      </h2>
      <p className="text-sm text-gray-300 mb-2">
        🔢 Order #: {order.orderNumber ?? "N/A"} | 🆔 {String(order.stripeSessionId || "").slice(-8) || "—"}
      </p>
      <p className="mb-2">📍 {order.customerAddress || order.shipping_address_string || "—"}</p>

      {/* Timeline stamp per context */}
      <p className="mb-4">
        {context === "orders" && order.createdAt && (
          <>🧾 Date: {new Date(order.createdAt).toLocaleString()}</>
        )}
        {context === "shipped" && order.shippedAt && (
          <>🧾 Shipped: {new Date(order.shippedAt).toLocaleString()}</>
        )}
        {context === "delivered" && order.deliveredAt && (
          <>🧾 Delivered: {new Date(order.deliveredAt).toLocaleString()}</>
        )}
        {context === "archived" && order.archivedAt && (
          <>🧾 Archived: {new Date(order.archivedAt).toLocaleString()}</>
        )}
      </p>

      {/* Tracking row (editable on shipped, read-only delivered) */}
      {(context === "shipped" || context === "delivered") && (
        <div className="mb-2">
          {order.trackingNumber ? (
            <p>
              <strong>Tracking:</strong> {order.trackingNumber}
              {order.carrier ? ` (${order.carrier})` : ""}
            </p>
          ) : context === "shipped" ? (
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="px-2 py-1 rounded bg-[#2e3a58] text-white"
              >
                <option value="USPS">USPS</option>
                <option value="UPS">UPS</option>
                <option value="FedEx">FedEx</option>
              </select>
              <input
                type="text"
                placeholder="Tracking #"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="px-2 py-1 rounded bg-[#2e3a58] text-white flex-1"
              />
              <button
                onClick={saveTracking}
                disabled={!trackingInput.trim() || savingTracking}
                className="bg-green-600 px-3 py-1 rounded text-sm disabled:opacity-50"
              >
                {savingTracking ? "Saving..." : "Save Tracking"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Items */}
      <div className="mt-4">
        <strong>Items:</strong>
        {items.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 mt-2">
            {items.map((it, i) => {
              const qty = Math.max(1, Math.round(n(it.quantity, 1)));
              const unit =
                n(it.unitPrice) ||
                n(it.salePrice) ||
                n(it.discountedPrice) ||
                n(it.originalPrice) ||
                n(it.price);
              const base = n(it.originalPrice) || n(it.price) || unit;
              const lineOrig = base * qty;
              const lineSale = unit * qty;
              const img = it.image && it.image.trim() !== "" ? it.image : "/products/gray-placeholder.jpg";
              return (
                <li key={i} className="flex items-center gap-2">
                  <Image src={img} alt={it.name || "Product image"} width={48} height={48} className="rounded object-cover" unoptimized />
                  <div className="flex flex-col">
                    <div className="font-normal">
                      {it.name || "Item"}
                      {it.size && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#364763] text-white align-middle">Size: {it.size}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-300 mt-0.5">Unit: ${unit.toFixed(2)}</div>
                  </div>
                  <span className="ml-2">
                    – x{qty} – {unit < base ? (
                      <>
                        <span className="line-through mr-1">${lineOrig.toFixed(2)}</span>
                        <span className="text-green-400">${lineSale.toFixed(2)}</span>
                      </>
                    ) : (
                      <span>${lineSale.toFixed(2)}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-red-300 mt-2">⚠️ No item data available.</p>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-lg font-semibold">
          💰 Total: ${n(order.amount).toFixed(2)}
          {refundedCents > 0 && (
            <span className="ml-2 text-sm text-gray-300">• Refunded ${(refundedCents / 100).toFixed(2)}</span>
          )}
        </span>
        <div className="space-x-2">
          <Link href={`/admin/order/${order.stripeSessionId}`}>
            <span className="bg-blue-600 px-4 py-2 rounded text-sm cursor-pointer">View 🔍</span>
          </Link>
          {context !== "delivered" && context !== "archived" && (
            <button
              onClick={openRefund}
              className="bg-indigo-600 px-4 py-2 rounded text-sm disabled:opacity-60"
              disabled={refundableCents <= 0 || !order.stripeSessionId}
              title={
                !order.stripeSessionId
                  ? "Missing Stripe session id"
                  : refundableCents <= 0
                  ? "Nothing left to refund"
                  : `Refund up to $${(refundableCents / 100).toFixed(2)}`
              }
            >
              Refund 💳
            </button>
          )}
          {context === "orders" && (
            <button onClick={markShipped} className="bg-green-600 px-4 py-2 rounded text-sm">Mark as Shipped 🚚</button>
          )}
          {context === "shipped" && (
            <button onClick={markDelivered} className="bg-blue-600 px-4 py-2 rounded text-sm">Delivered 📬</button>
          )}
          {context !== "archived" ? (
            <button onClick={archive} className="bg-yellow-600 px-4 py-2 rounded text-sm">Archive 🗂</button>
          ) : (
            <button onClick={restore} className="bg-yellow-600 px-4 py-2 rounded text-sm">Restore 🗂️</button>
          )}
        </div>
      </div>

      {/* Refund modal */}
      {refundTarget && (
        <RefundDialog
          orderId={refundTarget.sessionId}
          sessionId={refundTarget.sessionId}
          maxCents={refundTarget.maxCents}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => {
            setRefundTarget(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}