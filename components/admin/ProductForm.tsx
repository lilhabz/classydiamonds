// components/admin/ProductForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product, Audience, Department, Specs } from "@/types/product";
import {
  DEPARTMENTS,
  getCategories,
  getSubCategories,
  getSpecFields,
} from "@/lib/taxonomy";

type Props = {
  initial?: Partial<Product>;
  onSaved?: (p: Product) => void;
  mode: "create" | "edit";
};

const ALL_AUDIENCE: Audience[] = ["women", "men", "unisex", "kids"];

const toNum = (v: unknown, d = 0) => {
  if (v == null || v === "") return d;
  if (typeof v === "number") return Number.isFinite(v) ? v : d;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : d;
  }
  return d;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function ProductForm({ initial, onSaved, mode }: Props) {
  // basics
  const [title, setTitle] = useState(
    initial?.title || (initial as any)?.name || ""
  );
  const [department, setDepartment] = useState<Department>(
    (initial?.department as Department) || "jewelry"
  );
  const [category, setCategory] = useState<string>(initial?.category || "");
  const [subCategory, setSubCategory] = useState<string>(
    (initial as any)?.subCategory || (initial as any)?.subcategory || ""
  );

  const [audience, setAudience] = useState<Audience[]>(
    Array.isArray(initial?.audience) && initial!.audience!.length
      ? (initial!.audience as Audience[])
      : ["unisex"]
  );

  const [unitPrice, setUnitPrice] = useState<string>(
    String(initial?.unitPrice ?? initial?.price ?? "")
  );
  const [description, setDescription] = useState(initial?.description || "");

  // specs
  const [specs, setSpecs] = useState<Specs>(initial?.specs || {});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // upload-only image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [imageRemoved, setImageRemoved] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // existing image (for edit mode)
  const existingImage: string =
    (Array.isArray(initial?.images) && initial?.images?.[0]) ||
    (initial as any)?.imageUrl ||
    "";

  // update when editing another product
  useEffect(() => {
    if (!initial?._id) return;
    setTitle(initial.title || (initial as any).name || "");
    setDepartment((initial.department as Department) || "jewelry");
    setCategory(initial.category || "");
    setSubCategory(
      (initial as any).subCategory || (initial as any).subcategory || ""
    );
    setAudience(
      Array.isArray(initial.audience) && initial.audience.length
        ? (initial.audience as Audience[])
        : ["unisex"]
    );
    setUnitPrice(String(initial.unitPrice ?? initial.price ?? ""));
    setDescription(initial.description || "");
    setSpecs(initial.specs || {});
    setImageFile(null);
    setPreviewUrl("");
    setImageRemoved(false);
  }, [initial?._id]);

  // cascade: reset category/subCategory/specs when dept changes
  useEffect(() => {
    setCategory((prev) =>
      getCategories(department).includes(prev) ? prev : ""
    );
    setSubCategory("");
    setSpecs({});
  }, [department]);

  // dynamic spec fields from taxonomy
  const specFields = useMemo(
    () =>
      getSpecFields(department, category, subCategory) as Array<[string, any]>,
    [department, category, subCategory]
  );

  // prune specs when the field set changes
  useEffect(() => {
    setSpecs((prev) => {
      const allowed = new Set(specFields.map(([k]) => k));
      const next: Specs = {};
      for (const [k, v] of Object.entries(prev || {})) {
        if (allowed.has(k)) next[k] = v;
      }
      return next;
    });
  }, [specFields]);

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

  // live preview for file
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // ---------- NEW: helpers for submit flow ----------
  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!imageFile) return imageRemoved ? null : existingImage || null;
    const fd = new FormData();
    fd.append("image", imageFile);
    const res = await fetch("/api/admin/products/upload", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data?.ok)
      throw new Error(data?.error || "Image upload failed");
    return String(data.url);
  }

  function buildPayload(imageUrl: string | null) {
    return {
      name: title,
      slug: (initial as any)?.slug
        ? String((initial as any).slug)
        : slugify(title),
      price: toNum(unitPrice),
      salePrice: null,
      category: category || undefined,
      subcategory: subCategory || null, // migrate.ts accepts 'subcategory' and maps to 'subCategory'
      imageUrl,
      archived: false,
      specs: specs || {},
      audience: audience.length ? audience : ["unisex"],
      description,
      department,
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      // 1) handle image
      const finalImageUrl = await uploadImageIfNeeded();

      if (mode === "create") {
        // 2a) CREATE via migrate (JSON)
        const payload = buildPayload(finalImageUrl);
        const res = await fetch("/api/admin/products/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Save failed");
        onSaved?.(data.product);
      } else {
        // 2b) EDIT via PUT to /[id] (JSON)
        const id =
          (initial as any)?._id ||
          (initial as any)?.id ||
          (initial as any)?.slug;
        if (!id) throw new Error("Missing product id");
        const payload = {
          title,
          name: title,
          slug: (initial as any)?.slug || slugify(title),
          price: toNum(unitPrice),
          unitPrice: toNum(unitPrice),
          category: category || undefined,
          subCategory: subCategory || undefined,
          imageUrl: imageRemoved ? null : finalImageUrl,
          audience: audience.length ? audience : ["unisex"],
          specs: specs || {},
          description,
          department,
        };
        const res = await fetch(
          `/api/admin/products/${encodeURIComponent(id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const data = await res.json();
        if (!res.ok || data?.ok === false)
          throw new Error(data?.error || "Save failed");
        onSaved?.(data.product);
      }
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm opacity-80 mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
          required
        />
      </div>

      {/* Department */}
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
                className={`px-3 py-1 rounded-full text-sm border ${
                  active ? "bg-blue-600 text-white" : "bg-[var(--bg-nav)]"
                }`}
              >
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category/Subcategory/Price */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm opacity-80 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubCategory("");
            }}
            className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
          >
            <option value="">Select…</option>
            {getCategories(department).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
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
              <option key={s} value={s}>
                {s}
              </option>
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
                className={`px-3 py-1 rounded-full text-sm border ${
                  active ? "bg-blue-600 text-white" : "bg-[var(--bg-nav)]"
                }`}
              >
                {a[0].toUpperCase() + a.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Specifications (collapsible) */}
      {specFields.length > 0 && (
        <details className="rounded border border-[var(--bg-nav)]">
          <summary className="cursor-pointer px-3 py-2 bg-[var(--bg-nav)]">
            Specifications
          </summary>
          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {specFields.map(([key, def]) => {
              const v = (specs || {})[key] ?? "";

              if (def.type === "select") {
                return (
                  <div key={key}>
                    <label className="block text-xs opacity-75 mb-1">
                      {def.label || key}
                    </label>
                    <select
                      value={String(v)}
                      onChange={(e) =>
                        setSpecs((prev) => ({
                          ...(prev || {}),
                          [key]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                    >
                      <option value="">—</option>
                      {(def.options as string[]).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.replace(/-/g, " ")}
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
                      {def.label || key}
                      {def.unit ? ` (${def.unit})` : ""}
                    </label>
                    <input
                      type="number"
                      step={def.step ?? 1}
                      value={v === "" ? "" : Number(v)}
                      onChange={(e) =>
                        setSpecs((prev) => ({
                          ...(prev || {}),
                          [key]:
                            e.target.value === "" ? "" : Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
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
                        setSpecs((prev) => ({
                          ...(prev || {}),
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm">{def.label || key}</span>
                  </label>
                );
              }

              // default: text
              return (
                <div key={key}>
                  <label className="block text-xs opacity-75 mb-1">
                    {def.label || key}
                  </label>
                  <input
                    value={String(v)}
                    onChange={(e) =>
                      setSpecs((prev) => ({
                        ...(prev || {}),
                        [key]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                  />
                </div>
              );
            })}
          </div>
          <p className="px-3 pb-3 text-xs opacity-60">
            Tip: leave any field blank to skip it — nothing here is required.
          </p>
        </details>
      )}

      {/* Upload + preview (upload-only) */}
      <div className="grid grid-cols-1 md:grid-cols-[160px,1fr] gap-4 items-start">
        <div className="w-40 h-40 bg-gray-500/40 rounded flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected preview"
              className="w-full h-full object-cover"
            />
          ) : existingImage && !imageRemoved ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={existingImage}
              alt="Current product"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs opacity-70">No Image</span>
          )}
        </div>
        <div className="space-y-2">
          <label className="block text-sm opacity-80">Upload Photo</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setImageFile(f);
              setImageRemoved(false);
            }}
            className="block w-80 text-sm file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-[var(--bg-nav)] text-[var(--foreground)] border rounded p-1"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                setPreviewUrl("");
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="px-3 py-2 rounded bg-gray-600 text-white"
            >
              Clear Selected
            </button>
            {mode === "edit" && (existingImage || previewUrl) && (
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setPreviewUrl("");
                  setImageRemoved(true);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="px-3 py-2 rounded bg-red-600 text-white"
              >
                Remove Current
              </button>
            )}
          </div>
          <p className="text-xs opacity-70">JPG/PNG recommended</p>
        </div>
      </div>

      {/* Description */}
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
        {saving
          ? "Saving…"
          : mode === "create"
          ? "Add Product"
          : "Save Changes"}
      </button>
    </form>
  );
}
