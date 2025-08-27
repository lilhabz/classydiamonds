// 📄 pages/admin/products.tsx – Admin Product Management with Uploads, Previews, and Specifications (no tags)
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";

import {
  Category,
  CATEGORY_LABELS,
  JEWELRY_CATEGORIES,
  WATCHES_CATEGORY,
  subcategoryOptionsFor,
  NONE_OPTION,
  CUSTOM_OPTION,
  isWatch,
  isJewelry,
} from "@/data/taxonomy";

type Specs = Record<string, string>;

const prettyLabel = (s: string) => {
  if (!s) return "";
  if (s === NONE_OPTION || s === CUSTOM_OPTION) return s;
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

interface AdminProduct {
  _id: string;
  skuNumber?: number;
  name: string;
  slug?: string;
  description: string;
  price: number;
  salePrice?: number;
  category: Category;
  subcategory?: string;
  subCategory?: string;
  imageUrl?: string;
  images?: string[];
  featured: boolean;
  gender?: "unisex" | "him" | "her";
  department?: "jewelry" | "watch";
  specs?: Specs;
}

// ---------- SSR: fetch normalized (same as storefront) ----------
export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.isAdmin) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const { listProducts } = await import("@/lib/products");
  const raw = await listProducts({}, { sort: { createdAt: -1 }, limit: 500 });

  const initialProducts: AdminProduct[] = raw.map((p: any) => ({
    _id: String(p._id),
    skuNumber: p.skuNumber ?? undefined,
    name: p.name ?? p.title ?? "",
    slug: p.slug ?? undefined,
    description: p.description ?? "",
    price: Number(p.price ?? p.unitPrice ?? 0),
    salePrice: p.salePrice ?? undefined,
    category: p.category,
    subcategory: p.subCategory ?? p.subcategory ?? undefined,
    subCategory: p.subCategory ?? p.subcategory ?? undefined,
    imageUrl:
      Array.isArray(p.images) && p.images.length
        ? p.images[0]
        : p.imageUrl ?? "",
    images: Array.isArray(p.images) ? p.images : [],
    featured: Boolean(p.featured),
    gender:
      p.audience && p.audience[0]
        ? (p.audience[0] as any)
        : p.gender ?? "unisex",
    department: p.department ?? "jewelry",
    specs: p.specs && typeof p.specs === "object" ? p.specs : {},
  }));

  return { props: { initialProducts } };
}

// -------- Small in-file Specs editor helpers --------
type SpecEntry = { key: string; value: string };
const objectToEntries = (obj: Specs | undefined): SpecEntry[] =>
  obj
    ? Object.entries(obj).map(([key, value]) => ({
        key,
        value: String(value ?? ""),
      }))
    : [];
const entriesToObject = (rows: SpecEntry[]): Specs =>
  rows
    .filter((r) => r.key.trim())
    .reduce<Specs>((acc, r) => {
      acc[r.key.trim()] = r.value ?? "";
      return acc;
    }, {});

export default function AdminProductsPage({
  initialProducts,
}: {
  initialProducts: AdminProduct[];
}) {
  const [catalogView, setCatalogView] = useState<"jewelry" | "watches">(
    "jewelry"
  );

  const [products, setProducts] = useState<AdminProduct[]>(
    () => initialProducts || []
  );
  const [loadingList] = useState(false);

  const [rowEdits, setRowEdits] = useState<
    Record<string, { featured: boolean }>
  >(() => {
    const init: Record<string, { featured: boolean }> = {};
    (initialProducts || []).forEach(
      (p) => (init[p._id] = { featured: p.featured })
    );
    return init;
  });

  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(
    null
  );
  const editFormRef = useRef<HTMLFormElement | null>(null);

  // Previews + refs for file inputs
  const [addPreviewUrl, setAddPreviewUrl] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string>("");
  const addFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
  });

  // Toggle Add form
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Filters/sort
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{
    field: "category" | "gender" | "skuNumber";
    direction: "asc" | "desc";
  }>({ field: "skuNumber", direction: "asc" });

  const handleSort = (field: "category" | "gender" | "skuNumber") => {
    setSortConfig((s) =>
      s.field === field
        ? { field, direction: s.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" }
    );
  };

  // ADD form state (with specs + image)
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    category: (JEWELRY_CATEGORIES[0] as Category) || ("rings" as Category),
    subcategorySelect: NONE_OPTION,
    subcategoryCustom: "",
    featured: false,
    gender: "unisex" as "unisex" | "him" | "her",
    imageFile: null as File | null,
  });
  const [specRows, setSpecRows] = useState<SpecEntry[]>([]);

  // EDIT form state (with specs + image)
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    category: (JEWELRY_CATEGORIES[0] as Category) || ("rings" as Category),
    subcategorySelect: NONE_OPTION,
    subcategoryCustom: "",
    featured: false,
    gender: "unisex" as "unisex" | "him" | "her",
    imageFile: null as File | null,
    imageRemoved: false,
  });
  const [editSpecRows, setEditSpecRows] = useState<SpecEntry[]>([]);

  const allowedCategoriesForView = (view: "jewelry" | "watches"): Category[] =>
    view === "jewelry"
      ? (JEWELRY_CATEGORIES as unknown as Category[])
      : [WATCHES_CATEGORY];

  useEffect(() => {
    setFormState((s) => {
      const allowed = allowedCategoriesForView(catalogView);
      return allowed.includes(s.category)
        ? s
        : {
            ...s,
            category: allowed[0],
            subcategorySelect: NONE_OPTION,
            subcategoryCustom: "",
          };
    });
    setCategoryFilter("all");
  }, [catalogView]);

  useEffect(() => {
    if (editingProduct && editFormRef.current) {
      const headerOffset = 120;
      const top =
        editFormRef.current.getBoundingClientRect().top +
        window.pageYOffset -
        headerOffset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, [editingProduct]);

  const featuredCount = useMemo(
    () => Object.values(rowEdits).filter((e) => e.featured).length,
    [rowEdits]
  );

  const viewFiltered = useMemo(() => {
    return products.filter((p) => {
      const dept = (p as any).department;
      return catalogView === "jewelry"
        ? dept === "jewelry" || isJewelry(p.category)
        : dept === "watch" || isWatch(p.category);
    });
  }, [products, catalogView]);

  const filteredProducts = useMemo(() => {
    return viewFiltered.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter)
        return false;
      const g = p.gender ?? "unisex";
      if (genderFilter !== "all" && g !== genderFilter) return false;
      return true;
    });
  }, [viewFiltered, categoryFilter, genderFilter]);

  const sortedProducts = useMemo(() => {
    const data = [...filteredProducts];
    data.sort((a, b) => {
      const { field, direction } = sortConfig;
      let va: string | number = "";
      let vb: string | number = "";
      if (field === "gender") {
        va = a.gender ?? "unisex";
        vb = b.gender ?? "unisex";
      } else if (field === "category") {
        va = a.category;
        vb = b.category;
      } else if (field === "skuNumber") {
        va = a.skuNumber ?? 0;
        vb = b.skuNumber ?? 0;
      }
      if (va < vb) return direction === "asc" ? -1 : 1;
      if (va > vb) return direction === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [filteredProducts, sortConfig]);

  const hasSubcatsFor = (cat: Category) => {
    const opts = subcategoryOptionsFor(cat);
    return (
      opts.filter((o) => o !== NONE_OPTION && o !== CUSTOM_OPTION).length > 0
    );
  };

  const handleInput = (field: string, value: any) => {
    setFormState((s) => ({ ...s, [field]: value }));
  };

  useEffect(() => {
    setFormState((s) => ({
      ...s,
      subcategorySelect: NONE_OPTION,
      subcategoryCustom: "",
    }));
  }, [formState.category]);

  // Add preview blob
  useEffect(() => {
    if (formState.imageFile) {
      const url = URL.createObjectURL(formState.imageFile);
      setAddPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setAddPreviewUrl("");
  }, [formState.imageFile]);

  // Edit preview blob (only when new file is chosen)
  useEffect(() => {
    if (!editForm.imageFile) return;
    const url = URL.createObjectURL(editForm.imageFile);
    setPreviewImage(url);
    return () => URL.revokeObjectURL(url);
  }, [editForm.imageFile]);

  const resolveSubcategoryValue = (
    selectValue: string,
    customValue: string
  ) => {
    if (selectValue === NONE_OPTION) return "";
    if (selectValue === CUSTOM_OPTION) return (customValue || "").trim();
    return selectValue;
  };

  // ---------- ADD SUBMIT ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formState.featured && featuredCount >= 4) {
      setStatus({
        loading: false,
        error: "⚠️ You can only have up to 4 featured items.",
        success: "",
      });
      return;
    }

    setStatus({ loading: true, error: "", success: "" });

    try {
      const formData = new FormData();
      formData.append("name", formState.name);
      if (formState.description)
        formData.append("description", formState.description);
      formData.append("price", formState.price);
      if (formState.salePrice)
        formData.append("salePrice", formState.salePrice);
      formData.append("category", formState.category);
      formData.append(
        "subcategory",
        resolveSubcategoryValue(
          formState.subcategorySelect,
          formState.subcategoryCustom
        )
      );
      formData.append("featured", formState.featured ? "true" : "false");
      formData.append("gender", formState.gender);

      // 🔧 specs -> JSON string
      const specsObj = entriesToObject(specRows);
      if (Object.keys(specsObj).length > 0) {
        formData.append("specs", JSON.stringify(specsObj));
      }

      if (formState.imageFile) formData.append("image", formState.imageFile);

      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add product");

      const newProduct: AdminProduct = {
        ...data.product,
        subcategory: data.product.subcategory ?? data.product.subCategory,
        specs: data.product.specs ?? {},
      };

      setProducts((p) => [newProduct, ...p]);
      setRowEdits((e) => ({
        ...e,
        [newProduct._id]: { featured: newProduct.featured },
      }));

      const allowed = allowedCategoriesForView(catalogView);
      setFormState({
        name: "",
        description: "",
        price: "",
        salePrice: "",
        category: allowed[0],
        subcategorySelect: NONE_OPTION,
        subcategoryCustom: "",
        featured: false,
        gender: "unisex",
        imageFile: null,
      });
      setSpecRows([]);
      setAddPreviewUrl("");
      setStatus({ loading: false, error: "", success: "✅ Product added 🎉" });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  // ---------- OPEN EDIT ----------
  const handleEditClick = (product: AdminProduct) => {
    setEditingProduct(product);

    const opts = subcategoryOptionsFor(product.category).filter(
      (o) => o !== NONE_OPTION && o !== CUSTOM_OPTION
    );

    const currentSub = product.subcategory ?? product.subCategory ?? "";
    let subcategorySelect = NONE_OPTION;
    let subcategoryCustom = "";
    if (currentSub && currentSub.trim()) {
      if (opts.includes(currentSub)) {
        subcategorySelect = currentSub;
      } else {
        subcategorySelect = CUSTOM_OPTION;
        subcategoryCustom = currentSub;
      }
    }

    setEditForm({
      name: product.name,
      description: product.description || "",
      price: (product.price ?? 0).toString(),
      salePrice: product.salePrice?.toString() || "",
      category: product.category,
      subcategorySelect,
      subcategoryCustom,
      featured: product.featured,
      gender: product.gender ?? "unisex",
      imageFile: null,
      imageRemoved: false,
    });

    // seed specs editor
    setEditSpecRows(objectToEntries(product.specs));

    // show current image (until replaced)
    setPreviewImage(
      product.imageUrl ||
        (Array.isArray(product.images) ? product.images[0] : "") ||
        ""
    );

    setTimeout(() => {
      editFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // Reset subcategory when Edit category changes
  useEffect(() => {
    if (!editingProduct) return;
    setEditForm((f) => ({
      ...f,
      subcategorySelect: NONE_OPTION,
      subcategoryCustom: "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.category]);

  const editAllowedCats: Category[] = useMemo(() => {
    if (!editingProduct) return allowedCategoriesForView(catalogView);
    const base = new Set<Category>(allowedCategoriesForView(catalogView));
    base.add(editingProduct.category);
    return Array.from(base);
  }, [catalogView, editingProduct]);

  // ---------- SAVE EDIT ----------
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editForm.featured && featuredCount >= 4 && !editingProduct?.featured) {
      setStatus({
        loading: false,
        error: "⚠️ You can only have up to 4 featured items.",
        success: "",
      });
      return;
    }

    setStatus({ loading: true, error: "", success: "" });

    try {
      const formData = new FormData();
      formData.append("name", editForm.name);
      if (editForm.description)
        formData.append("description", editForm.description);
      formData.append("price", editForm.price);
      if (editForm.salePrice) formData.append("salePrice", editForm.salePrice);
      formData.append("category", editForm.category);
      formData.append(
        "subcategory",
        resolveSubcategoryValue(
          editForm.subcategorySelect,
          editForm.subcategoryCustom
        )
      );
      formData.append("featured", editForm.featured ? "true" : "false");
      formData.append("gender", editForm.gender);
      formData.append("imageRemoved", editForm.imageRemoved ? "true" : "false");

      const specsObj = entriesToObject(editSpecRows);
      if (Object.keys(specsObj).length > 0) {
        formData.append("specs", JSON.stringify(specsObj));
      } else {
        // send empty to clear?
        formData.append("specs", JSON.stringify({}));
      }

      if (editForm.imageFile) formData.append("image", editForm.imageFile);

      const res = await fetch(`/api/admin/products/${editingProduct!._id}`, {
        method: "PUT",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product");

      const updated: AdminProduct = {
        ...data.product,
        subcategory: data.product.subcategory ?? data.product.subCategory,
        specs: data.product.specs ?? {},
      };

      setProducts((p) =>
        p.map((prod) => (prod._id === updated._id ? updated : prod))
      );
      setRowEdits((r) => ({
        ...r,
        [updated._id]: { featured: updated.featured },
      }));

      setEditingProduct(null);
      setPreviewImage("");
      setEditSpecRows([]);
      setStatus({
        loading: false,
        error: "",
        success: "✅ Product updated 🎉",
      });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  // ---------- BATCH SAVE FEATURED ----------
  const handleSaveAll = async () => {
    if (featuredCount > 4) {
      setStatus({
        loading: false,
        error: "⚠️ You can only have up to 4 featured items. Uncheck extras.",
        success: "",
      });
      return;
    }

    setStatus({ loading: true, error: "", success: "" });
    try {
      // If your PUT only supports multipart, skip batch or adapt to FormData.
      const updates = Object.entries(rowEdits).map(async ([id, edits]) => {
        const orig = products.find((p) => p._id === id);
        if (!orig) return null;
        if (orig.featured === edits.featured) return null;

        const res = await fetch(`/api/admin/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edits),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to save changes");
        return json.product as AdminProduct;
      });

      const results = await Promise.all(updates);
      setProducts((p) =>
        p.map((x) => {
          const updated = results.find((u) => u && u._id === x._id);
          return updated || x;
        })
      );
      setRowEdits((prev) => {
        const next = { ...prev };
        results.forEach((u) => {
          if (u) next[u._id] = { featured: u.featured };
        });
        return next;
      });
      setStatus({ loading: false, error: "", success: "All changes saved 💾" });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditForm({
      name: "",
      description: "",
      price: "",
      salePrice: "",
      category: (JEWELRY_CATEGORIES[0] as Category) || ("rings" as Category),
      subcategorySelect: NONE_OPTION,
      subcategoryCustom: "",
      featured: false,
      gender: "unisex",
      imageFile: null,
      imageRemoved: false,
    });
    setEditSpecRows([]);
    setPreviewImage("");
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Admin Products | Classy Diamonds</title>
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 mb-6 -mt-2">
        <Breadcrumbs />
      </div>

      <h1 className="text-3xl font-serif font-bold tracking-wide mb-6">
        🛠️ Admin Dashboard
      </h1>

      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
        <Link href="/admin" className="hover:text-yellow-300">
          📦 Orders
        </Link>
        <Link href={{ pathname: "/admin", query: { tab: "shipped" } }}>
          ✅ Shipped
        </Link>
        <Link href={{ pathname: "/admin", query: { tab: "delivered" } }}>
          📬 Delivered
        </Link>
        <Link href={{ pathname: "/admin", query: { tab: "archived" } }}>
          🗂 Archived
        </Link>

        <Link href="/admin/products" className="text-yellow-400">
          🛠 Products
        </Link>
        <Link href="/admin/custom-photos" className="hover:text-yellow-300">
          🖼 Custom
        </Link>
        <Link href="/admin/logs" className="hover:text-yellow-300">
          📝 Logs
        </Link>
      </nav>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toggle + Add button */}
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded overflow-hidden border">
            <button
              type="button"
              onClick={() => setCatalogView("jewelry")}
              className={`px-3 py-2 ${
                catalogView === "jewelry"
                  ? "bg-yellow-500 text-black"
                  : "bg-[var(--bg-nav)]"
              }`}
            >
              Jewelry
            </button>
            <button
              type="button"
              onClick={() => setCatalogView("watches")}
              className={`px-3 py-2 ${
                catalogView === "watches"
                  ? "bg-yellow-500 text-black"
                  : "bg-[var(--bg-nav)]"
              }`}
            >
              Watches
            </button>
          </div>

          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {showAddForm ? "Close Form" : "➕ Add New Product"}
          </button>
        </div>

        {/* Status */}
        {status.error && <p className="text-red-500">❌ {status.error}</p>}
        {status.success && (
          <p className="text-green-600">✅ {status.success}</p>
        )}

        {/* ---------- EDIT FORM ---------- */}
        {editingProduct && (
          <form
            ref={editFormRef}
            onSubmit={handleUpdate}
            style={{ scrollMarginTop: "120px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-6 rounded-lg bg-[var(--bg-nav)] shadow-lg"
          >
            <h3 className="col-span-full text-xl font-bold text-yellow-400 mb-2">
              ✏️ Editing: {editingProduct.name} (Item Number{" "}
              {String(editingProduct.skuNumber ?? 0).padStart(5, "0")})
            </h3>

            {/* Image preview + visible picker */}
            <div className="col-span-full flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-40 h-40 bg-gray-500/40 rounded flex items-center justify-center overflow-hidden">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={editForm.name || "Product Image"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs opacity-80">No Image</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {/* Visible file input */}
                <label className="text-sm font-medium">
                  Product Photo
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        imageFile: e.target.files?.[0] || null,
                        imageRemoved: false,
                      }))
                    }
                    className="mt-1 block w-72 text-sm file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-[var(--bg-page)] text-[var(--foreground)] border rounded p-1"
                  />
                </label>

                {/* Optional button for users who prefer clicking a button */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    🖼 Upload / Replace Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm((f) => ({
                        ...f,
                        imageFile: null,
                        imageRemoved: true,
                      }));
                      setPreviewImage("");
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    🗑 Remove Image
                  </button>
                </div>
              </div>
            </div>

            {/* Fields */}
            <label>
              📦 Name
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label>
              📝 Description
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label>
              💲 Price (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={editForm.price}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, price: e.target.value }))
                }
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label>
              🔖 Sale Price (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.salePrice}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, salePrice: e.target.value }))
                }
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label>
              📂 Category
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    category: e.target.value as Category,
                    subcategorySelect: NONE_OPTION,
                    subcategoryCustom: "",
                  }))
                }
                className="mt-1 w-full border rounded p-2 bg-[var(--bg-page)] text-[var(--foreground)]"
              >
                {(() => {
                  const allowed = new Set<Category>(
                    allowedCategoriesForView(catalogView)
                  );
                  if (editingProduct) allowed.add(editingProduct.category);
                  return Array.from(allowed).map((cat) => (
                    <option key={cat} value={cat}>
                      {prettyLabel(CATEGORY_LABELS[cat])}
                    </option>
                  ));
                })()}
              </select>
            </label>

            {hasSubcatsFor(editForm.category) && (
              <>
                <label>
                  🔽 Subcategory
                  <select
                    value={editForm.subcategorySelect}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        subcategorySelect: e.target.value,
                        subcategoryCustom:
                          e.target.value === CUSTOM_OPTION
                            ? f.subcategoryCustom
                            : "",
                      }))
                    }
                    className="mt-1 w-full border rounded p-2 bg-[var(--bg-page)] text-[var(--foreground)]"
                  >
                    {subcategoryOptionsFor(editForm.category).map((opt) => (
                      <option key={opt} value={opt}>
                        {prettyLabel(opt)}
                      </option>
                    ))}
                  </select>
                </label>

                {editForm.subcategorySelect === CUSTOM_OPTION && (
                  <label className="md:col-span-2">
                    📝 Custom Subcategory
                    <input
                      type="text"
                      placeholder="e.g., engagement-rings, tennis-bracelets"
                      value={editForm.subcategoryCustom}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          subcategoryCustom: e.target.value,
                        }))
                      }
                      className="mt-1 w-full border rounded p-2"
                    />
                  </label>
                )}
              </>
            )}

            <label>
              🏷️ Gender
              <select
                value={editForm.gender}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    gender: e.target.value as "unisex" | "him" | "her",
                  }))
                }
                className="mt-1 w-full border rounded p-2 bg-[var(--bg-page)] text-[var(--foreground)]"
              >
                {[
                  { v: "unisex", label: "Unisex" },
                  { v: "him", label: "For Him" },
                  { v: "her", label: "For Her" },
                ].map((g) => (
                  <option key={g.v} value={g.v}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>

            {/* SPECS EDITOR (Edit) */}
            <div className="md:col-span-2 border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Specifications</h4>
                <button
                  type="button"
                  onClick={() =>
                    setEditSpecRows((rows) => [...rows, { key: "", value: "" }])
                  }
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Row
                </button>
              </div>

              <div className="space-y-2">
                {editSpecRows.length === 0 && (
                  <p className="text-sm opacity-70">
                    No specifications yet. Add rows like: Metal = 14k Gold,
                    Stone = Diamond, etc.
                  </p>
                )}

                {editSpecRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      className="col-span-5 border rounded p-2"
                      placeholder="Key (e.g., metal)"
                      value={row.key}
                      onChange={(e) =>
                        setEditSpecRows((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, key: e.target.value } : r
                          )
                        )
                      }
                    />
                    <input
                      className="col-span-6 border rounded p-2"
                      placeholder="Value (e.g., 14k gold)"
                      value={row.value}
                      onChange={(e) =>
                        setEditSpecRows((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, value: e.target.value } : r
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditSpecRows((rows) =>
                          rows.filter((_, i) => i !== idx)
                        )
                      }
                      className="col-span-1 px-2 bg-red-600 text-white rounded"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured & Actions */}
            <label className="flex items-center space-x-2">
              <span>✨ Featured</span>
              <input
                type="checkbox"
                checked={editForm.featured}
                disabled={featuredCount >= 4 && !editForm.featured}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, featured: e.target.checked }))
                }
                className="mt-2"
              />
              {featuredCount >= 4 && !editForm.featured && (
                <span className="text-yellow-400 text-sm">
                  ⚠️ Max 4 featured reached
                </span>
              )}
            </label>

            <div className="col-span-full flex gap-2">
              <button
                type="submit"
                disabled={status.loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {status.loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ---------- ADD FORM (collapsible) ---------- */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            showAddForm
              ? "max-h-[2000px] opacity-100 mt-4"
              : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-[var(--bg-nav)]"
          >
            <label>
              📦 Name
              <input
                type="text"
                required
                value={formState.name}
                onChange={(e) => handleInput("name", e.target.value)}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label>
              📝 Description
              <textarea
                value={formState.description}
                onChange={(e) => handleInput("description", e.target.value)}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label>
              💲 Price (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formState.price}
                onChange={(e) => handleInput("price", e.target.value)}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label>
              🔖 Sale Price (USD)
              <input
                type="number"
                min="0"
                step="0.01"
                value={formState.salePrice}
                onChange={(e) => handleInput("salePrice", e.target.value)}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            <label>
              📂 Category
              <select
                value={formState.category}
                onChange={(e) =>
                  handleInput("category", e.target.value as Category)
                }
                className="mt-1 w-full border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
              >
                {allowedCategoriesForView(catalogView).map((cat) => (
                  <option key={cat} value={cat}>
                    {prettyLabel(CATEGORY_LABELS[cat])}
                  </option>
                ))}
              </select>
            </label>

            {hasSubcatsFor(formState.category) && (
              <>
                <label>
                  🔽 Subcategory
                  <select
                    value={formState.subcategorySelect}
                    onChange={(e) =>
                      handleInput("subcategorySelect", e.target.value)
                    }
                    className="mt-1 w-full border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
                  >
                    {subcategoryOptionsFor(formState.category).map((opt) => (
                      <option key={opt} value={opt}>
                        {prettyLabel(opt)}
                      </option>
                    ))}
                  </select>
                </label>

                {formState.subcategorySelect === CUSTOM_OPTION && (
                  <label className="md:col-span-2">
                    📝 Custom Subcategory
                    <input
                      type="text"
                      placeholder="e.g., engagement-rings, tennis-bracelets"
                      value={formState.subcategoryCustom}
                      onChange={(e) =>
                        handleInput("subcategoryCustom", e.target.value)
                      }
                      className="mt-1 w-full border rounded p-2"
                    />
                  </label>
                )}
              </>
            )}

            <label>
              🏷️ Gender
              <select
                value={formState.gender}
                onChange={(e) => handleInput("gender", e.target.value)}
                className="mt-1 w-full border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
              >
                {[
                  { v: "unisex", label: "Unisex" },
                  { v: "him", label: "For Him" },
                  { v: "her", label: "For Her" },
                ].map((g) => (
                  <option key={g.v} value={g.v}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>

            {/* SPECS EDITOR (Add) */}
            <div className="md:col-span-2 border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Specifications</h4>
                <button
                  type="button"
                  onClick={() =>
                    setSpecRows((rows) => [...rows, { key: "", value: "" }])
                  }
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Row
                </button>
              </div>

              <div className="space-y-2">
                {specRows.length === 0 && (
                  <p className="text-sm opacity-70">
                    Add rows like: Metal = 14k Gold, Stone = Diamond, Length =
                    18&quot;.
                  </p>
                )}

                {specRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      className="col-span-5 border rounded p-2"
                      placeholder="Key (e.g., metal)"
                      value={row.key}
                      onChange={(e) =>
                        setSpecRows((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, key: e.target.value } : r
                          )
                        )
                      }
                    />
                    <input
                      className="col-span-6 border rounded p-2"
                      placeholder="Value (e.g., 14k gold)"
                      value={row.value}
                      onChange={(e) =>
                        setSpecRows((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, value: e.target.value } : r
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSpecRows((rows) => rows.filter((_, i) => i !== idx))
                      }
                      className="col-span-1 px-2 bg-red-600 text-white rounded"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload + Preview (Add) */}
            <div className="md:col-span-2 flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-36 h-36 bg-gray-500/40 rounded flex items-center justify-center overflow-hidden">
                {addPreviewUrl ? (
                  <img
                    src={addPreviewUrl}
                    alt="Selected preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-white/80">No Image Selected</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {/* Visible file input */}
                <label className="text-sm font-medium">
                  Product Photo
                  <input
                    ref={addFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleInput("imageFile", e.target.files?.[0] ?? null)
                    }
                    className="mt-1 block w-72 text-sm file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer bg-[var(--bg-page)] text-[var(--foreground)] border rounded p-1"
                  />
                </label>

                {/* Optional button as well */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    🖼 Upload Photo
                  </button>

                  {addPreviewUrl && (
                    <button
                      type="button"
                      onClick={() => handleInput("imageFile", null)}
                      className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Clear Selected Image
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status.loading}
              className="md:col-span-2 bg-blue-600 text-white rounded py-2 hover:bg-blue-700"
            >
              {status.loading ? "Saving..." : "Add Product"}
            </button>
          </form>
        </div>

        {/* ---------- TABLE ---------- */}
        <h2 className="text-xl font-semibold mt-8">🗂️ Current Products</h2>

        {loadingList ? (
          <p>Loading...</p>
        ) : (
          <>
            {featuredCount > 4 && (
              <p className="text-yellow-500 mb-2">
                ⚠️ You have selected more than 4 featured items. Please uncheck
                extras.
              </p>
            )}

            <div className="w-full">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-nav)] text-left align-top">
                    <th
                      className="p-2 cursor-pointer"
                      onClick={() => handleSort("skuNumber")}
                    >
                      Item Number
                    </th>
                    <th className="p-2">Image</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">
                      <div className="flex items-center justify-between">
                        <span>Category</span>
                        <button
                          type="button"
                          onClick={() => handleSort("category")}
                        >
                          ↕
                        </button>
                      </div>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="mt-1 w-full border rounded p-1 bg-[var(--bg-nav)] text-[var(--foreground)]"
                      >
                        <option value="all">All</option>
                        {allowedCategoriesForView(catalogView).map((c) => (
                          <option key={c} value={c}>
                            {prettyLabel(CATEGORY_LABELS[c])}
                          </option>
                        ))}
                      </select>
                    </th>
                    <th className="p-2">Subcategory</th>
                    <th className="p-2">
                      <div className="flex items-center justify-between">
                        <span>Gender</span>
                        <button
                          type="button"
                          onClick={() => handleSort("gender")}
                        >
                          ↕
                        </button>
                      </div>
                      <select
                        value={genderFilter}
                        onChange={(e) => setGenderFilter(e.target.value)}
                        className="mt-1 w-full border rounded p-1 bg-[var(--bg-nav)] text-[var(--foreground)]"
                      >
                        <option value="all">All</option>
                        <option value="him">For Him</option>
                        <option value="her">For Her</option>
                        <option value="unisex">Unisex</option>
                      </select>
                    </th>
                    <th className="p-2">Featured</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map((p) => {
                    const edit = rowEdits[p._id];
                    const displayImage =
                      p.imageUrl ||
                      (Array.isArray(p.images) && p.images.length
                        ? p.images[0]
                        : "");

                    return (
                      <tr key={p._id} className="border-t align-top">
                        <td className="p-2 whitespace-normal break-words">
                          {(p.skuNumber ?? 0).toString().padStart(5, "0")}
                        </td>

                        <td className="p-2 w-24 h-24">
                          <div className="w-24 h-24 bg-gray-500/40 rounded overflow-hidden flex items-center justify-center">
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs opacity-70">
                                No Image
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-2 whitespace-normal break-words">
                          {p.slug ? (
                            <Link
                              href={`/category/${p.category}/${p.slug}`}
                              className="hover:text-yellow-300 underline"
                            >
                              {p.name}
                            </Link>
                          ) : (
                            <span className="opacity-80">{p.name}</span>
                          )}
                        </td>

                        <td className="p-2 capitalize whitespace-normal break-words">
                          {prettyLabel(CATEGORY_LABELS[p.category])}
                        </td>
                        <td className="p-2 whitespace-normal break-words">
                          {p.subcategory
                            ? prettyLabel(p.subcategory)
                            : p.subCategory
                            ? prettyLabel(p.subCategory)
                            : "—"}
                        </td>
                        <td className="p-2 whitespace-normal break-words">
                          {p.gender ? prettyLabel(p.gender) : "Unisex"}
                        </td>

                        <td className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={edit?.featured ?? false}
                            disabled={!edit?.featured && featuredCount >= 4}
                            onChange={(e) =>
                              setRowEdits((r) => ({
                                ...r,
                                [p._id]: {
                                  ...r[p._id],
                                  featured: e.target.checked,
                                },
                              }))
                            }
                          />
                        </td>

                        <td className="p-2 space-x-2">
                          <button
                            onClick={() => handleEditClick(p)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm("Delete this product?")) return;
                              fetch(`/api/admin/products/${p._id}`, {
                                method: "DELETE",
                              }).then((r) => {
                                if (r.ok) {
                                  setProducts((prev) =>
                                    prev.filter((x) => x._id !== p._id)
                                  );
                                  setRowEdits((r2) => {
                                    const next = { ...r2 };
                                    delete next[p._id];
                                    return next;
                                  });
                                  setStatus({
                                    loading: false,
                                    error: "",
                                    success: "Product deleted 🗑️",
                                  });
                                }
                              });
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Save-all */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSaveAll}
            disabled={status.loading}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {status.loading ? "Saving..." : "Save All Changes 💾"}
          </button>
        </div>
      </div>
    </div>
  );
}
