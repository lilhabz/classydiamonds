// 📄 pages/admin/products.tsx – Admin Product Management with Batch Save & Featured Limit 🛠️💾

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
  | "earrings";

const allCategories: Category[] = [
  "engagement",
  "wedding-bands",
  "rings",
  "bracelets",
  "necklaces",
  "earrings",
];


// 🛠️ AdminProduct type mirrors collection
interface AdminProduct {
  _id: string; // MongoDB ID
  skuNumber?: number; // sequential SKU
  name: string;
  slug: string; // URL slug for product page
  description: string;
  price: number;
  salePrice?: number;
  category: Category;
  imageUrl: string;
  featured: boolean;
  gender?: "unisex" | "him" | "her";
  tags: string[];
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
    Record<string, { category: Category; featured: boolean }>
  >({});

  // ✏️ Product currently being edited
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);


  // 📋 Separate form state for editing
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    salePrice: "",
    category: "engagement" as Category,
    featured: false,
    gender: "unisex" as "unisex" | "him" | "her",
  });

  // 📋 Form state for adding a new product
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

  // 🎯 Status for operations
  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
  });

  // 🔍 Filtering dropdown state
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");

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
  // 🧮 Count of featured items currently selected
  //    Derive from rowEdits: count how many existing products are marked featured
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

  // ==================== LOAD PRODUCTS ====================
  useEffect(() => {
    async function load() {
      setLoadingList(true);
      try {
        const res = await fetch("/api/admin/products");
        const data = await res.json();
        setProducts(data.products);
        // Initialize rowEdits from fetched data
        const edits: Record<string, { category: Category; featured: boolean }> = {};
        data.products.forEach((p: AdminProduct) => {
          edits[p._id] = { category: p.category, featured: p.featured };
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
      if (formState.imageFile) formData.append("image", formState.imageFile);

      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Success: prepend new product
      setProducts((p) => [data.product, ...p]);
      setRowEdits((e) => ({
        ...e,
        [data.product._id]: {
          category: data.product.category,
          featured: data.product.featured,
        },
      }));
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
      setStatus({ loading: false, error: "", success: "Product added 🎉" });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  }; 

  // ==================== HANDLE EDIT PRODUCT ====================
  const handleEditClick = (product: AdminProduct) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      salePrice: product.salePrice ? product.salePrice.toString() : "",
      category: product.category,
      featured: product.featured,
      gender: product.gender ?? "unisex",
    });
  };

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
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    // recompute featured count with this edit applied
    const updatedEdits = {
      ...rowEdits,
      [editingProduct._id]: {
        category: editForm.category as Category,
        featured: editForm.featured,
      },
    };
    const newFeaturedCount = Object.values(updatedEdits).filter((ed) => ed.featured).length;
    if (newFeaturedCount > 4) {
      setStatus({
        loading: false,
        error: "⚠️ You can only have up to 4 featured items.",
        success: "",
      });
      return;
    }

    setStatus({ loading: true, error: "", success: "" });
    try {
      const res = await fetch(`/api/admin/products/${editingProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          price: parseFloat(editForm.price),
          ...(editForm.salePrice && { salePrice: parseFloat(editForm.salePrice) }),
          category: editForm.category,
          featured: editForm.featured,
          gender: editForm.gender,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setProducts((p) => p.map((prod) => (prod._id === editingProduct._id ? data.product : prod)));
      setRowEdits(updatedEdits);
      cancelEdit();
      setStatus({ loading: false, error: "", success: "Product updated ✅" });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  // ==================== BATCH SAVE ALL CHANGES ====================
  const handleSaveAll = async () => {
    // 🚨 Prevent saving if too many featured items selected
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
      // For each edited row, send PUT only if changed
      const updates = Object.entries(rowEdits).map(async ([id, edits]) => {
        // Find original to compare
        const orig = products.find((p) => p._id === id);
        if (!orig) return null;
        if (orig.category === edits.category && orig.featured === edits.featured)
          return null;
        // If trying to set featured=true on a product, but count >=4, skip
        if (edits.featured && featuredCount > 4) {
          throw new Error("Too many featured items selected.");
        }
        const res = await fetch(`/api/admin/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edits),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        return json.product as AdminProduct;
      });
      const results = await Promise.all(updates);
      // Merge updated back into products
      setProducts((p) =>
        p.map((x) => {
          const updated = results.find((u) => u && u._id === x._id);
          return updated || x;
        })
      );
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

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Admin Products | Classy Diamonds</title>
      </Head>

      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 mb-6 -mt-2">
        <Breadcrumbs />
      </div>

      <h1 className="text-3xl font-bold mb-6">🛠️ Admin Dashboard</h1>

      <nav className="flex space-x-6 mb-8 border-b border-[var(--bg-nav)] pb-4 text-[var(--foreground)] text-sm font-semibold">
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

      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold">🛠️ Manage Products</h2>
        <div className="flex flex-wrap gap-4 mt-2">
          <label className="flex flex-col text-sm">
            <span>Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
            >
              <option value="all">All</option>
              {allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            <span>Gender</span>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="mt-1 border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
            >
              <option value="all">All</option>
              <option value="him">For Him</option>
              <option value="her">For Her</option>
              <option value="unisex">Unisex</option>
            </select>
          </label>
        </div>

      {/* ❗ Status Messages */}
      {status.error && <p className="text-red-500">❌ {status.error}</p>}
      {status.success && <p className="text-green-600">✅ {status.success}</p>}

      {/* ✏️ Edit Product Form */}
      {editingProduct && (
        <form
          ref={editFormRef}
          onSubmit={handleUpdate}
          style={{ scrollMarginTop: "120px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded"
        >
          <h3 className="col-span-full text-lg font-semibold">
            Editing {editingProduct.name}
          </h3>
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
                setEditForm((f) => ({ ...f, category: e.target.value as Category }))
              }
              className="mt-1 w-full border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
            >
              {[
                "engagement",
                "wedding-bands",
                "rings",
                "bracelets",
                "necklaces",
                "earrings",
              ].map((cat) => (
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
                setEditForm((f) => ({ ...f, gender: e.target.value as "unisex" | "him" | "her" }))
              }
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

      {/* 🆕 Add New Product Form */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
            required
            value={formState.description}
            onChange={(e) => handleInput("description", e.target.value)}
            className="mt-1 w-full border rounded p-2"
          />
        </label>
        <label>
          💲 Price (USD)
          <input
            type="number"
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
            value={formState.salePrice}
            onChange={(e) => handleInput("salePrice", e.target.value)}
            className="mt-1 w-full border rounded p-2"
          />
        </label>
        <label>
          📂 Category
          <select
            value={formState.category}
            onChange={(e) => handleInput("category", e.target.value)}
            className="mt-1 w-full border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
          >
            {[
              "engagement",
              "wedding-bands",
              "rings",
              "bracelets",
              "necklaces",
              "earrings",
            ].map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>
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
        <label className="flex items-center space-x-2">
          <span>✨ Featured</span>
          <input
            type="checkbox"
            checked={formState.featured}
            disabled={featuredCount >= 4} // 🚫 Disable if already 4 featured
            onChange={(e) => handleInput("featured", e.target.checked)}
            className="mt-2"
          />
          {featuredCount >= 4 && (
            <span className="text-yellow-400 text-sm">
              ⚠️ Max 4 featured reached
            </span>
          )}
        </label>
        <label>
          🖼️ Image
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) =>
              handleInput("imageFile", e.target.files?.[0] ?? null)
            }
            className="mt-1 w-full"
          />
        </label>
        <button
          type="submit"
          disabled={status.loading}
          className="col-span-full bg-blue-600 text-white rounded py-2 hover:bg-blue-700"
        >
          {status.loading ? "Saving..." : "Add Product"}
        </button>
      </form>

      {/* 🗂️ Existing Products Table */}
      <h2 className="text-xl font-semibold mt-8">🗂️ Current Products</h2>
      <div className="flex flex-wrap gap-4 mt-2">
        <label className="flex flex-col text-sm">
          <span>Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
          >
            <option value="all">All</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span>Gender</span>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="mt-1 border rounded p-2 bg-[var(--bg-nav)] text-[var(--foreground)]"
          >
            <option value="all">All</option>
            <option value="him">For Him</option>
            <option value="her">For Her</option>
            <option value="unisex">Unisex</option>
          </select>
        </label>
      </div>
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
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-[var(--bg-nav)]">
                <th className="p-2">SKU</th>
                <th className="p-2">Image</th>
                <th className="p-2">Name</th>
                <th className="p-2">Category</th>
                <th className="p-2">Gender</th>
                <th className="p-2">Featured</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const edit = rowEdits[p._id];
                return (
                  <tr key={p._id} className="border-t">
                    <td className="p-2">
                      {(p.skuNumber ?? 0).toString().padStart(5, "0")}
                    </td>
                    <td className="p-2 w-24 h-24 relative">
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        className="object-cover rounded"
                      />
                    </td>
                    <td className="p-2">
                      <Link
                        href={`/category/${p.category}/${p.slug}`}
                        className="hover:text-yellow-300 underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="p-2">
                      <select
                        value={edit.category}
                        onChange={(e) =>
                          setRowEdits((r) => ({
                            ...r,
                            [p._id]: {
                              ...r[p._id],
                              category: e.target.value as Category,
                            },
                          }))
                        }
                        className="border rounded p-1 bg-[var(--bg-nav)] text-[var(--foreground)]"
                      >
                        {allCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 capitalize">
                      {p.gender ?? "unisex"}
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={edit.featured}
                        // 🚫 Disable checking if not already featured and count is at 4
                        disabled={!edit.featured && featuredCount >= 4}
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
