// components/admin/ProductForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product, Audience, Department, Specs } from "@/types/product";
import {
  DEPARTMENTS,
  getCategories,
  getSubCategories,
  getSpecFields, // your current dynamic spec source
} from "@/lib/taxonomy";

/**
 * Keep these facet values in sync with components/FiltersSidebar.tsx.
 * These slugs MUST match your query param filters so storefront filtering works.
 */
const METALS = ["yellow-gold", "white-gold", "rose-gold", "platinum"] as const;
const STONES = ["diamond", "lab-grown", "moissanite", "gemstone"] as const;
const SHAPES = ["round", "oval", "princess", "emerald", "cushion", "pear"] as const;

type StringTuple = readonly string[];

type SpecDef =
  | { type: "select"; options: StringTuple; label?: string }
  | { type: "number"; step?: number; unit?: string; label?: string }
  | { type: "boolean"; label?: string }
  | { type: "text"; label?: string };

// ---- Expanded spec library (optional, merged with getSpecFields) ----
/**
 * We use simple, universal keys (kebab-case). Feel free to add/remove.
 * Nothing here is required; your API will receive only what the user sets.
 */
const COMMON_SPECS: Record<string, SpecDef> = {
  // Must align with FiltersSidebar facets:
  metal: { type: "select", options: METALS, label: "Metal" },
  stone: { type: "select", options: STONES, label: "Stone" },
  shape: { type: "select", options: SHAPES, label: "Stone Shape" },

  // Price is not a spec (you already have price field)
  // Carat ranges are filters; we expose total/center/side carat weights:
  "carat-total": { type: "number", step: 0.01, label: "Total Carat" },
  "carat-center": { type: "number", step: 0.01, label: "Center Carat" },
  "carat-side": { type: "number", step: 0.01, label: "Side Stones Carat" },

  // Metal details
  "metal-purity": {
    type: "select",
    options: ["10k", "14k", "18k", "22k", "24k", "platinum-950", "platinum-900"],
    label: "Metal Purity",
  },
  // Style/Setting
  style: {
    type: "select",
    options: [
      "solitaire",
      "halo",
      "three-stone",
      "eternity",
      "tennis",
      "pave",
      "channel",
      "bezel",
      "tension",
      "hoop",
      "stud",
      "pendant",
      "chain",
      "bangle",
      "cuff",
      "charm",
    ],
    label: "Style",
  },
  setting: {
    type: "select",
    options: ["prong", "bezel", "channel", "pave", "halo", "tension", "bar", "flush"],
    label: "Setting",
  },

  // Sizes & lengths
  "ring-size": { type: "text", label: "Ring Size (e.g., 6, 6.5, 7)" },
  "bracelet-length-in": { type: "number", step: 0.5, unit: "in", label: "Bracelet Length" },
  "necklace-length-in": { type: "number", step: 1, unit: "in", label: "Necklace Length" },
  "chain-type": {
    type: "select",
    options: ["cable", "curb", "rope", "figaro", "box", "wheat", "paperclip", "snake"],
    label: "Chain Type",
  },
  "clasp-type": {
    type: "select",
    options: ["lobster", "spring-ring", "toggle", "box", "fold-over", "magnetic"],
    label: "Clasp",
  },

  // Stone details
  "stone-color": {
    type: "select",
    options: [
      "colorless",
      "near-colorless",
      "fancy-yellow",
      "fancy-pink",
      "fancy-blue",
      "ruby-red",
      "emerald-green",
      "sapphire-blue",
      "amethyst-purple",
      "citrine",
      "topaz",
      "opal",
      "pearl",
    ],
    label: "Stone Color",
  },
  "stone-clarity": {
    type: "select",
    options: ["fl", "if", "vvs1", "vvs2", "vs1", "vs2", "si1", "si2", "i1", "i2"],
    label: "Clarity",
  },
  "stone-cut-grade": {
    type: "select",
    options: ["excellent", "very-good", "good", "fair"],
    label: "Cut Grade",
  },
  "stone-treatment": {
    type: "select",
    options: ["none", "heat", "hpht", "cvd", "fracture-fill", "irradiation", "oil"],
    label: "Treatment",
  },
  certification: {
    type: "select",
    options: ["gia", "igi", "gcal", "ags", "none"],
    label: "Certification",
  },

  // Finishing
  "finish": {
    type: "select",
    options: ["high-polish", "matte", "satin", "brushed", "hammered"],
    label: "Finish",
  },

  // Misc
  "engraving-available": { type: "boolean", label: "Engraving Available" },
};

// Watch-specific (if you ever expand watches)
const WATCH_SPECS: Record<string, SpecDef> = {
  "watch-brand": { type: "text", label: "Brand" },
  "watch-movement": {
    type: "select",
    options: ["automatic", "manual", "quartz", "solar"],
    label: "Movement",
  },
  "watch-case-size-mm": { type: "number", step: 1, unit: "mm", label: "Case Size" },
  "watch-case-material": {
    type: "select",
    options: ["steel", "titanium", "gold", "ceramic", "two-tone", "platinum"],
    label: "Case Material",
  },
  "watch-band-material": {
    type: "select",
    options: ["steel", "titanium", "gold", "rubber", "leather", "nylon", "ceramic"],
    label: "Band Material",
  },
  "watch-water-resistance-m": { type: "number", step: 10, unit: "m", label: "Water Resistance" },
  "watch-glass": { type: "select", options: ["sapphire", "mineral", "acrylic"], label: "Crystal" },
  "watch-complications": {
    type: "select",
    options: ["date", "day-date", "chronograph", "gmt", "moonphase", "power-reserve"],
    label: "Complications",
  },
  "watch-condition": { type: "select", options: ["new", "pre-owned"], label: "Condition" },
  "watch-warranty": { type: "text", label: "Warranty" },
};

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
    (Array.isArray(initial?.audience) && initial!.audience!.length
      ? (initial!.audience as Audience[])
      : ["unisex"])
  );

  const [unitPrice, setUnitPrice] = useState<string>(
    String(initial?.unitPrice ?? initial?.price ?? "")
  );
  const [description, setDescription] = useState(initial?.description || "");

  // images: URL textarea (back-compat) + file upload
  const [images, setImages] = useState<string>((initial?.images || []).join("\n"));

  const [specs, setSpecs] = useState<Specs>(initial?.specs || {});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // file upload state
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
    if (initial?._id) {
      setTitle(initial.title || "");
      setDepartment((initial.department as Department) || "jewelry");
      setCategory(initial.category || "");
      setSubCategory(initial.subCategory || "");
      setAudience(
        (Array.isArray(initial.audience) && initial.audience.length
          ? (initial.audience as Audience[])
          : ["unisex"])
      );
      setUnitPrice(String(initial.unitPrice ?? initial.price ?? ""));
      setDescription(initial.description || "");
      setImages((initial.images || []).join("\n"));
      setSpecs(initial.specs || {});
      setImageFile(null);
      setPreviewUrl("");
      setImageRemoved(false);
    }
  }, [initial?._id]);

  // cascade: reset category/subCategory/specs when dept changes
  useEffect(() => {
    setCategory((prev) => (getCategories(department).includes(prev) ? prev : ""));
    setSubCategory("");
    setSpecs({});
  }, [department]);

  // Merge your taxonomy fields with our expanded library (dedupe by key)
  const mergedSpecFields = useMemo(() => {
    const base = getSpecFields(department, category, subCategory) as Array<[string, any]>;

    // Choose which extra library to merge based on department
    const extraLib: Record<string, SpecDef> =
      department === "watch" ? { ...COMMON_SPECS, ...WATCH_SPECS } : COMMON_SPECS;

    // Start with taxonomy fields, then add any extras not already present
    const seen = new Set(base.map(([k]) => k));
    const extras: Array<[string, SpecDef]> = Object.entries(extraLib).filter(
      ([k]) => !seen.has(k)
    );

    // Convert taxonomy shape to our SpecDef where possible (fallbacks to text)
    const normalize = (def: any): SpecDef => {
      if (!def || typeof def !== "object") return { type: "text" };
      if (def.type === "select" && Array.isArray(def.options))
        return { type: "select", options: def.options as StringTuple, label: def.label };
      if (def.type === "number")
        return { type: "number", step: def.step ?? 1, unit: def.unit, label: def.label };
      if (def.type === "boolean") return { type: "boolean", label: def.label };
      return { type: "text", label: def.label };
    };

    const normalizedBase: Array<[string, SpecDef]> = base.map(
      ([k, def]: [string, any]) => [k, normalize(def)]
    );

    return [...normalizedBase, ...extras];
  }, [department, category, subCategory]);

  // prune specs when the field set changes
  useEffect(() => {
    setSpecs((prev) => {
      const allowed = new Set(mergedSpecFields.map(([k]) => k));
      const next: Specs = {};
      for (const [k, v] of Object.entries(prev || {})) {
        if (allowed.has(k)) next[k] = v;
      }
      return next;
    });
  }, [mergedSpecFields]);

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

  function setSpec(key: string, value: any) {
    setSpecs((prev) => ({ ...(prev || {}), [key]: value }));
  }

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

  function buildFormData() {
    const imageList = images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const fd = new FormData();
    fd.append("title", title);
    fd.append("name", title); // API compat
    fd.append("department", department);
    if (category) fd.append("category", category);
    if (subCategory) {
      fd.append("subCategory", subCategory);
      fd.append("subcategory", subCategory);
    }
    fd.append("unitPrice", String(toNum(unitPrice)));
    fd.append("price", String(toNum(unitPrice)));
    if (description) fd.append("description", description);

    // arrays/objects
    fd.append("audience", JSON.stringify(audience.length ? audience : ["unisex"]));
    if (Object.keys(specs || {}).length) {
      fd.append("specs", JSON.stringify(specs));
    }

    // existing URL images (kept for back-compat)
    if (imageList.length) {
      fd.append("images", JSON.stringify(imageList));
      fd.append("imageUrls", JSON.stringify(imageList));
    }

    // file upload (cover image)
    if (imageFile) {
      fd.append("image", imageFile);
    }

    // remove current image flag (edit)
    if (mode === "edit") {
      fd.append("imageRemoved", imageRemoved ? "true" : "false");
    }
    return fd;
  }

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
      const body = buildFormData();
      const res = await fetch(endpoint, { method, body });
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
                className={`px-3 py-1 rounded-full text-sm border ${active ? "bg-blue-600 text-white" : "bg-[var(--bg-nav)]"}`}
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

      {/* Specifications (merged & optional) */}
      {mergedSpecFields.length > 0 && (
        <div>
          <label className="block text-sm opacity-80 mb-2">Specifications</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mergedSpecFields.map(([key, def]) => {
              const v = (specs || {})[key] ?? "";

              if (def.type === "select") {
                return (
                  <div key={key}>
                    <label className="block text-xs opacity-75 mb-1">
                      {def.label || key}
                    </label>
                    <select
                      value={String(v)}
                      onChange={(e) => setSpec(key, e.target.value)}
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
                  <label className="block text-xs opacity-75 mb-1">
                    {def.label || key}
                  </label>
                  <input
                    value={String(v)}
                    onChange={(e) => setSpec(key, e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs opacity-60 mt-2">
            Tip: leave any field blank to skip it — nothing here is required.
          </p>
        </div>
      )}

      {/* Upload + preview */}
      <div className="grid grid-cols-1 md:grid-cols-[160px,1fr] gap-4 items-start">
        <div className="w-40 h-40 bg-gray-500/40 rounded flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <img src={previewUrl} alt="Selected preview" className="w-full h-full object-cover" />
          ) : existingImage && !imageRemoved ? (
            <img src={existingImage} alt="Current product" className="w-full h-full object-cover" />
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

      {/* Images (URLs) for back-compat */}
      <div>
        <label className="block text-sm opacity-80 mb-1">Images (one URL per line)</label>
        <textarea
          value={images}
          onChange={(e) => setImages(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded bg-[var(--bg-nav)] text-white"
          placeholder={`https://.../image1.jpg
https://.../image2.jpg`}
        />
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
        {saving ? "Saving…" : mode === "create" ? "Add Product" : "Save Changes"}
      </button>
    </form>
  );
}
