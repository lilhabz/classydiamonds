// pages/jewelry/index.tsx
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import type { Product } from "@/types/product";

export default function JewelryPage() {
  const [aud, setAud] = useState<string>("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams({ category: "jewelry", limit: "60" });
      if (aud) params.set("audience", aud);
      if (q) params.set("q", q);
      const res = await fetch("/api/products?" + params.toString());
      const data = await res.json();
      setItems(Array.isArray(data.products) ? data.products : []);
    })();
  }, [aud, q]);

  return (
    <div className="p-6 min-h-screen bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head><title>Jewelry | Classy Diamonds</title></Head>
      <h1 className="text-3xl font-serif font-bold mb-4">Jewelry</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={aud} onChange={(e) => setAud(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg-nav)]">
          <option value="">For: All</option>
          <option value="women,unisex">Women (incl. Unisex)</option>
          <option value="men,unisex">Men (incl. Unisex)</option>
          <option value="unisex">Unisex</option>
          <option value="kids">Kids</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search jewelry..."
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
        />
      </div>

      {items.length === 0 ? (
        <p>No items.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p._id} className="p-4 rounded bg-[var(--bg-nav)]">
              <h3 className="font-semibold mb-1">{p.title}</h3>
              <p className="text-xs opacity-80 mb-2">For: {(p.audience?.length ? p.audience.join(", ") : "unisex")}</p>
              <Link href={`/product/${p._id}`} className="text-sm underline">View</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
