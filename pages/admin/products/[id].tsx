// /pages/admin/products/[id].tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type SpecField = { key: string; label: string; placeholder?: string };

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
  const previewSrc = imageFile
    ? URL.createObjectURL(imageFile)
    : imageUrl || PLACEHOLDER;

  // Spec values + hidden legacy keys preserved
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const hiddenSpecsRef = useRef<Record<string, string>>({});

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

        const specsObj =
          p.specs && typeof p.specs === "object"
            ? (p.specs as Record<string, any>)
            : {};
        hiddenSpecsRef.current = Object.fromEntries(
          Object.entries(specsObj).map(([k, v]) => [k, String(v ?? "")])
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

  // ---------- Spec fields (same as new) ----------
  const specFieldsFor = (d: Department, cat: string): SpecField[] => {
    const c = (cat || "").toLowerCase();

    const baseJewelry: SpecField[] = [
      { key: "metal", label: "Metal", placeholder: "e.g., 14k Yellow Gold" },
      { key: "stone", label: "Stone", placeholder: "e.g., Natural Diamond" },
      { key: "carat", label: "Carat", placeholder: "e.g., 1.20 ct" },
      { key: "color", label: "Color", placeholder: "e.g., G" },
      { key: "clarity", label: "Clarity", placeholder: "e.g., VS2" },
      { key: "cut", label: "Cut", placeholder: "e.g., Excellent" },
      { key: "shape", label: "Shape", placeholder: "e.g., Round" },
      { key: "size", label: "Size", placeholder: "e.g., 18 in / 7 in" },
      { key: "width", label: "Width", placeholder: "e.g., 2.0 mm" },
      { key: "length", label: "Length", placeholder: "e.g., 45 mm" },
      { key: "weight", label: "Weight", placeholder: "e.g., 3.8 g" },
      { key: "setting", label: "Setting", placeholder: "e.g., Prong" },
      { key: "style", label: "Style", placeholder: "e.g., Solitaire" },
      { key: "certificate", label: "Certificate", placeholder: "e.g., GIA" },
    ];

    const ringExtras: SpecField[] = [
      { key: "ring-size", label: "Ring Size", placeholder: "e.g., 6.5" },
      { key: "band-width", label: "Band Width", placeholder: "e.g., 2.0 mm" },
      { key: "stone-size", label: "Stone Size", placeholder: "e.g., 6.8 mm" },
    ];

    const braceletPreset: SpecField[] = [
      { key: "length", label: "Length", placeholder: "e.g., 7 in" },
      { key: "metal", label: "Metal", placeholder: "e.g., 14k Yellow Gold" },
      { key: "style", label: "Style", placeholder: "e.g., Tennis" },
      { key: "weight", label: "Weight", placeholder: "e.g., 5.1 g" },
      { key: "stone", label: "Stone", placeholder: "e.g., Lab Diamond" },
      { key: "carat", label: "Carat", placeholder: "e.g., 2.00 ct" },
      { key: "width", label: "Width", placeholder: "e.g., 3 mm" },
    ];

    const necklacePreset: SpecField[] = [
      { key: "length", label: "Length", placeholder: "e.g., 18 in" },
      { key: "metal", label: "Metal", placeholder: "e.g., 14k White Gold" },
      { key: "style", label: "Style", placeholder: "e.g., Pendant" },
      { key: "pendant", label: "Pendant", placeholder: "e.g., Cross" },
      { key: "stone", label: "Stone", placeholder: "e.g., Sapphire" },
      { key: "carat", label: "Carat", placeholder: "e.g., 1.00 ct" },
    ];

    const earringPreset: SpecField[] = [
      { key: "style", label: "Style", placeholder: "e.g., Stud" },
      { key: "back-type", label: "Back Type", placeholder: "e.g., Screw Back" },
      { key: "metal", label: "Metal", placeholder: "e.g., 14k" },
      { key: "stone", label: "Stone", placeholder: "e.g., Diamond" },
      { key: "carat", label: "Carat", placeholder: "e.g., 0.50 ct each" },
      { key: "length", label: "Length", placeholder: "e.g., 10 mm" },
      { key: "width", label: "Width", placeholder: "e.g., 10 mm" },
    ];

    const watchFields: SpecField[] = [
      { key: "brand", label: "Brand", placeholder: "e.g., Rolex" },
      { key: "model", label: "Model", placeholder: "e.g., Datejust 36" },
      { key: "movement", label: "Movement", placeholder: "e.g., Automatic" },
      { key: "case-size", label: "Case Size", placeholder: "e.g., 36 mm" },
      {
        key: "case-material",
        label: "Case Material",
        placeholder: "e.g., Stainless Steel",
      },
      {
        key: "band-material",
        label: "Band Material",
        placeholder: "e.g., Oystersteel",
      },
      { key: "dial-color", label: "Dial Color", placeholder: "e.g., Blue" },
      { key: "crystal", label: "Crystal", placeholder: "e.g., Sapphire" },
      {
        key: "water-resistance",
        label: "Water Resistance",
        placeholder: "e.g., 100 m",
      },
      {
        key: "power-reserve",
        label: "Power Reserve",
        placeholder: "e.g., 70 h",
      },
      { key: "year", label: "Year", placeholder: "e.g., 2021" },
      { key: "condition", label: "Condition", placeholder: "e.g., Excellent" },
      { key: "box-papers", label: "Box/Papers", placeholder: "e.g., Yes" },
    ];

    if (d === "watch") return watchFields;
    if (c.includes("ring")) return [...ringExtras, ...baseJewelry];
    if (c.includes("bracelet")) return braceletPreset;
    if (c.includes("necklace")) return necklacePreset;
    if (c.includes("earring")) return earringPreset;
    return baseJewelry;
  };

  const specFields = useMemo(
    () => specFieldsFor(dept, category),
    [dept, category]
  );

  // Prefill visible spec inputs from hidden specs
  useEffect(() => {
    setSpecValues((prev) => {
      const next: Record<string, string> = {};
      for (const f of specFields) {
        if (prev[f.key] !== undefined) next[f.key] = prev[f.key];
        else next[f.key] = hiddenSpecsRef.current[f.key] ?? "";
      }
      return next;
    });
  }, [specFields]);

  // ---------- Upload ----------
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

  // ---------- Save ----------
  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    try {
      setStatusMsg({ ok: undefined, text: "Saving…" });

      let nextImageUrl: string | null | undefined = undefined;
      if (resetToPlaceholder) nextImageUrl = PLACEHOLDER;
      else if (imageFile) nextImageUrl = await uploadImage();

      // Visible non-empty specs
      const visible: Record<string, string> = {};
      for (const f of specFields) {
        const v = (specValues[f.key] ?? "").trim();
        if (v !== "") visible[f.key] = v;
      }
      // Merge with legacy hidden
      const merged: Record<string, string> = {
        ...hiddenSpecsRef.current,
        ...visible,
      };

      const body: Record<string, any> = {
        name,
        description,
        price: price.trim() === "" ? null : Number(price),
        salePrice: salePrice.trim() === "" ? null : Number(salePrice),
        category: category || null,
        subcategory: subcategory || null,
        audience: [audience],
        specs: merged,
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

      // Refresh legacy map from server
      const serverSpecs =
        p.specs && typeof p.specs === "object"
          ? (p.specs as Record<string, any>)
          : {};
      hiddenSpecsRef.current = Object.fromEntries(
        Object.entries(serverSpecs).map(([k, v]) => [k, String(v ?? "")])
      );
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
          {/* Dept & Categories */}
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

          {/* Name / Desc / Prices */}
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

          {/* Audience bubbles */}
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

          {/* Button-looking upload + persistent preview + reset */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">Product Photo</label>
            <div className="flex items-center gap-4">
              <label className="px-4 py-2 rounded bg-blue-600 cursor-pointer inline-block">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
              </label>

              <label className="flex items-center gap-2 text-sm opacity-90">
                <input
                  type="checkbox"
                  checked={resetToPlaceholder}
                  onChange={(e) => setResetToPlaceholder(e.target.checked)}
                />
                Reset to placeholder
              </label>

              {/* Persistent preview (never removed) */}
              <img
                src={previewSrc}
                alt="Preview"
                className="w-32 h-32 object-cover rounded border"
              />
            </div>
          </div>

          {/* Specifications inside a dropdown; smaller text */}
          <details className="md:col-span-2 rounded border border-[var(--bg-nav)]">
            <summary className="cursor-pointer px-3 py-2 bg-[var(--bg-nav)]">
              Specifications
            </summary>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {specFields.map((f) => (
                <label key={f.key} className="block">
                  {f.label}
                  <input
                    value={specValues[f.key] ?? ""}
                    onChange={(e) =>
                      setSpecValues((s) => ({ ...s, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    className="mt-1 w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
                  />
                </label>
              ))}
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
