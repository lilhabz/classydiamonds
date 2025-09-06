// /pages/admin/products/[id].tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DEPARTMENTS, getCategories, getSubCategories } from "@/lib/taxonomy";
// 🔎 Live product card preview
import ProductCard from "@/components/ProductCard";

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
  // 🆕 stock-ish fields that may exist server-side
  inStock?: boolean;
  stock?: boolean;
  quantity?: number;
  // 🆕 featured flag (added)
  featured?: boolean;
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

  // 🆕 Stock flag
  const [inStock, setInStock] = useState<boolean>(true);
  // 🆕 Featured flag
  const [featured, setFeatured] = useState<boolean>(false);

  const [audience, setAudience] = useState<string>("unisex");

  const [imageUrl, setImageUrl] = useState<string | null>(PLACEHOLDER);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [resetToPlaceholder, setResetToPlaceholder] = useState(false);

  // ✅ Live preview URL with safe cleanup (avoids memory leaks)
  const [previewSrc, setPreviewSrc] = useState<string | null>(PLACEHOLDER);
  useEffect(() => {
    // Prefer newly selected file (object URL); otherwise show current server URL (or placeholder)
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewSrc(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewSrc(imageUrl || PLACEHOLDER);
      // no cleanup needed for normal URLs
      return;
    }
  }, [imageFile, imageUrl]);

  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const hiddenSpecsRef = useRef<Record<string, string>>({});

  // ----- dropdown options (same as new.tsx) -----
  const METAL_OPTIONS = [
    "14k Yellow Gold",
    "14k White Gold",
    "14k Rose Gold",
    "18k Yellow Gold",
    "18k White Gold",
    "18k Rose Gold",
    "Platinum",
    "Sterling Silver",
    "Two-Tone",
    "Titanium",
    "Tungsten",
    "Stainless Steel",
  ];
  const STONE_OPTIONS = [
    "Diamond",
    "Lab Diamond",
    "Moissanite",
    "Sapphire",
    "Ruby",
    "Emerald",
    "Pearl",
    "Amethyst",
    "Aquamarine",
    "Morganite",
    "Topaz",
    "Garnet",
    "Opal",
    "Tanzanite",
    "Citrine",
    "Peridot",
    "No Stone",
  ];
  const COLOR_OPTIONS = [
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O–Z",
  ];
  const CLARITY_OPTIONS = [
    "FL",
    "IF",
    "VVS1",
    "VVS2",
    "VS1",
    "VS2",
    "SI1",
    "SI2",
    "I1",
    "I2",
  ];
  const CUT_OPTIONS = ["Excellent", "Very Good", "Good", "Fair"];
  const SHAPE_OPTIONS = [
    "Round",
    "Oval",
    "Cushion",
    "Princess",
    "Emerald",
    "Radiant",
    "Pear",
    "Marquise",
    "Asscher",
    "Heart",
  ];
  const STYLE_OPTIONS = [
    "Solitaire",
    "Halo",
    "Three-Stone",
    "Tennis",
    "Hoop",
    "Stud",
    "Pendant",
    "Bypass",
    "Vintage",
    "Modern",
  ];
  const BACK_TYPE_OPTIONS = [
    "Screw Back",
    "Push Back",
    "Latch Back",
    "Lever Back",
    "Omega Back",
  ];
  const MOVEMENT_OPTIONS = ["Automatic", "Manual", "Quartz"];
  const CASE_MATERIAL_OPTIONS = [
    "Stainless Steel",
    "Gold",
    "Titanium",
    "Ceramic",
    "Two-Tone",
  ];
  const BAND_MATERIAL_OPTIONS = [
    "Stainless Steel",
    "Gold",
    "Leather",
    "Rubber",
    "NATO",
    "Two-Tone",
  ];
  const DIAL_COLOR_OPTIONS = [
    "Black",
    "White",
    "Blue",
    "Green",
    "Silver",
    "Champagne",
    "Mother of Pearl",
  ];
  const CRYSTAL_OPTIONS = ["Sapphire", "Mineral", "Acrylic"];
  const CONDITION_OPTIONS = [
    "New",
    "Like New",
    "Excellent",
    "Very Good",
    "Good",
    "Fair",
  ];
  const BOX_PAPERS_OPTIONS = ["Yes", "No"];

  function getDropdownOptionsForKey(key: string): string[] | null {
    switch (key) {
      case "metal":
        return METAL_OPTIONS;
      case "stone":
        return STONE_OPTIONS;
      case "color":
        return COLOR_OPTIONS;
      case "clarity":
        return CLARITY_OPTIONS;
      case "cut":
        return CUT_OPTIONS;
      case "shape":
        return SHAPE_OPTIONS;
      case "style":
        return STYLE_OPTIONS;
      case "back-type":
        return BACK_TYPE_OPTIONS;
      case "movement":
        return MOVEMENT_OPTIONS;
      case "case-material":
        return CASE_MATERIAL_OPTIONS;
      case "band-material":
        return BAND_MATERIAL_OPTIONS;
      case "dial-color":
        return DIAL_COLOR_OPTIONS;
      case "crystal":
        return CRYSTAL_OPTIONS;
      case "condition":
        return CONDITION_OPTIONS;
      case "box-papers":
        return BOX_PAPERS_OPTIONS;
      default:
        return null;
    }
  }

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

        // 🧠 Infer current stock
        const inferredInStock =
          typeof p.inStock === "boolean"
            ? p.inStock
            : typeof p.stock === "boolean"
            ? p.stock
            : typeof p.quantity === "number"
            ? p.quantity > 0
            : true;
        setInStock(inferredInStock);

        // 🆕 Load featured from server (default false)
        setFeatured(!!p.featured);

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

  // Spec fields (same as new.tsx)
  const specFieldsFor = (d: Department, cat: string): SpecField[] => {
    const c = (cat || "").toLowerCase();
    const baseJewelry: SpecField[] = [
      { key: "metal", label: "Metal" },
      { key: "stone", label: "Stone" },
      { key: "carat", label: "Carat", placeholder: "e.g., 1.20 ct" },
      { key: "color", label: "Color" },
      { key: "clarity", label: "Clarity" },
      { key: "cut", label: "Cut" },
      { key: "shape", label: "Shape" },
      { key: "size", label: "Size", placeholder: "e.g., 18 in / 7 in" },
      { key: "width", label: "Width", placeholder: "e.g., 2.0 mm" },
      { key: "length", label: "Length", placeholder: "e.g., 45 mm" },
      { key: "weight", label: "Weight", placeholder: "e.g., 3.8 g" },
      { key: "setting", label: "Setting", placeholder: "e.g., Prong" },
      { key: "style", label: "Style" },
      { key: "certificate", label: "Certificate", placeholder: "e.g., GIA" },
    ];
    const ringExtras: SpecField[] = [
      { key: "ring-size", label: "Ring Size", placeholder: "e.g., 6.5" },
      { key: "band-width", label: "Band Width", placeholder: "e.g., 2.0 mm" },
      { key: "stone-size", label: "Stone Size", placeholder: "e.g., 6.8 mm" },
    ];
    const braceletPreset: SpecField[] = [
      { key: "length", label: "Length" },
      { key: "metal", label: "Metal" },
      { key: "style", label: "Style" },
      { key: "weight", label: "Weight" },
      { key: "stone", label: "Stone" },
      { key: "carat", label: "Carat" },
      { key: "width", label: "Width" },
    ];
    const necklacePreset: SpecField[] = [
      { key: "length", label: "Length" },
      { key: "metal", label: "Metal" },
      { key: "style", label: "Style" },
      { key: "pendant", label: "Pendant" },
      { key: "stone", label: "Stone" },
      { key: "carat", label: "Carat" },
    ];
    const earringPreset: SpecField[] = [
      { key: "style", label: "Style" },
      { key: "back-type", label: "Back Type" },
      { key: "metal", label: "Metal" },
      { key: "stone", label: "Stone" },
      { key: "carat", label: "Carat" },
      { key: "length", label: "Length" },
      { key: "width", label: "Width" },
    ];
    const watchFields: SpecField[] = [
      { key: "brand", label: "Brand" },
      { key: "model", label: "Model" },
      { key: "movement", label: "Movement" },
      { key: "case-size", label: "Case Size", placeholder: "e.g., 36 mm" },
      { key: "case-material", label: "Case Material" },
      { key: "band-material", label: "Band Material" },
      { key: "dial-color", label: "Dial Color" },
      { key: "crystal", label: "Crystal" },
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
      { key: "condition", label: "Condition" },
      { key: "box-papers", label: "Box/Papers" },
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

      // merge visible + hidden (keep legacy)
      const visible: Record<string, string> = {};
      for (const f of specFields) {
        const v = (specValues[f.key] ?? "").trim();
        if (v !== "") visible[f.key] = v;
      }
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
        // 🆕 include stock
        inStock,
        // 🆕 include featured flag
        featured,
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

      // refresh inStock & featured from server response if present
      if (typeof p.inStock === "boolean") setInStock(p.inStock);
      if (typeof p.featured === "boolean") setFeatured(p.featured);

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

  // --------- Live preview props (derived from form state) ---------
  const slugPreview =
    name?.trim().toLowerCase().replace(/\s+/g, "-") || "preview";

  const pricePreview = Number.isFinite(parseFloat(price))
    ? parseFloat(price)
    : 0;

  const salePreview: number | undefined =
    salePrice && Number.isFinite(parseFloat(salePrice))
      ? parseFloat(salePrice)
      : undefined;

  const typePreview = subcategory || category || "";

  // --- Live labels for UI (used by <Head>, Breadcrumbs, header) ---
  const productId = id ? String(id) : "";
  const liveProductName = (name || "").trim();

  return (
    <div className="p-6 min-h-screen bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>
          {liveProductName
            ? `Edit: ${liveProductName} | Admin`
            : "Edit Product | Admin"}
        </title>
        <meta
          name="description"
          content={
            liveProductName
              ? `Editing product: ${liveProductName}`
              : "Edit a product in the admin dashboard."
          }
        />
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 -mt-2 mb-6">
        <Breadcrumbs
          customLabels={
            liveProductName && productId ? { [productId]: liveProductName } : {}
          }
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-serif font-bold">
          ✏️ Edit Product
          {liveProductName && (
            <span className="text-white/70"> — {liveProductName}</span>
          )}
        </h1>
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
          {/* Department & Categories */}
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

          {/* 🆕 Stock */}
          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="font-medium">In Stock</span>
            </label>
            <p className="text-xs opacity-70 mt-1">
              Uncheck to mark as out of stock (detail page will disable Add to
              Cart).
            </p>
          </div>

          {/* 🆕 Featured toggle (added) */}
          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="font-medium">Featured on Home</span>
            </label>
            <p className="text-xs opacity-70 mt-1">
              Flag to include in the curated home page “Featured” section. The
              API enforces a maximum of 4 featured products.
            </p>
          </div>

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

          {/* PREVIEW ABOVE button-looking upload + reset */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">Product Photo</label>
            <div className="mt-2 flex items-center gap-4">
              {/* 🔎 Live ProductCard preview (updates as you type/select) */}
              <div className="w-40">
                <ProductCard
                  slug={slugPreview}
                  image={previewSrc || null} // falls back to component placeholder if null
                  name={name || "Product Name"}
                  price={pricePreview}
                  salePrice={salePreview}
                  inStock={inStock}
                  typeLabel={typePreview}
                  stockLabel={inStock ? "In Stock" : "Out of Stock"}
                  interactive={false} // ⛔ make preview non-clickable
                />
              </div>

              {/* Button-looking upload */}
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
            </div>
          </div>

          {/* Specifications in <details>; some are dropdowns with options (and Other…) */}
          <details className="md:col-span-2 rounded border border-[var(--bg-nav)]">
            <summary className="cursor-pointer px-3 py-2 bg-[var(--bg-nav)]">
              Specifications
            </summary>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {specFields.map((f) => {
                const opts = getDropdownOptionsForKey(f.key);
                const val = specValues[f.key] ?? "";
                const isOther = opts && val && !opts.includes(val);

                return (
                  <div key={f.key} className="space-y-1">
                    <label className="block">{f.label}</label>
                    {opts ? (
                      <>
                        <select
                          value={isOther ? "OTHER" : val || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "OTHER") {
                              setSpecValues((s) => ({ ...s, [f.key]: "" }));
                            } else {
                              setSpecValues((s) => ({ ...s, [f.key]: v }));
                            }
                          }}
                          className="w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
                        >
                          <option value="">(select)</option>
                          {opts.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                          <option value="OTHER">Other…</option>
                        </select>
                        {(isOther || (val === "" && "OTHER" === "OTHER")) && (
                          <input
                            value={val}
                            onChange={(e) =>
                              setSpecValues((s) => ({
                                ...s,
                                [f.key]: e.target.value,
                              }))
                            }
                            placeholder={f.placeholder || "Custom"}
                            className="w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
                          />
                        )}
                      </>
                    ) : (
                      <input
                        value={val}
                        onChange={(e) =>
                          setSpecValues((s) => ({
                            ...s,
                            [f.key]: e.target.value,
                          }))
                        }
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2 rounded bg-[var(--bg-nav)]"
                      />
                    )}
                  </div>
                );
              })}
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
