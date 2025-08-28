// 📄 pages/admin/products/new.tsx
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DEPARTMENTS, getCategories, getSubCategories } from "@/lib/taxonomy";

type Department = "jewelry" | "watch";

export default function NewProductPage() {
  const { data: session, status } = useSession();
  const [dept, setDept] = useState<Department>("jewelry");
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [salePrice, setSalePrice] = useState<string>("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<string>("unisex");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ ok?: boolean; text?: string }>(
    {}
  );

  useEffect(() => {
    setCategory(getCategories(dept)[0] ?? "");
    setSubcategory("");
  }, [dept]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setStatusMsg({ ok: undefined, text: "Saving…" });

      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImage();

      const body = {
        name,
        price: Number(price),
        salePrice: salePrice ? Number(salePrice) : null,
        category,
        subcategory: subcategory || null,
        imageUrl: imageUrl ?? "/gray-placeholder.jpg",
        audience: [audience],
        specs: specs.reduce(
          (acc, r) => (r.key ? { ...acc, [r.key]: r.value } : acc),
          {} as Record<string, any>
        ),
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Create failed");
      setStatusMsg({ ok: true, text: "✅ Product created" });
      setName("");
      setPrice("");
      setSalePrice("");
      setDescription("");
      setSubcategory("");
      setImageFile(null);
      setSpecs([]);
    } catch (err: any) {
      setStatusMsg({
        ok: false,
        text: "❌ " + (err?.message || "Create failed"),
      });
    }
  }

  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin)
    return <div className="p-6 text-red-300">❌ Unauthorized</div>;

  return (
    <div className="p-6 min-h-screen bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>New Product | Admin</title>
      </Head>
      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 -mt-2 mb-6">
        <Breadcrumbs />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-serif font-bold">➕ Add Product</h1>
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

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-[var(--bg-nav)] rounded-xl p-4"
      >
        {/* Department & Category */}
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
            {getSubCategories(dept, category).map((s) => (
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
            required
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
            required
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

        {/* Upload only (with preview) */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Product Photo</label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            {imageFile && (
              <>
                <span className="text-sm opacity-80">{imageFile.name}</span>
                <div className="mt-2">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded border"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Specs dropdown */}
        <details className="md:col-span-2 rounded border border-[var(--bg-nav)]">
          <summary className="cursor-pointer px-3 py-2 bg-[var(--bg-nav)]">
            Specifications
          </summary>
          <div className="p-3 space-y-2">
            {specs.length === 0 && (
              <p className="text-sm opacity-70">
                Add key/value rows like: Metal = 14k Gold
              </p>
            )}
            {specs.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  className="col-span-5 px-3 py-2 rounded bg-[var(--bg-nav)]"
                  placeholder="Key (e.g. metal)"
                  value={row.key}
                  onChange={(e) =>
                    setSpecs((r) =>
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
                    setSpecs((r) =>
                      r.map((x, idx) =>
                        idx === i ? { ...x, value: e.target.value } : x
                      )
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setSpecs((r) => r.filter((_, idx) => idx !== i))
                  }
                  className="col-span-1 px-2 rounded bg-red-600"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSpecs((r) => [...r, { key: "", value: "" }])}
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
          Create
        </button>
      </form>
    </div>
  );
}
