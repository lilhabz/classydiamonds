// /pages/admin/products/[id].tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DEPARTMENTS, getCategories, getSubCategories } from "@/lib/taxonomy";

type Department = "jewelry" | "watch";
type ProductDoc = {
  _id: string;
  name?: string;
  description?: string;
  price?: number | null;
  salePrice?: number | null;
  category?: string | null;
  subcategory?: string | null;
  imageUrl?: string | null;
  audience?: string[];
  specs?: Record<string, any>;
  department?: Department;
};

const PLACEHOLDER = "/gray-placeholder.jpg";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ ok?: boolean; text?: string }>(
    {}
  );

  const [dept, setDept] = useState<Department>("jewelry");
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [salePrice, setSalePrice] = useState<string>("");
  const [audience, setAudience] = useState<string>("unisex");

  const [imageUrl, setImageUrl] = useState<string | null>(PLACEHOLDER);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [resetToPlaceholder, setResetToPlaceholder] = useState(false);

  const [specRows, setSpecRows] = useState<{ key: string; value: string }[]>(
    []
  );

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/products/${id}`);
        const json = await res.json();
        if (!res.ok || !json?.ok || !json.product)
          throw new Error(json?.error || "Load failed");
        const p: ProductDoc = json.product;

        setName(p.name ?? "");
        setDescription(p.description ?? "");
        setPrice(p.price == null ? "" : String(p.price));
        setSalePrice(p.salePrice == null ? "" : String(p.salePrice));
        setDept((p.department as Department) ?? "jewelry");
        setCategory(p.category ?? "");
        setSubcategory(p.subcategory ?? "");
        setAudience(p.audience?.[0] ?? "unisex");

        const specs = p.specs && typeof p.specs === "object" ? p.specs : {};
        setSpecRows(
          Object.entries(specs).map(([key, value]) => ({
            key,
            value: String(value ?? ""),
          }))
        );

        setImageUrl(p.imageUrl ?? PLACEHOLDER);
        setImageFile(null);
        setResetToPlaceholder(false);
      } catch (e: any) {
        setStatusMsg({
          ok: false,
          text: "❌ " + (e?.message || "Load failed"),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const subcats = useMemo(
    () => getSubCategories(dept, category),
    [dept, category]
  );

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    const fd = new FormData();
    fd.append("image", imageFile);
    const res = await fetch("/api/admin/products/upload", {
      method: "POST",
      body: fd,
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.error || "Upload failed");
    return json.url as string;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    try {
      setStatusMsg({ ok: undefined, text: "Saving…" });

      let nextImageUrl: string | null | undefined = undefined;
      if (resetToPlaceholder) nextImageUrl = PLACEHOLDER;
      else if (imageFile) nextImageUrl = await uploadImage();

      const body: Record<string, any> = {
        name,
        description,
        price: price.trim() === "" ? null : Number(price),
        salePrice: salePrice.trim() === "" ? null : Number(salePrice),
        category: category || null,
        subcategory: subcategory || null,
        audience: [audience],
        specs: specRows.reduce(
          (acc, r) => (r.key ? { ...acc, [r.key]: r.value } : acc),
          {} as Record<string, any>
        ),
        department: dept,
      };
      if (nextImageUrl !== undefined) body.imageUrl = nextImageUrl;

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Update failed");

      setStatusMsg({ ok: true, text: "✅ Product updated" });
      const p: ProductDoc = json.product;
      setImageUrl(p.imageUrl ?? PLACEHOLDER);
      setResetToPlaceholder(false);
      setImageFile(null);
    } catch (err: any) {
      setStatusMsg({
        ok: false,
        text: "❌ " + (err?.message || "Update failed"),
      });
    }
  }

  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin)
    return <div className="p-6 text-red-300">❌ Unauthorized</div>;

  return (
    <div className="p-6 min-h-screen bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Edit Product | Admin</title>
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 -mt-2 mb-6">
        <Breadcrumbs />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-serif font-bold">✏️ Edit Product</h1>
        <Link
          href="/admin/products"
          className="px-3 py-2 rounded bg-[var(--bg-nav)]"
        >
          ← Back to Products
        </Link>
      </div>

      {statusMsg.text && (
        <div
          className={`mb-4 ${
            statusMsg.ok === false
              ? "text-red-400"
              : statusMsg.ok
              ? "text-green-400"
              : "opacity-80"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {loading ? (
        <div className="opacity-80">Loading product…</div>
      ) : (
        <form
          onSubmit={onSave}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-[var(--bg-nav)] rounded-xl p-4"
        >
          {/* Dept & cats */}
          <div className="md:col-span-2 flex gap-2">
            <div className="flex gap-2">
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDept(d as Department)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    dept === d
                      ? "bg-yellow-500 text-black"
                      : "bg-[var(--bg-nav)] text-white"
                  }`}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded bg-[var(--bg-nav)]"
            >
              {getCategories(dept).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="px-3 py-2 rounded bg-[var(--bg-nav)]"
              disabled={!category}
            >
              <option value="">(no subcategory)</option>
              {subcats.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <label>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
            />
          </label>

          <label>
            Price (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
            />
          </label>

          <label>
            Sale Price (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
            />
          </label>

          <label>
            Audience
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
            >
              <option value="unisex">Unisex</option>
              <option value="him">For Him</option>
              <option value="her">For Her</option>
            </select>
          </label>

          {/* Image controls */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">Product Photo</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              <label className="flex items-center gap-2 text-sm opacity-90">
                <input
                  type="checkbox"
                  checked={resetToPlaceholder}
                  onChange={(e) => setResetToPlaceholder(e.target.checked)}
                />
                Reset to placeholder
              </label>
            </div>

            <div className="mt-1">
              {imageFile ? (
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded border"
                />
              ) : (
                imageUrl && (
                  <img
                    src={imageUrl}
                    alt="Current"
                    className="w-32 h-32 object-cover rounded border"
                  />
                )
              )}
            </div>
          </div>

          {/* Specs */}
          <details className="md:col-span-2 rounded border border-[var(--bg-nav)]">
            <summary className="cursor-pointer px-3 py-2 bg-[var(--bg-nav)]">
              Specifications
            </summary>
            <div className="p-3 space-y-2">
              {specRows.length === 0 && (
                <p className="text-sm opacity-70">
                  Add key/value rows like: Metal = 14k Gold
                </p>
              )}
              {specRows.map((row, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input
                    className="col-span-5 px-3 py-2 rounded bg-[var(--bg-nav)]"
                    placeholder="Key (e.g. metal)"
                    value={row.key}
                    onChange={(e) =>
                      setSpecRows((r) =>
                        r.map((x, idx) =>
                          idx === i ? { ...x, key: e.target.value } : x
                        )
                      )
                    }
                  />
                  <input
                    className="col-span-6 px-3 py-2 rounded bg-[var(--bg-nav)]"
                    placeholder="Value (e.g. 14k gold)"
                    value={row.value}
                    onChange={(e) =>
                      setSpecRows((r) =>
                        r.map((x, idx) =>
                          idx === i ? { ...x, value: e.target.value } : x
                        )
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSpecRows((r) => r.filter((_, idx) => idx !== i))
                    }
                    className="col-span-1 px-2 rounded bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSpecRows((r) => [...r, { key: "", value: "" }])
                }
                className="px-3 py-1 rounded bg-blue-600"
              >
                + Add Row
              </button>
            </div>
          </details>

          <button
            type="submit"
            className="md:col-span-2 bg-blue-600 px-4 py-2 rounded"
          >
            Save Changes
          </button>
        </form>
      )}
    </div>
  );
}
