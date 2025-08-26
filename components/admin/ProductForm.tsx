// components/admin/ProductForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product, Audience } from "@/types/product";

const toNum = (v: unknown, d = 0) => {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : d;
  }
  return d;
};

type Props = {
  initial?: Partial<Product>;
  onSaved?: (p: Product) => void;
  mode: "create" | "edit";
};

const ALL_AUDIENCE: Audience[] = ["women", "men", "unisex", "kids"];

export default function ProductForm({ initial, onSaved, mode }: Props) {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState<Product["category"]>((initial?.category as any) || "jewelry");
  const [subCategory, setSubCategory] = useState(initial?.subCategory || "");
  const [audience, setAudience] = useState<Audience[]>(
    (Array.isArray(initial?.audience) && initial!.audience!.length ? (initial!.audience as Audience[]) : ["unisex"])
  );
  const [unitPrice, setUnitPrice] = useState<string>(String(initial?.unitPrice ?? initial?.price ?? ""));
  const [description, setDescription] = useState(initial?.description || "");
  const [tags, setTags] = useState<string>((initial?.tags || []).join(", "));
  const [images, setImages] = useState<string>((initial?.images || []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (initial?._id) {
      setTitle(initial.title || "");
      setCategory((initial.category as any) || "jewelry");
      setSubCategory(initial.subCategory || "");
      setAudience((Array.isArray(initial.audience) && initial.audience.length ? (initial.audience as Audience[]) : ["unisex"]));
      setUnitPrice(String(initial.unitPrice ?? initial.price ?? ""));
      setDescription(initial.description || "");
      setTags((initial.tags || []).join(", "));
      setImages((initial.images || []).join("\n"));
    }
  }, [initial?._id]);

  const toggleAudience = (val: Audience) => {
    setAudience((prev) => {
      if (val === "unisex") return ["unisex"];
      const set = new Set(prev);
      set.delete("unisex");
      if (set.has(val)) set.delete(val);
      else set.add(val);
      return Array.from(set) as Audience[];
    });
  };

  const payload = useMemo(() => {
    const imageList = images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const tagList = tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      title,
      category,
      subCategory: subCategory || undefined,
      audience: audience.length ? audience : ["unisex"],
      unitPrice: toNum(unitPrice),
      description,
      images: imageList,
      tags: tagList,
    } as Partial<Product>;
  }, [title, category, subCategory, audience, unitPrice, description, tags, images]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const endpoint =
        mode === "create"
          ? "/api/admin/products"
          : `/api/admin/products/${initial?._id}`;

      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved?.(data.product);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm opacity-80 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm opacity-80 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Product["category"])}
            className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
          >
            <option value="jewelry">Jewelry</option>
            <option value="watch">Watch</option>
          </select>
        </div>

        <div>
          <label className="block text-sm opacity-80 mb-1">Sub-Category</label>
          <input
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            placeholder="ring, bracelet, pendant..."
            className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
          />
        </div>

        <div>
          <label className="block text-sm opacity-80 mb-1">Unit Price</label>
          <input
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="199.00"
            className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
            inputMode="decimal"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm opacity-80 mb-2">Audience</label>
        <div className="flex flex-wrap gap-2">
          {ALL_AUDIENCE.map((a) => {
            const active = audience.includes(a);
            return (
              <button
                type="button"
                key={a}
                onClick={() => toggleAudience(a)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  active ? "bg-blue-600 text-white" : "bg-[var(--bg-nav)]"
                }`}
              >
                {a[0].toUpperCase() + a.slice(1)}
              </button>
            );
          })}
        </div>
        <p className="text-xs opacity-70 mt-1">
          Most items can be <strong>Unisex</strong>. Choose Women/Men/Kids when it really matters.
        </p>
      </div>

      <div>
        <label className="block text-sm opacity-80 mb-1">Images (one URL per line)</label>
        <textarea
          value={images}
          onChange={(e) => setImages(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
          placeholder="https://.../image1.jpg
https://.../image2.jpg"
        />
      </div>

      <div>
        <label className="block text-sm opacity-80 mb-1">Tags (comma separated)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
          placeholder="minimal, gold, tennis"
        />
      </div>

      <div>
        <label className="block text-sm opacity-80 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
        />
      </div>

      {err && <p className="text-red-400">❌ {err}</p>}
      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2 rounded bg-green-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : mode === "create" ? "Add Product" : "Save Changes"}
      </button>
    </form>
  );
}
