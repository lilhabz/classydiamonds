// components/admin/ProductForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product, Audience, Department, Specs } from "@/types/product";
import {
  DEPARTMENTS,
  getCategories,
  getSubCategories,
  getSpecFields,
} from "@/lib/taxonomy";

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
  // basics
  const [title, setTitle] = useState(initial?.title || "");
  const [department, setDepartment] = useState<Department>(
    ((initial?.department as Department) || "jewelry")
  );
  const [category, setCategory] = useState<string>(initial?.category || "");
  const [subCategory, setSubCategory] = useState<string>(initial?.subCategory || "");

  const [audience, setAudience] = useState<Audience[]>(
    (Array.isArray(initial?.audience) && initial!.audience!.length ? (initial!.audience as Audience[]) : ["unisex"])
  );

  const [unitPrice, setUnitPrice] = useState<string>(String(initial?.unitPrice ?? initial?.price ?? ""));
  const [description, setDescription] = useState(initial?.description || "");
  const [tags, setTags] = useState<string>((initial?.tags || []).join(", "));
  const [images, setImages] = useState<string>((initial?.images || []).join("\n"));
  const [specs, setSpecs] = useState<Specs>(initial?.specs || {});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // update when editing another product
  useEffect(() => {
    if (initial?._id) {
      setTitle(initial.title || "");
      setDepartment((initial.department as Department) || "jewelry");
      setCategory(initial.category || "");
      setSubCategory(initial.subCategory || "");
      setAudience((Array.isArray(initial.audience) && initial.audience.length ? (initial.audience as Audience[]) : ["unisex"]));
      setUnitPrice(String(initial.unitPrice ?? initial.price ?? ""));
      setDescription(initial.description || "");
      setTags((initial.tags || []).join(", "));
      setImages((initial.images || []).join("\n"));
      setSpecs(initial.specs || {});
    }
  }, [initial?._id]);

  // cascade: if department changes, reset category/subCategory/specs
  useEffect(() => {
    setCategory((prev) => (getCategories(department).includes(prev) ? prev : ""));
    setSubCategory("");
    setSpecs({});
  }, [department]);

  // change subCategory reset (specs)
  useEffect(() => {
    setSpecs((prev) => {
      // prune keys not in current spec set
      const allowed = new Set(getSpecFields(department, category, subCategory).map(([k]) => k));
      const next: Specs = {};
      for (const [k, v] of Object.entries(prev || {})) {
        if (allowed.has(k)) next[k] = v;
      }
      return next;
    });
  }, [department, category, subCategory]);

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

  const specFields = getSpecFields(department, category, subCategory);

  function setSpec(key: string, value: any) {
    setSpecs((prev) => ({ ...(prev || {}), [key]: value }));
  }

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
      department,
      category: category || undefined,
      subCategory: subCategory || undefined,
      audience: audience.length ? audience : ["unisex"],
      unitPrice: toNum(unitPrice),
      description,
      images: imageList,
      tags: tagList,
      specs: Object.keys(specs || {}).length ? specs : undefined,
    } as Partial<Product>;
  }, [title, department, category, subCategory, audience, unitPrice, description, tags, images, specs]);

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

      {/* Department tabs */}
      <div>
        <label className="block text-sm opacity-80 mb-2">Department</label>
        <div className="flex gap-2">
          {DEPARTMENTS.map((d) => {
            const active = department === d;
            return (
              <button
                type="button"
                key={d}
                onClick={() => setDepartment(d)}
                className={`px-3 py-1 rounded-full text-sm border ${active ? "bg-blue-600 text-white" : "bg-[var(--bg-nav)]"}`}
              >
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cascading selects: Category + Subcategory */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm opacity-80 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setSubCategory(""); }}
            className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
          >
            <option value="">Select…</option>
            {getCategories(department).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm opacity-80 mb-1">Sub-category</label>
          <select
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
            disabled={!category}
          >
            <option value="">Select…</option>
            {getSubCategories(department, category).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
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

      {/* Audience */}
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
                className={`px-3 py-1 rounded-full text-sm border ${active ? "bg-blue-600 text-white" : "bg-[var(--bg-nav)]"}`}
              >
                {a[0].toUpperCase() + a.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic specs */}
      {specFields.length > 0 && (
        <div>
          <label className="block text-sm opacity-80 mb-2">Specifications</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {specFields.map(([key, def]) => {
              const v = (specs || {})[key] ?? "";
              if (def.type === "select") {
                return (
                  <div key={key}>
                    <label className="block text-xs opacity-75 mb-1">{key}</label>
                    <select
                      value={String(v)}
                      onChange={(e) => setSpec(key, e.target.value)}
                      className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                    >
                      <option value="">—</option>
                      {def.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                );
              }
              if (def.type === "number") {
                return (
                  <div key={key}>
                    <label className="block text-xs opacity-75 mb-1">
                      {key}{def.unit ? ` (${def.unit})` : ""}
                    </label>
                    <input
                      type="number"
                      step={def.step ?? 1}
                      value={v === "" ? "" : Number(v)}
                      onChange={(e) => setSpec(key, e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
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
                      onChange={(e) => setSpec(key, e.target.checked)}
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
                    onChange={(e) => setSpec(key, e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Media & text */}
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
