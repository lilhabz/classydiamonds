// pages/admin/products/index.tsx
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  DEPARTMENTS,
  getCategories,
  getSubCategories,
  getSpecFields,
} from "@/lib/taxonomy";

type AdminProduct = {
  _id?: string;
  id?: string;
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  unitPrice?: number;
  salePrice?: number | null;
  category?: string;
  subcategory?: string | null;
  subCategory?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  images?: string[] | null;
  audience?: string[];
  specs?: Record<string, any>;
  source?: "db" | "legacy";
  archived?: boolean;
  createdAt?: string;
  department?: "jewelry" | "watch";
  skuNumber?: number;
  // 🆕 stock flag
  inStock?: boolean;
  // 🆕 featured flag
  featured?: boolean;
};

type Department = "jewelry" | "watch";
type SortKey =
  | "createdAt"
  | "title"
  | "unitPrice"
  | "subCategory"
  | "category"
  | "skuNumber"
  | "featured";
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

function inferDept(p: AdminProduct): Department {
  const d = (p.department || "").toLowerCase();
  const c = (p.category || "").toLowerCase();
  if (d === "watch") return "watch";
  if (c === "watch" || c === "watches") return "watch";
  return "jewelry";
}

function pickImage(p: AdminProduct): string {
  const thumb =
    p.images?.[0] ||
    (p.image as string) ||
    (p.imageUrl as string) ||
    "/products/gray-placeholder.jpg";
  return thumb;
}

type ApiProduct = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string | null;
  description?: string | null;
  price?: number | null;
  salePrice?: number | null;
  category?: string | null;
  subCategory?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  audience?: string | string[] | null;
  specs?: Record<string, any> | null;
  archived?: boolean | null;
  createdAt?: string | null;
  department?: "jewelry" | "watch" | null;
  skuNumber?: number | null;
  isLegacy?: boolean;
  source?: "db" | "legacy";
  // 🆕
  inStock?: boolean | null;
  // 🆕 (already supported by API)
  featured?: boolean | null;
};

function adaptApiProduct(p: ApiProduct): AdminProduct {
  const audienceArray = Array.isArray(p.audience)
    ? p.audience
    : p.audience
    ? [String(p.audience)]
    : ["unisex"];

  const source: "db" | "legacy" =
    (p.source as any) ?? ((p as any).isLegacy ? "legacy" : "db");

  return {
    _id: (p._id as string) || undefined,
    id: (p.id as string) || undefined,
    slug: String(p.slug ?? p._id ?? p.id ?? ""),
    name: p.name ?? undefined,
    title: p.name ?? undefined,
    description: p.description ?? undefined,
    price: (p.price as any) ?? undefined,
    unitPrice: (p.price as any) ?? undefined,
    salePrice: (p.salePrice as any) ?? null,
    category: (p.category as any) ?? undefined,
    subCategory: (p.subCategory as any) ?? undefined,
    subcategory: (p.subCategory as any) ?? undefined,
    imageUrl: (p.imageUrl as any) ?? (p.image as any) ?? null,
    image: (p.image as any) ?? (p.imageUrl as any) ?? null,
    images: null,
    audience: audienceArray,
    specs: (p.specs as any) ?? {},
    source,
    archived: !!p.archived,
    createdAt: (p.createdAt as any) ?? undefined,
    department: (p.department as any) ?? undefined,
    skuNumber: (p.skuNumber as any) ?? undefined,
    // 🆕 default to true if missing
    inStock: p.inStock !== false,
    // 🆕 default to false if missing
    featured: p.featured === true,
  };
}

export default function AdminProductsList() {
  const { data: session, status: authStatus } = useSession();
  const [allItems, setAllItems] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // tabs / filters
  const [dept, setDept] = useState<Department>("jewelry");
  const [cat, setCat] = useState<string>("");
  const [sub, setSub] = useState<string>("");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const specFields = getSpecFields(dept, cat, sub);
  const [specFilter, setSpecFilter] = useState<Record<string, any>>({});

  // 🆕 stock filter
  const [stock, setStock] = useState<"all" | "in" | "out">("all");

  // paging
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!session?.user?.isAdmin) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch("/api/admin/products?includeLegacy=1");
        const data = await res.json();
        if (!res.ok || !data?.ok)
          throw new Error(data?.error || "Failed to load products");

        const list: ApiProduct[] = Array.isArray(data.items) ? data.items : [];
        const normalized: AdminProduct[] = list.map(adaptApiProduct);
        setAllItems(normalized);
        setPage(1);
      } catch (e: any) {
        setErr(e?.message || "Failed to load products");
        setAllItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  useEffect(() => {
    setCat("");
    setSub("");
    setSpecFilter({});
    setPage(1);
  }, [dept]);

  useEffect(() => {
    setSub("");
    setSpecFilter({});
    setPage(1);
  }, [cat]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const wantedSpecs = Object.fromEntries(
      Object.entries(specFilter).filter(([, v]) => v !== "" && v != null)
    );

    const list = allItems.filter((p) => {
      if (inferDept(p) !== dept) return false;
      if (cat && (p.category || "").toLowerCase() !== cat.toLowerCase())
        return false;
      const pSub = (p.subcategory ?? p.subCategory ?? "") as string;
      if (sub && pSub.toLowerCase() !== sub.toLowerCase()) return false;

      // 🆕 stock filter
      if (stock === "in" && p.inStock === false) return false;
      if (stock === "out" && (p.inStock ?? true) === true) return false;

      if (needle) {
        const hay = `${p.title ?? ""} ${p.name ?? ""} ${p.description ?? ""} ${
          p.category ?? ""
        } ${pSub ?? ""}`.toLowerCase();
        let hit = hay.includes(needle);
        if (!hit && p.specs && typeof p.specs === "object") {
          hit = Object.values(p.specs).some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(needle)
          );
        }
        if (!hit) return false;
      }

      if (Object.keys(wantedSpecs).length) {
        const pv = p.specs || {};
        for (const [k, v] of Object.entries(wantedSpecs)) {
          if (pv[k] === undefined) return false;
          if (pv[k] !== v) return false;
        }
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "title") {
        const at = (a.title ?? a.name ?? "").toString();
        const bt = (b.title ?? b.name ?? "").toString();
        return at.localeCompare(bt) * dir;
      }
      if (sortKey === "unitPrice") {
        const ap = toNum(a.unitPrice ?? a.price);
        const bp = toNum(b.unitPrice ?? b.price);
        return (ap - bp) * dir;
      }
      if (sortKey === "subCategory") {
        const asub = (a.subCategory ?? a.subcategory ?? "") as string;
        const bsub = (b.subCategory ?? b.subcategory ?? "") as string;
        return asub.localeCompare(bsub) * dir;
      }
      if (sortKey === "category") {
        return (
          (a.category ?? "")
            .toString()
            .localeCompare((b.category ?? "").toString()) * dir
        );
      }
      if (sortKey === "skuNumber") {
        const as = typeof a.skuNumber === "number" ? a.skuNumber : -Infinity;
        const bs = typeof b.skuNumber === "number" ? b.skuNumber : -Infinity;
        return (as - bs) * dir;
      }
      if (sortKey === "featured") {
        const af = a.featured ? 1 : 0;
        const bf = b.featured ? 1 : 0;
        return (af - bf) * dir;
      }
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return (at - bt) * dir;
    });
  }, [allItems, dept, cat, sub, q, specFilter, sortKey, sortDir, stock]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function onDelete(id?: string, source?: "db" | "legacy") {
    if (!id) return;
    if (source === "legacy") {
      alert("Legacy items are read-only. Use “Migrate to DB” first.");
      return;
    }
    if (!confirm("Delete this product permanently?")) return;
    try {
      setDeleting((m) => ({ ...m, [id]: true }));
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false)
        throw new Error(data?.error || "Delete failed");
      setAllItems((prev) => prev.filter((p) => p._id !== id));
    } catch (e: any) {
      alert("❌ " + (e?.message || "Delete failed"));
    } finally {
      setDeleting((m) => ({ ...m, [id]: false }));
    }
  }

  async function onMigrate(p: AdminProduct) {
    try {
      const res = await fetch("/api/admin/products/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name ?? p.title ?? "Untitled",
          slug: p.slug,
          price: Number(p.unitPrice ?? p.price ?? 0),
          salePrice: p.salePrice ?? null,
          category:
            p.category || (inferDept(p) === "watch" ? "watches" : "jewelry"),
          subcategory: (p.subcategory ?? p.subCategory) || null,
          imageUrl: pickImage(p),
          archived: Boolean(p.archived),
          specs: p.specs ?? {},
          audience: p.audience ?? ["unisex"],
          // keep stock true by default when migrating legacy
          inStock: p.inStock !== false,
          // 🆕 pass through featured if present (backend may ignore if unsupported)
          featured: p.featured === true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok)
        throw new Error(data?.error || "Migration failed");

      const reload = await fetch("/api/admin/products?includeLegacy=1").then(
        (r) => r.json()
      );
      const reList: ApiProduct[] = Array.isArray(reload.items)
        ? reload.items
        : [];
      setAllItems(reList.map(adaptApiProduct));

      alert(`Migrated "${p.name ?? p.title}" into DB.`);
    } catch (e: any) {
      alert("❌ " + (e?.message || "Migration failed"));
    }
  }

  if (authStatus === "loading")
    return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin)
    return <div className="p-6 text-red-300">❌ Unauthorized</div>;

  return (
    <div className="p-6 min-h-screen bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Products | Admin</title>
      </Head>
      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 -mt-2 mb-6">
        <Breadcrumbs />
      </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-serif font-bold">🛠 Products</h1>
        <Link
          href="/admin/products/new"
          className="bg-blue-600 px-4 py-2 rounded"
        >
          + Add Product
        </Link>
      </div>

      {/* Department tabs */}
      <div className="flex gap-2 mb-4">
        {DEPARTMENTS.map((d) => {
          const active = dept === (d as Department);
          return (
            <button
              key={d}
              onClick={() => setDept(d as Department)}
              className={`px-3 py-1 rounded-full text-sm border ${
                active
                  ? "bg-yellow-500 text-black"
                  : "bg-[var(--bg-nav)] text-white"
              }`}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
        >
          <option value="">All Categories</option>
          {getCategories(dept).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={sub}
          onChange={(e) => setSub(e.target.value)}
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
          disabled={!cat}
        >
          <option value="">All Sub-categories</option>
          {getSubCategories(dept, cat).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* 🆕 Stock filter */}
        <select
          value={stock}
          onChange={(e) => setStock(e.target.value as any)}
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
        >
          <option value="all">All Stock</option>
          <option value="in">In Stock</option>
          <option value="out">Out of Stock</option>
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
        />

        <span className="opacity-50 mx-2">|</span>

        <label className="text-sm">Sort:</label>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
        >
          <option value="createdAt">Created</option>
          <option value="title">Title</option>
          <option value="unitPrice">Price</option>
          <option value="category">Category</option>
          <option value="subCategory">Sub-Category</option>
          <option value="skuNumber">SKU</option>
          {/* 🆕 Featured in dropdown */}
          <option value="featured">Featured</option>
        </select>
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as SortDir)}
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>

      {/* Spec filters dropdown */}
      {specFields.length > 0 && (
        <div className="mb-4">
          <details className="rounded border border-[var(--bg-nav)]">
            <summary className="cursor-pointer px-3 py-2 bg-[var(--bg-nav)]">
              Specifications (filters)
            </summary>
            <div className="p-3 flex flex-wrap gap-3">
              {specFields.map(([key, def]) => {
                const v = (specFilter as any)[key] ?? "";
                if (def.type === "select") {
                  return (
                    <div key={key}>
                      <label className="block text-xs opacity-75 mb-1">
                        {key}
                      </label>
                      <select
                        value={String(v)}
                        onChange={(e) =>
                          setSpecFilter((m) => ({
                            ...m,
                            [key]: e.target.value,
                          }))
                        }
                        className="px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                      >
                        <option value="">Any</option>
                        {def.options.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (def.type === "number") {
                  return (
                    <div key={key}>
                      <label className="block text-xs opacity-75 mb-1">
                        {key}
                        {def.unit ? ` (${def.unit})` : ""}
                      </label>
                      <input
                        type="number"
                        step={def.step ?? 1}
                        value={v === "" ? "" : Number(v)}
                        onChange={(e) =>
                          setSpecFilter((m) => ({
                            ...m,
                            [key]:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          }))
                        }
                        className="px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                      />
                    </div>
                  );
                }
                if (def.type === "boolean") {
                  return (
                    <label
                      key={key}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded bg-[var(--bg-nav)]"
                    >
                      <input
                        type="checkbox"
                        checked={!!v}
                        onChange={(e) =>
                          setSpecFilter((m) => ({
                            ...m,
                            [key]: e.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm">{def.label || key}</span>
                    </label>
                  );
                }
                return (
                  <div key={key}>
                    <label className="block text-xs opacity-75 mb-1">
                      {key}
                    </label>
                    <input
                      value={String(v)}
                      onChange={(e) =>
                        setSpecFilter((m) => ({ ...m, [key]: e.target.value }))
                      }
                      className="px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                    />
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-[var(--bg-nav)]">
        <table className="min-w-full text-left">
          <thead className="bg-[var(--bg-nav)] text-sm">
            <tr>
              <th
                className="py-2 px-3 cursor-pointer select-none"
                onClick={() => toggleSort("skuNumber")}
                title="Sort by SKU"
              >
                ID{" "}
                {sortKey === "skuNumber" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th className="py-2 px-3">Item</th>
              <th
                className="py-2 px-3 cursor-pointer select-none"
                onClick={() => toggleSort("title")}
                title="Sort by Title"
              >
                Title{" "}
                {sortKey === "title" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                className="py-2 px-3 cursor-pointer select-none"
                onClick={() => toggleSort("category")}
                title="Sort by Category"
              >
                Category{" "}
                {sortKey === "category" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                className="py-2 px-3 cursor-pointer select-none"
                onClick={() => toggleSort("subCategory")}
                title="Sort by Sub-Category"
              >
                Sub-Category{" "}
                {sortKey === "subCategory"
                  ? sortDir === "asc"
                    ? "▲"
                    : "▼"
                  : ""}
              </th>

              {/* 🆕 Stock column */}
              <th className="py-2 px-3">Stock</th>

              {/* 🆕 Featured column (sortable) */}
              <th
                className="py-2 px-3 cursor-pointer select-none"
                onClick={() => toggleSort("featured")}
                title="Sort by Featured"
              >
                Featured{" "}
                {sortKey === "featured" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>

              <th
                className="py-2 px-3 cursor-pointer select-none"
                onClick={() => toggleSort("unitPrice")}
                title="Sort by Price"
              >
                Price{" "}
                {sortKey === "unitPrice" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th
                className="py-2 px-3 cursor-pointer select-none"
                onClick={() => toggleSort("createdAt")}
                title="Sort by Created"
              >
                Created{" "}
                {sortKey === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
              <th className="py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="py-6 text-center">
                  Loading…
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={11} className="py-6 text-center text-red-300">
                  Error: {err}
                </td>
              </tr>
            ) : current.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-6 text-center">
                  No products.
                </td>
              </tr>
            ) : (
              current.map((p) => {
                const title = (p.title || p.name || "(untitled)") as string;
                const img = pickImage(p);
                const price = toNum(p.unitPrice ?? p.price);
                const subCat = (p.subCategory ?? p.subcategory ?? "") as string;
                const key = p._id ?? p.id ?? p.slug;
                const sku =
                  typeof p.skuNumber === "number"
                    ? String(p.skuNumber).padStart(5, "0")
                    : null;
                const shortId =
                  (p._id || "").slice(-6) ||
                  (p.id || "").slice(-6) ||
                  (p.slug || "").slice(-6);

                return (
                  <tr key={key} className="border-b border-[var(--bg-nav)]">
                    <td className="py-2 px-3 font-mono text-xs opacity-80">
                      {sku ?? shortId}
                    </td>
                    <td className="py-2 px-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={title}
                        className="w-14 h-14 object-cover rounded bg-[#1d2740]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{title}</div>
                        {p.source === "legacy" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40">
                            LEGACY
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">{p.category || "-"}</td>
                    <td className="py-2 px-3">{subCat || "-"}</td>

                    {/* 🆕 Stock badge */}
                    <td className="py-2 px-3">
                      {p.inStock !== false ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-600/40">
                          In Stock
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-600/40">
                          Out of Stock
                        </span>
                      )}
                    </td>

                    {/* 🆕 Featured badge/star */}
                    <td className="py-2 px-3">
                      {p.featured ? (
                        <span
                          className="inline-flex items-center gap-1 text-yellow-300"
                          title="Featured"
                        >
                          ★ <span className="text-xs">Yes</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-white/60"
                          title="Not Featured"
                        >
                          ☆ <span className="text-xs">No</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2 px-3">${price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-sm">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-2">
                        {p.source === "db" && p._id ? (
                          <>
                            <Link
                              href={`/admin/products/${p._id}`}
                              className="px-3 py-1 rounded bg-blue-600 text-sm"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => onDelete(p._id, p.source)}
                              disabled={deleting[p._id!]}
                              className="px-3 py-1 rounded bg-red-600 text-sm disabled:opacity-50"
                            >
                              {deleting[p._id!] ? "Deleting…" : "Delete"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onMigrate(p)}
                            className="px-3 py-1 rounded bg-emerald-600 text-sm"
                          >
                            Migrate to DB
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
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
              className={`px-3 py-1 rounded ${
                page === i + 1
                  ? "bg-blue-600"
                  : "bg-[var(--bg-nav)] hover:bg-blue-500"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
