// pages/admin/products/index.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import type { Product, Department } from "@/types/product";
import { DEPARTMENTS, getCategories, getSubCategories, getSpecFields } from "@/lib/taxonomy";

type SortKey = "createdAt" | "title" | "unitPrice" | "subCategory" | "category";
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

  // top-level tabs
  const [dept, setDept] = useState<Department>("jewelry");

  // cascading filters
  const [cat, setCat] = useState<string>("");
  const [sub, setSub] = useState<string>("");

  // text & sort
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // spec filters
  const specFields = getSpecFields(dept, cat, sub);
  const [specFilter, setSpecFilter] = useState<Record<string, any>>({});

  // paging
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!session?.user?.isAdmin) return;
    load();
  }, [session, dept, cat, sub, q, specFilter]);

  async function load() {
    const params = new URLSearchParams();
    params.set("department", dept);
    if (cat) params.set("category", cat);
    if (sub) params.set("subCategory", sub);
    if (q) params.set("q", q);

    // encode spec filter as JSON if any
    const activeSpecs = Object.fromEntries(Object.entries(specFilter).filter(([, v]) => v !== "" && v != null));
    if (Object.keys(activeSpecs).length) {
      params.set("specs", JSON.stringify(activeSpecs));
    }

    const res = await fetch("/api/admin/products?" + params.toString());
    const data = await res.json();
    setProducts(Array.isArray(data.products) ? data.products : []);
    setPage(1);
  }

  useEffect(() => {
    // reset when changing department
    setCat("");
    setSub("");
    setSpecFilter({});
  }, [dept]);

  useEffect(() => {
    setSub("");
    setSpecFilter({});
  }, [cat]);

  function sortProducts(list: Product[]): Product[] {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "title") {
        return (a.title || "").localeCompare(b.title || "") * dir;
      }
      if (sortKey === "unitPrice") {
        const ap = toNum((a as any).unitPrice ?? (a as any).price);
        const bp = toNum((b as any).unitPrice ?? (b as any).price);
        return (ap - bp) * dir;
      }
      if (sortKey === "subCategory") {
        return (a.subCategory || "").localeCompare(b.subCategory || "") * dir;
      }
      if (sortKey === "category") {
        return (a.category || "").localeCompare(b.category || "") * dir;
      }
      // createdAt default
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

      {/* Department tabs */}
      <div className="flex gap-2 mb-4">
        {DEPARTMENTS.map((d) => {
          const active = dept === d;
          return (
            <button
              key={d}
              onClick={() => setDept(d)}
              className={`px-3 py-1 rounded-full text-sm border ${active ? "bg-yellow-500 text-black" : "bg-[var(--bg-nav)] text-white"}`}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-3 py-2 rounded bg-[var(--bg-nav)]">
          <option value="">All Categories</option>
          {getCategories(dept).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
          disabled={!cat}
        >
          <option value="">All Sub-categories</option>
          {getSubCategories(dept, cat).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title/desc/tags…"
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
        />

        <span className="opacity-50 mx-2">|</span>

        <label className="text-sm">Sort:</label>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="px-3 py-2 rounded bg-[var(--bg-nav)]">
          <option value="createdAt">Created</option>
          <option value="title">Title</option>
          <option value="unitPrice">Price</option>
          <option value="category">Category</option>
          <option value="subCategory">Sub-Category</option>
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)} className="px-3 py-2 rounded bg-[var(--bg-nav)]">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>

      {/* Spec filters (dynamic) */}
      {specFields.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-3">
            {specFields.map(([key, def]) => {
              const v = specFilter[key] ?? "";
              if (def.type === "select") {
                return (
                  <div key={key}>
                    <label className="block text-xs opacity-75 mb-1">{key}</label>
                    <select
                      value={String(v)}
                      onChange={(e) => setSpecFilter((m) => ({ ...m, [key]: e.target.value }))}
                      className="px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                    >
                      <option value="">Any</option>
                      {def.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                );
              }
              if (def.type === "number") {
                return (
                  <div key={key}>
                    <label className="block text-xs opacity-75 mb-1">{key}{def.unit ? ` (${def.unit})` : ""}</label>
                    <input
                      type="number"
                      step={def.step ?? 1}
                      value={v === "" ? "" : Number(v)}
                      onChange={(e) => setSpecFilter((m) => ({ ...m, [key]: e.target.value === "" ? "" : Number(e.target.value) }))}
                      className="px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                    />
                  </div>
                );
              }
              if (def.type === "boolean") {
                return (
                  <label key={key} className="inline-flex items-center gap-2 px-3 py-2 rounded bg-[var(--bg-nav)]">
                    <input
                      type="checkbox"
                      checked={!!v}
                      onChange={(e) => setSpecFilter((m) => ({ ...m, [key]: e.target.checked }))}
                    />
                    <span className="text-sm">{def.label || key}</span>
                  </label>
                );
              }
              return (
                <div key={key}>
                  <label className="block text-xs opacity-75 mb-1">{key}</label>
                  <input
                    value={String(v)}
                    onChange={(e) => setSpecFilter((m) => ({ ...m, [key]: e.target.value }))}
                    className="px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-[var(--bg-nav)]">
        <table className="min-w-full text-left">
          <thead className="bg-[var(--bg-nav)] text-sm">
            <tr>
              <th className="py-2 px-3">Item</th>
              <th className="py-2 px-3">Title</th>
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3">Sub-Category</th>
              <th className="py-2 px-3">Audience</th>
              <th className="py-2 px-3">Price</th>
              <th className="py-2 px-3">Created</th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {current.length === 0 ? (
              <tr><td colSpan={8} className="py-6 text-center">No products.</td></tr>
            ) : current.map((p) => {
              const title = (p as any).title || (p as any).name || "(untitled)";
              const img =
                (Array.isArray(p.images) && p.images[0]) ||
                (p as any).image ||
                "/products/gray-placeholder.jpg";
              const price = toNum((p as any).unitPrice ?? (p as any).price);

              return (
                <tr key={p._id} className="border-b border-[var(--bg-nav)]">
                  <td className="py-2 px-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={title} className="w-14 h-14 object-cover rounded bg-[#1d2740]" />
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-medium">{title}</div>
                  </td>
                  <td className="py-2 px-3">{p.category || "-"}</td>
                  <td className="py-2 px-3">{p.subCategory || "-"}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.audience?.length ? p.audience : ["unisex"]).map((a) => (
                        <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-[#364763]">
                          {a}
                        </span>
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
