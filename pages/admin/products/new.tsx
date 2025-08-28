// /pages/admin/products/new.tsx
import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DEPARTMENTS, getCategories, getSubCategories } from "@/lib/taxonomy";

type Department = "jewelry" | "watch";
type SpecRow = { key: string; value: string };

export default function NewProductPage() {
  const { data: session, status } = useSession();

  const [dept, setDept] = useState<Department>("jewelry");
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [salePrice, setSalePrice] = useState<string>("");
  const [description, setDescription] = useState("");

  // 👇 Bubble buttons for Audience
  const [audience, setAudience] = useState<string>("unisex");

  // File upload only (with preview)
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ ok?: boolean; text?: string }>(
    {}
  );

  useEffect(() => {
    setCategory(getCategories(dept)[0] ?? "");
    setSubcategory("");
  }, [dept]);

  // ---------- Spec option logic ----------
  const COMMON_JEWELRY_SPECS = [
    "metal",
    "stone",
    "carat",
    "color",
    "clarity",
    "cut",
    "shape",
    "size",
    "width",
    "length",
    "weight",
    "setting",
    "style",
    "certificate",
  ];

  const RING_ONLY = ["ring-size", "band-width", "stone-size"];

  const COMMON_WATCH_SPECS = [
    "brand",
    "model",
    "movement",
    "case-size",
    "case-material",
    "band-material",
    "dial-color",
    "crystal",
    "water-resistance",
    "power-reserve",
    "year",
    "condition",
    "box-papers",
  ];

  const specOptions = useMemo(() => {
    if (dept === "watch") return COMMON_WATCH_SPECS;
    const c = (category || "").toLowerCase();
    if (c.includes("ring")) return [...RING_ONLY, ...COMMON_JEWELRY_SPECS];
    if (c.includes("bracelet"))
      return [
        "length",
        "metal",
        "style",
        "weight",
        "stone",
        "carat",
        "width",
        ...COMMON_JEWELRY_SPECS,
      ];
    if (c.includes("necklace"))
      return [
        "length",
        "metal",
        "style",
        "pendant",
        "stone",
        "carat",
        ...COMMON_JEWELRY_SPECS,
      ];
    if (c.includes("earring"))
      return [
        "style",
        "back-type",
        "metal",
        "stone",
        "carat",
        "length",
        "width",
        ...COMMON_JEWELRY_SPECS,
      ];
    return COMMON_JEWELRY_SPECS;
  }, [dept, category]);

  const SPEC_KEY_OPTIONS = useMemo(
    () => Array.from(new Set(specOptions)),
    [specOptions]
  );

  // ------- Image upload -------
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

  const previewSrc = imageFile ? URL.createObjectURL(imageFile) : "";

  // ------- Submit -------
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setStatusMsg({ ok: undefined, text: "Saving…" });

      let finalImageUrl: string | null = "/gray-placeholder.jpg";
      if (imageFile) finalImageUrl = await uploadImage();

      const body = {
        name,
        description,
        price: price.trim() === "" ? null : Number(price),
        salePrice: salePrice.trim() === "" ? null : Number(salePrice),
        category: category || null,
        subcategory: subcategory || null,
        imageUrl: finalImageUrl,
        audience: [audience],
        specs: specs.reduce(
          (acc, r) => (r.key ? { ...acc, [r.key]: r.value } : acc),
          {} as Record<string, any>
        ),
        department: dept,
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
        <div className="md:col-span-2 flex flex-wrap items-center gap-2">
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

        {/* 👇 Bubble buttons for Audience */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Audience</label>
          <div className="flex gap-2">
            {["unisex", "him", "her", "kids"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAudience(opt)}
                className={`px-3 py-1 rounded-full text-sm border capitalize ${
                  audience === opt
                    ? "bg-yellow-500 text-black"
                    : "bg-[var(--bg-nav)] text-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Upload with preview */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Product Photo</label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            {previewSrc && (
              <img
                src={previewSrc}
                alt="Preview"
                className="w-32 h-32 object-cover rounded border"
              />
            )}
          </div>
        </div>

        {/* Specs */}
        <div className="md:col-span-2 rounded border border-[var(--bg-nav)] p-3">
          <label className="block text-sm font-medium mb-2">
            Specifications (optional)
          </label>

          {/* Dropdown to add new spec */}
          <div className="flex items-center gap-2 mb-3">
            <select
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                setSpecs((r) => [...r, { key: val, value: "" }]);
                e.currentTarget.value = "";
              }}
              className="px-3 py-2 rounded bg-[var(--bg-nav)]"
              defaultValue=""
            >
              <option value="">+ Add specification…</option>
              {SPEC_KEY_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {specs.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2">
              <input
                className="col-span-5 px-3 py-2 rounded bg-[var(--bg-nav)]"
                value={row.key}
                readOnly
              />
              <input
                className="col-span-6 px-3 py-2 rounded bg-[var(--bg-nav)]"
                placeholder="Value"
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
                onClick={() => setSpecs((r) => r.filter((_, idx) => idx !== i))}
                className="col-span-1 px-2 rounded bg-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

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
