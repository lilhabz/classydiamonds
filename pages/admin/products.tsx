// 📄 pages/admin/products.tsx – Admin Product Management with Batch Save Feature 🛠️💾

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getSession } from "next-auth/react";
import Image from "next/image";
import clientPromise from "@/lib/mongodb"; // 🔗 MongoDB client if needed

// 🚀 Define allowed categories
type Category =
  | "engagement"
  | "wedding-bands"
  | "rings"
  | "bracelets"
  | "necklaces"
  | "earrings";

// 🛠️ AdminProduct type mirrors collection
interface AdminProduct {
  _id: string; // MongoDB ID
  skuNumber?: number; // sequential SKU
  name: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  featured: boolean;
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

  // 💾 Local row edits tracked here before save
  const [rowEdits, setRowEdits] = useState<
    Record<string, { category: Category; featured: boolean }>
  >({});

  // 📋 Form state for adding a new product
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    price: "",
    category: "engagement" as Category,
    featured: false,
    imageFile: null as File | null,
  });

  // 🎯 Status for operations
  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
  });

  // ==================== LOAD PRODUCTS ====================
  useEffect(() => {
    async function load() {
      setLoadingList(true);
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      setProducts(data.products);
      setLoadingList(false);
      // Initialize row edits from fetched data
      const edits: Record<string, { category: Category; featured: boolean }> =
        {};
      data.products.forEach((p: AdminProduct) => {
        edits[p._id] = { category: p.category, featured: p.featured };
      });
      setRowEdits(edits);
    }
    load();
  }, []);

  // ==================== HANDLE NEW PRODUCT ====================
  const handleInput = (field: string, value: any) => {
    setFormState((s) => ({ ...s, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ loading: true, error: "", success: "" });
    try {
      const formData = new FormData();
      formData.append("name", formState.name);
      formData.append("description", formState.description);
      formData.append("price", formState.price);
      formData.append("category", formState.category);
      formData.append("featured", formState.featured ? "true" : "false");
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
        category: "engagement",
        featured: false,
        imageFile: null,
      });
      setStatus({ loading: false, error: "", success: "Product added 🎉" });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  // ==================== SAVE CHANGES PER ROW ====================
  const handleSave = async (id: string) => {
    const edits = rowEdits[id];
    setStatus({ loading: true, error: "", success: "" });
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      // Update UI list with saved item
      setProducts((p) => p.map((x) => (x._id === id ? json.product : x)));
      setStatus({ loading: false, error: "", success: "Changes saved 💾" });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  // ==================== DELETE PRODUCT ====================
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProducts((p) => p.filter((x) => x._id !== id));
      setStatus({ loading: false, error: "", success: "Product deleted 🗑️" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🛠️ Manage Products</h1>
      {status.error && <p className="text-red-500">❌ {status.error}</p>}
      {status.success && <p className="text-green-600">✅ {status.success}</p>}

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
          📂 Category
          <select
            value={formState.category}
            onChange={(e) => handleInput("category", e.target.value)}
            className="mt-1 w-full border rounded p-2"
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
        <label className="flex items-center space-x-2">
          ✨ Featured
          <input
            type="checkbox"
            checked={formState.featured}
            onChange={(e) => handleInput("featured", e.target.checked)}
            className="mt-2"
          />
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
      <h2 className="#text-xl font-semibold mt-8">🗂️ Current Products</h2>
      {loadingList ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">SKU</th>
              <th className="p-2">Image</th>
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">Featured</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
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
                  <td className="p-2">{p.name}</td>
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
                      className="border rounded p-1"
                    >
                      {[
                        "engagement",
                        "wedding-bands",
                        "rings",
                        "bracelets",
                        "necklaces",
                        "earrings",
                      ].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={edit.featured}
                      onChange={(e) =>
                        setRowEdits((r) => ({
                          ...r,
                          [p._id]: { ...r[p._id], featured: e.target.checked },
                        }))
                      }
                    />
                  </td>
                  <td className="p-2 space-x-2">
                    <button
                      onClick={() => handleSave(p._id)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      💾 Save
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
      )}
    </div>
  );
}
