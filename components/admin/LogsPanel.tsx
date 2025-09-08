// 📄 components/admin/LogsPanel.tsx
// 📝 Admin Logs panel (normalized) with on-demand Order details on expand.
// - Normalizes API keys: performedBy→admin, timestamp→createdAt, note→notes.
// - Fetches order details on expand with robust endpoint fallback.
// - Strict TypeScript: avoids TS2881 ("never nullish") & TS2345 ("arg type") issues.

"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

/* ----------------------------- Types & Helpers ----------------------------- */
type LogItem = {
  _id?: string;
  action?: string; // e.g., "shipped", "refunded", "archived"
  admin?: string; // normalized: performedBy → admin
  orderId?: string; // internal id or Stripe session id
  notes?: string; // normalized: note → notes
  createdAt?: string; // normalized: timestamp → createdAt
  // optional extras
  amount?: number;
  orderNumber?: number;
  tagColor?: string;
};

type ApiLog = Partial<LogItem> & {
  performedBy?: string;
  timestamp?: string;
  note?: string;
  order_id?: string;
  order?: { id?: string; number?: number };
};

// Coalesce: null/undefined aware fallback, avoids `??` complaints under strict TS
function coalesce<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

type OrderItem = {
  name?: string;
  sku?: string | number;
  quantity?: number;
  price?: number;
};

type OrderSummary = {
  _id?: string;
  orderId?: string;
  orderNumber?: number;
  customerName?: string;
  customerEmail?: string;
  amount?: number;
  currency?: string;
  shipped?: boolean;
  archived?: boolean;
  createdAt?: string;
  items?: OrderItem[];
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  } | null;
};

const fmtMoney = (amount?: number, currency = "USD") =>
  typeof amount === "number"
    ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
        amount > 999 ? amount / 100 : amount
      )
    : "—";

const sliceId = (s?: string) => (s ? s.slice(-8) : "—");

/* ------------------------------ Normalization ------------------------------ */
function normalizeLogs(input: unknown): LogItem[] {
  const arr: ApiLog[] = Array.isArray((input as any)?.logs)
    ? (input as any).logs
    : Array.isArray(input)
    ? (input as any)
    : [];

  return arr.map((r): LogItem => {
    const orderId = coalesce<string>(
      (r as any).orderId,
      r.order_id,
      r.order?.id,
      typeof (r as any).stripeSessionId === "string"
        ? (r as any).stripeSessionId
        : undefined
    );

    const orderNumber = coalesce<number>(
      (r as any).orderNumber as number | undefined,
      r.order?.number as number | undefined,
      typeof (r as any).order_no === "number"
        ? ((r as any).order_no as number)
        : undefined
    );

    const adminVal = coalesce<string>(r.admin, r.performedBy, (r as any).by);
    const notesVal = coalesce<string>(r.notes, r.note);
    const createdAtVal = coalesce<string>(r.createdAt, r.timestamp);

    return {
      _id: (r as any)._id as string | undefined,
      action: r.action,
      admin: adminVal === undefined ? "—" : adminVal,
      orderId,
      orderNumber,
      notes: notesVal,
      createdAt: createdAtVal,
      amount: r.amount,
      tagColor: (r as any).tagColor,
    };
  });
}

/* ------------------------------ Data fetching ------------------------------ */
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Tries several endpoints to retrieve a single order by id or number (guarded). */
async function fetchOrderByAny(
  id?: string,
  orderNumber?: number
): Promise<OrderSummary | null> {
  const attempts: string[] = [];

  if (typeof id === "string" && id.length > 0) {
    const sid = id;
    attempts.push(
      `/api/admin/order?id=${encodeURIComponent(sid)}`,
      `/api/admin/orders?id=${encodeURIComponent(sid)}`,
      `/api/orders?id=${encodeURIComponent(sid)}`
    );
  }

  if (typeof orderNumber === "number") {
    const on = String(orderNumber);
    attempts.push(
      `/api/admin/orders?orderNumber=${encodeURIComponent(on)}`,
      `/api/orders?orderNumber=${encodeURIComponent(on)}`
    );
  }

  for (const url of attempts) {
    const data = await fetchJson<any>(url);
    if (!data) continue;

    const o =
      data.order ??
      (Array.isArray(data.orders) ? data.orders[0] : null) ??
      (Array.isArray(data) ? data[0] : data);

    if (!o) continue;

    const items: OrderItem[] =
      o.items?.map((it: any) => ({
        name: it.name ?? it.title,
        sku: it.sku ?? it.skuNumber ?? it.id,
        quantity: it.quantity ?? it.qty ?? 1,
        price: it.price ?? it.unitPrice ?? it.amount_unit,
      })) ?? [];

    const addr = o.address ?? o.shippingAddress ?? o.customer?.address ?? null;

    const amount =
      typeof o.amount_total === "number"
        ? o.amount_total
        : typeof o.amount === "number"
        ? o.amount
        : typeof o.total === "number"
        ? o.total
        : undefined;

    const currency =
      o.currency ?? o.amount_currency ?? o.total_currency ?? "USD";

    // ✅ Avoid `??` with a guaranteed boolean inside the chain.
    const shippedVal =
      typeof o.shipped === "boolean"
        ? o.shipped
        : typeof o.status === "string" && o.status.toLowerCase() === "shipped"
        ? true
        : typeof o.fulfillment?.shipped === "boolean"
        ? o.fulfillment.shipped
        : false;

    const idVal = (o._id ?? o.id) as string | undefined;
    const orderNumVal = (o.orderNumber ?? o.number ?? o.order_no) as
      | number
      | undefined;
    const createdAtVal = (o.createdAt ?? o.created ?? o.created_at) as
      | string
      | undefined;

    return {
      _id: idVal,
      orderId: idVal,
      orderNumber: orderNumVal,
      customerName: o.customerName ?? o.name ?? o.customer?.name,
      customerEmail: o.customerEmail ?? o.email ?? o.customer?.email,
      amount,
      currency,
      shipped: shippedVal,
      archived: Boolean(o.archived),
      createdAt: createdAtVal,
      items,
      address: addr,
    };
  }

  return null;
}

/* ---------------------------------- UI ---------------------------------- */
export default function LogsPanel() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // expanded row states
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [orderByLogId, setOrderByLogId] = useState<
    Record<string, OrderSummary | null>
  >({});
  const [orderLoading, setOrderLoading] = useState<Record<string, boolean>>({});
  const [orderError, setOrderError] = useState<Record<string, string | null>>(
    {}
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/logs");
        const raw = await res.json();
        const list = normalizeLogs(raw);
        list.sort((a, b) => {
          const ta = a.createdAt ? +new Date(a.createdAt) : 0;
          const tb = b.createdAt ? +new Date(b.createdAt) : 0;
          return tb - ta;
        });
        setLogs(list);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return logs.filter((l) => {
      const orderNumStr =
        typeof l.orderNumber === "number" ? String(l.orderNumber) : "";
      const s =
        (l.action || "") +
        " " +
        (l.admin || "") +
        " " +
        (l.orderId || "") +
        " " +
        (l.notes || "") +
        " " +
        orderNumStr;
      return !qq || s.toLowerCase().includes(qq);
    });
  }, [logs, q]);

  const onToggle = async (log: LogItem) => {
    const key = log._id || `${log.createdAt}-${log.orderId}-${log.action}`;
    const isOpen = !!expanded[key];

    setExpanded((prev) => ({ ...prev, [key]: !isOpen }));

    // If opening and we have an orderId or orderNumber but not fetched yet, fetch it
    const hasOrderRef =
      (typeof log.orderId === "string" && log.orderId.length > 0) ||
      typeof log.orderNumber === "number";

    if (!isOpen && hasOrderRef && orderByLogId[key] === undefined) {
      setOrderLoading((prev) => ({ ...prev, [key]: true }));
      setOrderError((prev) => ({ ...prev, [key]: null }));
      try {
        const order = await fetchOrderByAny(log.orderId, log.orderNumber);
        setOrderByLogId((prev) => ({ ...prev, [key]: order }));
        if (!order) {
          setOrderError((prev) => ({
            ...prev,
            [key]:
              "Order not found via known endpoints. Open the Orders page to locate it manually.",
          }));
        }
      } catch (e: any) {
        setOrderError((prev) => ({
          ...prev,
          [key]: e?.message || "Failed to load order.",
        }));
        setOrderByLogId((prev) => ({ ...prev, [key]: null }));
      } finally {
        setOrderLoading((prev) => ({ ...prev, [key]: false }));
      }
    }
  };

  if (loading) return <p>Loading logs…</p>;

  if (logs.length === 0) {
    return (
      <div className="bg-[var(--bg-nav)] p-6 rounded-xl">
        <p className="mb-3">No logs found (or API unavailable).</p>
        <a
          href="/admin/logs"
          className="underline text-yellow-300 hover:text-yellow-200"
        >
          Open the classic Logs page ↗
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          className="px-4 py-2 rounded bg-[var(--bg-nav)] text-white flex-1"
          placeholder="Filter logs (action, admin, order, notes)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((l) => {
          const ts = l.createdAt ? new Date(l.createdAt).toLocaleString() : "—";
          const chip =
            l.action?.toLowerCase() === "shipped"
              ? "bg-green-700"
              : l.action?.toLowerCase() === "refunded"
              ? "bg-indigo-700"
              : l.action?.toLowerCase() === "archived"
              ? "bg-yellow-700"
              : "bg-[#364763]";

          const key = l._id || `${l.createdAt}-${l.orderId}-${l.action}`;
          const isOpen = !!expanded[key];

          return (
            <div key={key} className="bg-[var(--bg-nav)] p-4 rounded-xl">
              {/* Row header */}
              <button
                onClick={() => onToggle(l)}
                className="w-full text-left"
                aria-expanded={isOpen}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${chip}`}>
                    {l.action || "action"}
                  </span>
                  <span className="text-sm opacity-80">
                    by {l.admin || "—"}
                  </span>
                  <span className="text-sm opacity-80">• {ts}</span>
                  {typeof l.orderNumber === "number" && (
                    <span className="text-sm opacity-80">
                      • Order #{l.orderNumber}
                    </span>
                  )}
                  {l.orderId && (
                    <span className="text-sm opacity-80">
                      • ID {sliceId(l.orderId)}
                    </span>
                  )}
                </div>
                {l.notes && <p className="mt-2 text-sm">{l.notes}</p>}
                {typeof l.amount === "number" && (
                  <p className="mt-1 text-sm opacity-80">
                    Amount: {fmtMoney(l.amount)}
                  </p>
                )}
                <div className="mt-2 text-xs opacity-70 underline">
                  Toggle details
                </div>
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div className="mt-3 rounded-lg bg-[#25304f] p-3">
                  {orderLoading[key] ? (
                    <p className="text-sm opacity-80">Loading order details…</p>
                  ) : orderError[key] ? (
                    <div className="text-sm">
                      <p className="opacity-90">{orderError[key]}</p>
                      <a
                        href="/admin/orders"
                        className="underline text-yellow-300 hover:text-yellow-200"
                      >
                        Open Orders ↗
                      </a>
                    </div>
                  ) : orderByLogId[key] ? (
                    <OrderDetails order={orderByLogId[key]!} />
                  ) : (
                    <p className="text-sm opacity-80">
                      No order id/number on this log. Nothing to display.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------- Details subview ----------------------------- */
function OrderDetails({ order }: { order: OrderSummary }) {
  const {
    _id,
    orderId,
    orderNumber,
    customerName,
    customerEmail,
    amount,
    currency,
    shipped,
    archived,
    createdAt,
    items,
    address,
  } = order;

  return (
    <div className="text-sm space-y-2">
      <div className="flex flex-wrap gap-3">
        {typeof orderNumber === "number" && <Badge>Order #{orderNumber}</Badge>}
        {typeof _id === "string" && <Badge>Id {sliceId(_id)}</Badge>}
        {typeof orderId === "string" && orderId !== _id && (
          <Badge>Ref {sliceId(orderId)}</Badge>
        )}
        {shipped && <Badge className="bg-green-700">Shipped</Badge>}
        {archived && <Badge className="bg-yellow-700">Archived</Badge>}
      </div>

      <div className="opacity-80">
        <div>
          Created: {createdAt ? new Date(createdAt).toLocaleString() : "—"}
        </div>
        <div>Total: {fmtMoney(amount, currency)}</div>
        <div>
          Customer: {customerName || "—"}{" "}
          {customerEmail ? (
            <a className="underline" href={`mailto:${customerEmail}`}>
              {customerEmail}
            </a>
          ) : (
            ""
          )}
        </div>
        {address && (
          <div className="opacity-80">
            Ship to:{" "}
            {[
              address.line1,
              address.line2,
              address.city,
              address.state,
              address.postal_code,
              address.country,
            ]
              .filter(Boolean)
              .join(", ") || "—"}
          </div>
        )}
      </div>

      {items && items.length > 0 && (
        <div className="mt-2">
          <div className="opacity-80 mb-1">Items</div>
          <div className="rounded-md overflow-hidden border border-[#364763]">
            <table className="w-full text-xs">
              <thead className="bg-[#1f2a44]">
                <tr>
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Qty</th>
                  <th className="text-left p-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="odd:bg-[#202a44] even:bg-[#25304f]">
                    <td className="p-2">{it.sku ?? "—"}</td>
                    <td className="p-2">{it.name ?? "—"}</td>
                    <td className="p-2">{it.quantity ?? 1}</td>
                    <td className="p-2">{fmtMoney(it.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="pt-1">
        <a
          href="/admin/orders"
          className="underline text-yellow-300 hover:text-yellow-200"
        >
          Open in Orders ↗
        </a>
      </div>
    </div>
  );
}

function Badge({
  children,
  className = "bg-[#364763]",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full ${className}`}
    >
      {children}
    </span>
  );
}
