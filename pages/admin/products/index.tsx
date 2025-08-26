// pages/admin/products/index.tsx
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import type { Product } from "@/types/product";

export default function AdminProductsList() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [aud, setAud] = useState<string>("");
  const [cat, setCat] = useState<string>("");

  useEffect(() => {
    if (!session?.user?.isAdmin) return;
    load();
  }, [session, q, aud, cat]);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (aud) params.set("audience", aud);
    if (cat) params.set("category", cat);
    const res = await fetch("/api/admin/products?" + params.toString());
    const data = await res.json();
    setProducts(Array.isArray(data.products) ? data.products : []);
  }

  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin) return <div className="p-6 text-red-300">❌ Unauthorized</div>;

  return (
    <div className="p-6 min-h-screen bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head><title>Products | Admin</title></Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 -mt-2 mb-6">
        <Breadcrumbs />
      </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-serif font-bold">🛠 Products</h1>
        <Link href="/admin/products/new" className="bg-blue-600 px-4 py-2 rounded">+ Add Product</Link>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title/desc/tags…"
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
        />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg-nav)]">
          <option value="">All Categories</option>
          <option value="jewelry">Jewelry</option>
          <option value="watch">Watch</option>
        </select>
        <select value={aud} onChange={(e) => setAud(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg-nav)]">
          <option value="">For: All</option>
          <option value="women,unisex">Women (incl. Unisex)</option>
          <option value="men,unisex">Men (incl. Unisex)</option>
          <option value="unisex">Unisex</option>
          <option value="kids">Kids</option>
        </select>
      </div>

      {products.length === 0 ? (
        <p>No products.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p._id} className="p-4 rounded bg-[var(--bg-nav)]">
              <h3 className="font-semibold mb-1">{p.title}</h3>
              <p className="text-xs opacity-80 mb-2">
                {p.category}{p.subCategory ? ` • ${p.subCategory}` : ""} • For: {(p.audience && p.audience.length ? p.audience.join(", ") : "unisex")}
              </p>
              <p className="text-sm mb-3">{p.description?.slice(0, 100) || ""}</p>
              <div className="flex gap-2">
                <Link href={`/admin/products/${p._id}`} className="px-3 py-1 rounded bg-blue-600 text-sm">Edit</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
