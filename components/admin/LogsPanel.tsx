// 📄 components/admin/LogsPanel.tsx
// 📝 Admin Logs panel for the unified Admin page.
// Minimal, safe reader with graceful fallback. No style changes to your theme.

"use client";

import { useEffect, useMemo, useState } from "react";

type LogItem = {
  _id?: string;
  action?: string;         // e.g., "shipped", "refunded"
  admin?: string;          // who
  orderId?: string;        // stripe session id or internal id
  notes?: string;
  createdAt?: string;
  // optional extras
  amount?: number;         // for refunds
  orderNumber?: number;
  tagColor?: string;       // if you store colored tags
};

export default function LogsPanel() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/logs"); // <-- expected to exist in your project
        const data = await res.json();
        const list: LogItem[] = Array.isArray(data.logs) ? data.logs : Array.isArray(data) ? data : [];
        setLogs(list);
      } catch (e) {
        // Fallback: leave logs empty; render friendly link to full page
        setLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return logs.filter((l) => {
      const s =
        (l.action || "") +
        " " +
        (l.admin || "") +
        " " +
        (l.orderId || "") +
        " " +
        (l.notes || "") +
        " " +
        (l.orderNumber ?? "");
      return !qq || s.toLowerCase().includes(qq);
    });
  }, [logs, q]);

  if (loading) return <p>Loading logs…</p>;

  if (logs.length === 0) {
    return (
      <div className="bg-[var(--bg-nav)] p-6 rounded-xl">
        <p className="mb-3">No logs found (or API unavailable).</p>
        <a href="/admin/logs" className="underline text-yellow-300 hover:text-yellow-200">
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
          return (
            <div key={l._id || ts + (l.orderId || "")} className="bg-[var(--bg-nav)] p-4 rounded-xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${chip}`}>
                  {l.action || "action"}
                </span>
                <span className="text-sm opacity-80">by {l.admin || "—"}</span>
                <span className="text-sm opacity-80">• {ts}</span>
                {l.orderNumber != null && (
                  <span className="text-sm opacity-80">• Order #{l.orderNumber}</span>
                )}
                {l.orderId && (
                  <span className="text-sm opacity-80">• ID {l.orderId.slice(-8)}</span>
                )}
              </div>
              {l.notes && <p className="mt-2 text-sm">{l.notes}</p>}
              {l.amount != null && (
                <p className="mt-1 text-sm opacity-80">Amount: ${l.amount.toFixed(2)}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
