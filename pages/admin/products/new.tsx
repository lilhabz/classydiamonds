// /pages/admin/products/new.tsx
import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { DEPARTMENTS, getCategories, getSubCategories } from "@/lib/taxonomy";

type Department = "jewelry" | "watch";

type SpecField = { key: string; label: string; placeholder?: string };

export default function NewProductPage() {
  const { data: session, status } = useSession();

  const [dept, setDept] = useState<Department>("jewelry");
  const [category, setCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState<string>("");
  const [salePrice, setSalePrice] = useState<string>("");
  const [description, setDescription] = useState("");

  // 🆕 Stock
  const [inStock, setInStock] = useState<boolean>(true);

  // 🆕 Featured flag (added)
  const [featured, setFeatured] = useState<boolean>(false);

  // Audience bubbles
  const [audience, setAudience] = useState<string>("unisex");

  // Upload-only with preview (preview box ABOVE button)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const previewSrc = imageFile
    ? URL.createObjectURL(imageFile)
    : "/gray-placeholder.jpg";

  const [statusMsg, setStatusMsg] = useState<{ ok?: boolean; text?: string }>(
    {}
  );

  useEffect(() => {
    setCategory(getCategories(dept)[0] ?? "");
    setSubcategory("");
  }, [dept]);

  // -------- Dropdown option sets (used by some spec fields) --------
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
  // Watch-ish:
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

  // -------- Spec field definitions (what to show) --------
  const specFieldsFor = (d: Department, cat: string): SpecField[] => {
    const c = (cat || "").toLowerCase();
    const baseJewelry: SpecField[] = [
      { key: "metal", label: "Metal", placeholder: "" },
      { key: "stone", label: "Stone", placeholder: "" },
      { key: "carat", label: "Carat", placeholder: "e.g., 1.20 ct" },
      { key: "color", label: "Color", placeholder: "" },
      { key: "clarity", label: "Clarity", placeholder: "" },
      { key: "cut", label: "Cut", placeholder: "" },
      { key: "shape", label: "Shape", placeholder: "" },
      { key: "size", label: "Size", placeholder: "e.g., 18 in / 7 in" },
      { key: "width", label: "Width", placeholder: "e.g., 2.0 mm" },
      { key: "length", label: "Length", placeholder: "e.g., 45 mm" },
      { key: "weight", label: "Weight", placeholder: "e.g., 3.8 g" },
      { key: "setting", label: "Setting", placeholder: "e.g., Prong" },
      { key: "style", label: "Style", placeholder: "" },
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
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  useEffect(() => {
    setSpecValues((prev) => {
      const next: Record<string, string> = {};
      for (const f of specFields) next[f.key] = prev[f.key] ?? "";
      return next;
    });
  }, [specFields]);

  // Decide if a spec key gets a dropdown and which options to use
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

  // ---------- Upload image ----------
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

  // ---------- Submit ----------
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setStatusMsg({ ok: undefined, text: "Saving…" });

      let finalImageUrl: string | null = "/gray-placeholder.jpg";
      if (imageFile) finalImageUrl = await uploadImage();

      const specs: Record<string, string> = {};
      for (const f of specFields) {
        const v = (specValues[f.key] ?? "").trim();
        if (v !== "") specs[f.key] = v;
      }

      const body = {
        name,
        description,
        price: price.trim() === "" ? null : Number(price),
        salePrice: salePrice.trim() === "" ? null : Number(salePrice),
        category: category || null,
        subcategory: subcategory || null,
        imageUrl: finalImageUrl,
        audience: [audience],
        specs,
        department: dept,
        // 🆕 Stock flag sent to API
        inStock,
        // 🆕 Featured flag sent to API
        featured,
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Create failed");

      setStatusMsg({ ok: true, text: "✅ Product created" });
      // reset (keep dept/category for speed)
      setName("");
      setPrice("");
      setSalePrice("");
      setDescription("");
      setSubcategory("");
      setImageFile(null);
      setSpecValues({});
      setInStock(true);
      setFeatured(false); // reset featured
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
            Flag to include in the curated home page “Featured” section. The API
            enforces a maximum of 4 featured products.
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

        {/* PREVIEW ABOVE button-looking upload */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium">Product Photo</label>
          <div className="mt-2 flex items-center gap-4">
            {/* Preview box (always visible) */}
            <img
              src={previewSrc}
              alt="Preview"
              className="w-32 h-32 object-cover rounded border"
            />

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
          </div>
        </div>

        {/* Specifications in a dropdown (smaller text). Some fields are selects with options. */}
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
                            // switch to blank so custom input below becomes active
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
                      {/* Custom value field when "Other…" or non-listed value */}
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
          Create
        </button>
      </form>
    </div>
  );
}
