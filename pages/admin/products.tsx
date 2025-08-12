// 📄 pages/admin/products.tsx – Admin Product Management with Batch Save, Image Previews, and Featured Limit 🛠️💾

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { getSession } from "next-auth/react";
import Image from "next/image";
import Head from "next/head";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";

// 🚀 Define allowed categories
type Category =
  | "engagement"
  | "wedding-bands"
  | "rings"
  | "bracelets"
  | "necklaces"
  | "earrings"
  | "watches";

const allCategories: Category[] = [
  "engagement",
  "wedding-bands",
  "rings",
  "bracelets",
  "necklaces",
  "earrings",
  "watches",
];

// 🛠️ AdminProduct type mirrors collection
interface AdminProduct {
  _id: string; // MongoDB ID
  skuNumber?: number; // sequential SKU
  name: string;
  slug?: string; // URL slug for product page (can be missing)
  description: string;
  price: number;
  salePrice?: number;
  category: Category;
  imageUrl?: string; // can be empty
  featured: boolean;
  gender?: "unisex" | "him" | "her";
  tags?: string[];
}

// 🛡️ Server-side guard: only admins
export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.isAdmin) {
    return { redirect: { destination: "/", permanent: false } };
  }
  return { props: {} };
}

export default function AdminProductsPage() {
  const router = useRouter();

  // 🔥 State: list of products from DB
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // 💾 Local edits tracked here before batch save
  const [rowEdits, setRowEdits] = useState<
    Record<string, { featured: boolean }>
  >({});

  // 🖼️ Local preview of current or replaced image (Edit form only)
  const [previewImage, setPreviewImage] = useState<string>("");

  // ✏️ Product currently being edited
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(
    null
  );

  // 📋 Separate form state for editing (with image support)
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    category: "engagement" as Category,
    featured: false,
    gender: "unisex" as "unisex" | "him" | "her",
    imageFile: null as File | null,
    imageRemoved: false,
  });

  // 📋 Form state for adding a new product (with preview)
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    category: "engagement" as Category,
    featured: false,
    gender: "unisex" as "unisex" | "him" | "her",
    imageFile: null as File | null,
  });

  // 🖼️ Live preview for Add form file selection (uses blob: URL)
  const [addPreviewUrl, setAddPreviewUrl] = useState<string>("");

  // 🎯 Status for operations
  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
  });

  // 🔘 Toggle for Add Product form visibility
  const [showAddForm, setShowAddForm] = useState(false);

  // 🔍 Filtering dropdown state
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

  // 📍 Ref to the edit form for scrolling
  const editFormRef = useRef<HTMLFormElement | null>(null);

  // 🚚 When a product is selected for editing, smoothly scroll the form into view
  useEffect(() => {
    if (editingProduct && editFormRef.current) {
      const headerOffset = 120; // offset for sticky admin header
      const formTop =
        editFormRef.current.getBoundingClientRect().top +
        window.pageYOffset -
        headerOffset;
      window.scrollTo({ top: formTop, behavior: "smooth" });
    }
  }, [editingProduct]);

  // 🧮 Count of featured items currently selected (from rowEdits)
  const featuredCount = Object.values(rowEdits).filter(
    (edit) => edit.featured
  ).length;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) {
        return false;
      }
      const g = p.gender ?? "unisex";
      if (genderFilter !== "all" && g !== genderFilter) {
        return false;
      }
      return true;
    });
  }, [products, categoryFilter, genderFilter]);

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

  // ==================== LOAD PRODUCTS ====================
  useEffect(() => {
    async function load() {
      setLoadingList(true);
      try {
        const res = await fetch("/api/admin/products");
        const data = await res.json();
        setProducts(data.products);
        // Initialize rowEdits from fetched data
        const edits: Record<string, { featured: boolean }> = {};
        (data.products as AdminProduct[]).forEach((p) => {
          edits[p._id] = { featured: p.featured };
        });
        setRowEdits(edits);
      } catch (err: any) {
        console.error("Failed to load products:", err);
      } finally {
        setLoadingList(false);
      }
    }
    load();
  }, []);

  // ==================== HANDLE NEW PRODUCT ====================
  const handleInput = (field: string, value: any) => {
    setFormState((s) => ({ ...s, [field]: value }));
  };

  // Create/destroy blob URL previews for the Add form file input
  useEffect(() => {
    if (formState.imageFile) {
      const url = URL.createObjectURL(formState.imageFile);
      setAddPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAddPreviewUrl("");
    }
  }, [formState.imageFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🚨 Prevent adding more than 4 featured items
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
      formData.append("description", formState.description);
      formData.append("price", formState.price);
      if (formState.salePrice)
        formData.append("salePrice", formState.salePrice);
      formData.append("category", formState.category);
      formData.append("featured", formState.featured ? "true" : "false");
      formData.append("gender", formState.gender);
      if (formState.imageFile) formData.append("image", formState.imageFile); // optional

      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add product");

      // Update products list
      setProducts((p) => [data.product, ...p]);

      // Keep rowEdits in sync for featured count & toggling
      setRowEdits((e) => ({
        ...e,
        [data.product._id]: { featured: data.product.featured },
      }));

      // Reset Add form
      setFormState({
        name: "",
        description: "",
        price: "",
        salePrice: "",
        category: "engagement",
        featured: false,
        gender: "unisex",
        imageFile: null,
      });
      setAddPreviewUrl(""); // clear preview
      setStatus({ loading: false, error: "", success: "✅ Product added 🎉" });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  // ==================== HANDLE EDIT PRODUCT ====================
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🚨 Prevent more than 4 featured items on edit (when toggling from false -> true)
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
      formData.append("description", editForm.description);
      formData.append("price", editForm.price);
      if (editForm.salePrice) formData.append("salePrice", editForm.salePrice);
      formData.append("category", editForm.category);
      formData.append("featured", editForm.featured ? "true" : "false");
      formData.append("gender", editForm.gender);
      formData.append("imageRemoved", editForm.imageRemoved ? "true" : "false");
      if (editForm.imageFile) formData.append("image", editForm.imageFile);

      const res = await fetch(`/api/admin/products/${editingProduct!._id}`, {
        method: "PUT",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update product");

      // Update local list
      setProducts((p) =>
        p.map((prod) => (prod._id === data.product._id ? data.product : prod))
      );

      // Keep rowEdits in sync (important for featuredCount)
      setRowEdits((r) => ({
        ...r,
        [data.product._id]: { featured: data.product.featured },
      }));

      setEditingProduct(null);
      setPreviewImage("");
      setStatus({
        loading: false,
        error: "",
        success: "✅ Product updated 🎉",
      });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  // ==================== BATCH SAVE ALL CHANGES ====================
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

      // Sync rowEdits with server truth after batch save
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

  // ==================== DELETE PRODUCT ====================
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setProducts((p) => p.filter((x) => x._id !== id));
      // Also remove from rowEdits
      setRowEdits((r) => {
        const newEdits = { ...r };
        delete newEdits[id];
        return newEdits;
      });
      setStatus({ loading: false, error: "", success: "Product deleted 🗑️" });
    }
  };

  // ==================== HANDLE EDIT CLICK ====================
  const handleEditClick = (product: AdminProduct) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      price: (product.price ?? 0).toString(),
      salePrice: product.salePrice?.toString() || "",
      category: product.category,
      featured: product.featured,
      gender: product.gender ?? "unisex",
      imageFile: null,
      imageRemoved: false,
    });

    // 🖼 Show current product image in preview
    setPreviewImage(product.imageUrl || "");

    // Smooth scroll to edit form
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  // ==================== CANCEL EDIT ====================
  const cancelEdit = () => {
    setEditingProduct(null);
    setEditForm({
      name: "",
      description: "",
      price: "",
      salePrice: "",
      category: "engagement",
      featured: false,
      gender: "unisex",
      imageFile: null,
      imageRemoved: false,
    });
    setPreviewImage("");
  };

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
        <Link href="/admin/completed" className="hover:text-yellow-300">
          ✅ Shipped
        </Link>
        <Link href="/admin/delivered" className="hover:text-yellow-300">
          📬 Delivered
        </Link>
        <Link href="/admin/archived" className="hover:text-yellow-300">
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

      <div className="max-w-6xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">🛠️ Manage Products</h2>

        {/* ➕ Add Product Toggle Button */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {showAddForm ? "Close Form" : "➕ Add New Product"}
          </button>
        </div>

        {/* ❗ Status Messages */}
        {status.error && <p className="text-red-500">❌ {status.error}</p>}
        {status.success && (
          <p className="text-green-600">✅ {status.success}</p>
        )}

        {/* ✏️ Edit Product Form */}
        {editingProduct && (
          <form
            ref={editFormRef}
            onSubmit={handleUpdate}
            style={{ scrollMarginTop: "120px" }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-6 rounded-lg bg-[var(--bg-nav)] shadow-lg"
          >
            <h3 className="col-span-full text-xl font-bold text-yellow-400 mb-2">
              ✏️ Editing: {editingProduct.name} (SKU{" "}
              {String(editingProduct.skuNumber ?? 0).padStart(5, "0")})
            </h3>

            {/* 🖼 Current Image Preview (Live) */}
            <div className="col-span-full flex flex-col items-center mb-2">
              {previewImage ? (
                <Image
                  src={previewImage}
                  alt={editForm.name || "Product Image"}
                  width={150}
                  height={150}
                  className="object-cover rounded shadow"
                />
              ) : (
                <div className="w-36 h-36 bg-gray-500/40 rounded flex items-center justify-center text-white text-sm">
                  No Image
                </div>
              )}
            </div>

            {/* 📂 Replace Image */}
            <label className="col-span-full">
              🖼 Replace Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    imageFile: e.target.files?.[0] || null,
                    imageRemoved: false,
                  }))
                }
                className="mt-1 w-full border rounded p-2 bg-[var(--bg-page)]"
              />
            </label>

            {/* ❌ Remove Image (clears preview; no external placeholder) */}
            <button
              type="button"
              onClick={() => {
                setEditForm((f) => ({
                  ...f,
                  imageFile: null,
                  imageRemoved: true,
                }));
                setPreviewImage(""); // clear preview
                setEditingProduct((prev) =>
                  prev ? { ...prev, imageUrl: "" } : prev
                );
              }}
              className="col-span-full mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              🗑 Remove Image
            </button>

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
                required
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
                  }))
                }
                className="mt-1 w-full border rounded p-2 bg-[var(--bg-page)] text-[var(--foreground)]"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

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

            <div className="col-span-full flex space-x-2">
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

        {/* 🆕 Add New Product Form (Animated Collapsible) */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            showAddForm
              ? "max-h-[1200px] opacity-100 mt-4"
              : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4 bg-[var(--bg-nav)]"
          >
            {/* 📦 Name */}
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

            {/* 📝 Description */}
            <label>
              📝 Description
              <textarea
                required
                value={formState.description}
                onChange={(e) => handleInput("description", e.target.value)}
                className="mt-1 w-full border rounded p-2"
              />
            </label>

            {/* 💲 Price */}
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

            {/* 🔖 Sale Price */}
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

            {/* 📂 Category */}
            <label>
              📂 Category
              <select
                value={formState.category}
                onChange={(e) => handleInput("category", e.target.value)}
                className="mt-1 w-full border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            {/* 🏷️ Gender */}
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

            {/* ✨ Featured */}
            <label className="flex items-center space-x-2">
              <span>✨ Featured</span>
              <input
                type="checkbox"
                checked={formState.featured}
                disabled={featuredCount >= 4}
                onChange={(e) => handleInput("featured", e.target.checked)}
                className="mt-2"
              />
              {featuredCount >= 4 && (
                <span className="text-yellow-400 text-sm">
                  ⚠️ Max 4 featured reached
                </span>
              )}
            </label>

            {/* 🖼️ Image (optional) + Live Preview */}
            <label className="col-span-full">
              🖼 Image (optional)
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleInput("imageFile", e.target.files?.[0] ?? null)
                }
                className="mt-1 w-full"
              />
            </label>

            {/* Live preview for Add form (uses <img> so blob: URLs work without config) */}
            <div className="col-span-full flex items-center gap-4">
              <div className="w-36 h-36 bg-gray-500/40 rounded flex items-center justify-center overflow-hidden">
                {addPreviewUrl ? (
                  <img
                    src={addPreviewUrl}
                    alt="Selected preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-white/80">
                    No Image Selected
                  </span>
                )}
              </div>
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

            {/* 💾 Submit */}
            <button
              type="submit"
              disabled={status.loading}
              className="col-span-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700"
            >
              {status.loading ? "Saving..." : "Add Product"}
            </button>
          </form>
        </div>

        {/* 🗂️ Existing Products Table */}
        <h2 className="text-xl font-semibold mt-8">🗂️ Current Products</h2>

        {loadingList ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* ⚠️ Warning if too many featured selected */}
            {featuredCount > 4 && (
              <p className="text-yellow-500 mb-2">
                ⚠️ You have selected more than 4 featured items. Please uncheck
                extras.
              </p>
            )}

            {/* ⚡ Make this div scrollable on small screens */}
            <div className="overflow-x-auto w-full">
              <table className="min-w-max w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-nav)] text-left align-top">
                    <th
                      className="p-2 cursor-pointer"
                      onClick={() => handleSort("skuNumber")}
                    >
                      SKU
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
                        {allCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </th>
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
                    return (
                      <tr key={p._id} className="border-t">
                        <td className="p-2">
                          {(p.skuNumber ?? 0).toString().padStart(5, "0")}
                        </td>

                        <td className="p-2 w-24 h-24">
                          <div className="relative w-24 h-24">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt={p.name}
                                fill
                                className="object-cover rounded"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-500/40 rounded flex items-center justify-center text-xs">
                                No Image
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="p-2">
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

                        <td className="p-2 capitalize">{p.category}</td>
                        <td className="p-2 capitalize">
                          {p.gender ?? "unisex"}
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
                            onClick={() => handleDelete(p._id)}
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

        {/* 💾 Global Save All Changes Button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSaveAll}
            disabled={status.loading}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            {status.loading ? "Saving..." : "Save All Changes 💾"}
          </button>
        </div>

        {/* 🚧 Placeholder for future: pagination, search, CSV export, etc. */}
      </div>
    </div>
  );
}
