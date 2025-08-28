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

  const [audience, setAudience] = useState<string>("unisex");

  // New: support either existing URL or uploading a new file; file takes priority visually & on save
  const [imageUrl, setImageUrl] = useState<string>(""); // existing/hosted image url (optional)
  const [imageFile, setImageFile] = useState<File | null>(null);

  // New: specs with dropdown-friendly keys (no requirements)
  const [specs, setSpecs] = useState<SpecRow[]>([]);

  const [statusMsg, setStatusMsg] = useState<{ ok?: boolean; text?: string }>(
    {}
  );

  // When department changes, seed category; clear subcategory
  useEffect(() => {
    setCategory(getCategories(dept)[0] ?? "");
    setSubcategory("");
  }, [dept]);

  // ------- Spec helpers (no external dependencies) -------

  // Common spec keys for all jewelry
  const COMMON_JEWELRY_SPECS = [
    "metal",
    "stone",
    "carat",
    "color",
    "clarity",
    "cut",
    "shape",
    "size", // e.g., ring size, necklace length (you can name the value clearly)
    "width",
    "length",
    "weight",
    "setting",
    "style",
    "certificate",
  ];

  // Ring-focused extra keys
  const RING_ONLY = ["ring-size", "band-width", "stone-size"];

  // Watch-focused keys
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

  // Build preset keys based on dept & category; no requirements enforced
  const presetSpecKeys = useMemo(() => {
    if (dept === "watch") {
      return COMMON_WATCH_SPECS;
    }
    // jewelry:
    const base = [...COMMON_JEWELRY_SPECS];
    const c = (category || "").toLowerCase();
    if (c.includes("ring")) return [...RING_ONLY, ...base];
    if (c.includes("bracelet"))
      return [
        "length",
        "metal",
        "style",
        "weight",
        "stone",
        "carat",
        "width",
        ...base,
      ];
    if (c.includes("necklace"))
      return ["length", "metal", "style", "pendant", "stone", "carat", ...base];
    if (c.includes("earring"))
      return [
        "style",
        "back-type",
        "metal",
        "stone",
        "carat",
        "length",
        "width",
        ...base,
      ];
    if (c.includes("watch")) return COMMON_WATCH_SPECS; // in case category names include "watch"
    return base;
  }, [dept, category]);

  // Full dropdown options (unique)
  const SPEC_KEY_OPTIONS = useMemo(() => {
    const uniq = Array.from(new Set(presetSpecKeys));
    // Keep a stable order: presets first, then "custom" option handled separately
    return uniq;
  }, [presetSpecKeys]);

  function addEmptySpecRow() {
    setSpecs((r) => [...r, { key: "", value: "" }]);
  }

  function addPresetSpecRow(key: string) {
    setSpecs((r) => [...r, { key, value: "" }]);
  }

  function removeSpecRow(index: number) {
    setSpecs((r) => r.filter((_, i) => i !== index));
  }

  function updateSpecKey(index: number, newKey: string) {
    setSpecs((r) =>
      r.map((row, i) => (i === index ? { ...row, key: newKey } : row))
    );
  }

  function updateSpecValue(index: number, newVal: string) {
    setSpecs((r) =>
      r.map((row, i) => (i === index ? { ...row, value: newVal } : row))
    );
  }

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

  // Preview logic: file preview > url preview > nothing
  const previewSrc = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    if (imageUrl?.trim()) return imageUrl.trim();
    return "";
  }, [imageFile, imageUrl]);

  // ------- Submit -------

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setStatusMsg({ ok: undefined, text: "Saving…" });

      // Decide image to send:
      // - If a file is chosen, upload it, use its cloud URL
      // - Else if an imageUrl string is present, use it
      // - Else placeholder
      let finalImageUrl: string | null = null;

      if (imageFile) {
        finalImageUrl = await uploadImage();
      } else if (imageUrl?.trim()) {
        finalImageUrl = imageUrl.trim();
      }

      const body = {
        name,
        description,
        price: price.trim() === "" ? null : Number(price),
        salePrice: salePrice.trim() === "" ? null : Number(salePrice),
        category: category || null,
        subcategory: subcategory || null,
        imageUrl: finalImageUrl ?? "/gray-placeholder.jpg",
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

      // Reset (keep dept/category so adding many is faster)
      setName("");
      setPrice("");
      setSalePrice("");
      setDescription("");
      setSubcategory("");
      setImageFile(null);
      setImageUrl("");
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

        {/* --- Images: URL or File (preview supports both; file takes priority) --- */}
        <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Image URL (optional)</label>
            <input
              type="url"
              placeholder="https://... (if you already have a hosted image)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
            />
            <p className="mt-2 text-xs opacity-70">
              If you also select a file, the uploaded file will be used instead
              of this URL.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">
              Upload Product Photo (optional)
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              {imageFile && (
                <span className="text-sm opacity-80">{imageFile.name}</span>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="text-sm font-medium">Preview</label>
            <div className="mt-2">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Preview"
                  className="w-48 h-48 object-cover rounded border"
                />
              ) : (
                <div className="w-48 h-48 rounded border opacity-60 grid place-items-center text-sm">
                  No image selected
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Specs (no requirements) --- */}
        <details className="md:col-span-2 rounded border border-[var(--bg-nav)]">
          <summary className="cursor-pointer px-3 py-2 bg-[var(--bg-nav)]">
            Specifications (optional)
          </summary>

          <div className="p-3 space-y-3">
            {/* Quick-add dropdown for common spec keys */}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm opacity-80">Quick add:</label>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  addPresetSpecRow(val);
                  e.currentTarget.value = "";
                }}
                className="px-3 py-2 rounded bg-[var(--bg-nav)]"
                defaultValue=""
              >
                <option value="">(choose a spec)</option>
                {SPEC_KEY_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={addEmptySpecRow}
                className="px-3 py-1 rounded bg-blue-600"
              >
                + Empty row
              </button>
            </div>

            {specs.length === 0 && (
              <p className="text-sm opacity-70">
                Add rows for things like: <i>metal</i>, <i>size</i>,{" "}
                <i>carat</i>, <i>clarity</i>, <i>cut</i>, <i>movement</i>,{" "}
                <i>case-size</i>, etc. (totally optional)
              </p>
            )}

            {/* Rows */}
            {specs.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                {/* Key: dropdown + free edit input (both keep it optional) */}
                <div className="col-span-5 flex gap-2">
                  <select
                    value={SPEC_KEY_OPTIONS.includes(row.key) ? row.key : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) updateSpecKey(i, val);
                    }}
                    className="min-w-[9rem] px-3 py-2 rounded bg-[var(--bg-nav)]"
                  >
                    <option value="">(pick common key)</option>
                    {SPEC_KEY_OPTIONS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <input
                    className="flex-1 px-3 py-2 rounded bg-[var(--bg-nav)]"
                    placeholder="Or type your own key"
                    value={row.key}
                    onChange={(e) => updateSpecKey(i, e.target.value)}
                  />
                </div>

                {/* Value */}
                <input
                  className="col-span-6 px-3 py-2 rounded bg-[var(--bg-nav)]"
                  placeholder="Value (e.g. 14k gold, 1.2ct, 40mm)"
                  value={row.value}
                  onChange={(e) => updateSpecValue(i, e.target.value)}
                />

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeSpecRow(i)}
                  className="col-span-1 px-2 rounded bg-red-600"
                  aria-label="Remove spec row"
                  title="Remove spec row"
                >
                  ✕
                </button>
              </div>
            ))}
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
