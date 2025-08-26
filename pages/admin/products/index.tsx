// pages/admin/products/index.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import type { Product } from "@/types/product";

type SortKey = "createdAt" | "title" | "unitPrice";
type SortDir = "asc" | "desc";

const toNum = (v: unknown, d = 0) => {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : d;
  }
  return d;
};

export default function AdminProductsList() {
  const { data: session, status } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [aud, setAud] = useState<string>("");
  const [cat, setCat] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

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
    setPage(1);
  }

  function sortProducts(list: Product[]): Product[] {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "title") {
        return a.title.localeCompare(b.title) * dir;
      }
      if (sortKey === "unitPrice") {
        const ap = toNum((a as any).unitPrice ?? (a as any).price);
        const bp = toNum((b as any).unitPrice ?? (b as any).price);
        return (ap - bp) * dir;
      }
      // createdAt
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (at - bt) * dir;
    });
  }

  const filtered = useMemo(() => sortProducts(products), [products, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function onDelete(id?: string) {
    if (!id) return;
    if (!confirm("Delete this product permanently?")) return;
    try {
      setDeleting((m) => ({ ...m, [id]: true }));
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Delete failed");
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (e: any) {
      alert("❌ " + (e?.message || "Delete failed"));
    } finally {
      setDeleting((m) => ({ ...m, [id]: false }));
    }
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
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

        <span className="opacity-50 mx-2">|</span>

        <label className="text-sm">Sort:</label>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="px-3 py-2 rounded bg-[var(--bg-nav)]">
          <option value="createdAt">Created</option>
          <option value="title">Title</option>
          <option value="unitPrice">Price</option>
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)} className="px-3 py-2 rounded bg-[var(--bg-nav)]">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-[var(--bg-nav)]">
        <table className="min-w-full text-left">
          <thead className="bg-[var(--bg-nav)] text-sm">
            <tr>
              <th className="py-2 px-3">Item</th>
              <th className="py-2 px-3">Title</th>
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3">Audience</th>
              <th className="py-2 px-3">Price</th>
              <th className="py-2 px-3">Created</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {current.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center">No products.</td></tr>
            ) : current.map((p) => {
              const price = toNum((p as any).unitPrice ?? (p as any).price);
              const img = Array.isArray(p.images) && p.images[0] ? p.images[0] : "/products/gray-placeholder.jpg";
              return (
                <tr key={p._id} className="border-b border-[var(--bg-nav)]">
                  <td className="py-2 px-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={p.title} className="w-14 h-14 object-cover rounded" />
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs opacity-70">{p.subCategory || "-"}</div>
                  </td>
                  <td className="py-2 px-3">{p.category}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.audience?.length ? p.audience : ["unisex"]).map((a) => (
                        <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-[#364763]">{a}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3">${price.toFixed(2)}</td>
                  <td className="py-2 px-3 text-sm">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <Link href={`/admin/products/${p._id}`} className="px-3 py-1 rounded bg-blue-600 text-sm">Edit</Link>
                      <button
                        onClick={() => onDelete(p._id)}
                        disabled={deleting[p._id!]}
                        className="px-3 py-1 rounded bg-red-600 text-sm disabled:opacity-50"
                      >
                        {deleting[p._id!] ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${page === i + 1 ? "bg-blue-600" : "bg-[var(--bg-nav)] hover:bg-blue-500"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
