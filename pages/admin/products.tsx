// 📄 pages/admin/products.tsx – Admin Product Management with Sequential SKU, Featured, Category Edit, and Delete 🛠️

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getSession } from "next-auth/react";
import Image from "next/image";

// Define allowed categories
type Category =
  | "engagement"
  | "wedding-bands"
  | "rings"
  | "bracelets"
  | "necklaces"
  | "earrings";

interface AdminProduct {
  _id: string; // MongoDB ID (for actions)
  skuNumber: number; // ← sequential SKU
  name: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  featured: boolean;
}

// 🛡️ Server-side guard: only admins can access
export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.isAdmin) {
    return { redirect: { destination: "/", permanent: false } };
  }
  return { props: {} };
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [formState, setFormState] = useState({
    name: "",
    description: "",
    price: "",
    category: "engagement" as Category,
    featured: false,
    imageFile: null as File | null,
  });
  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
  });

  // Fetch existing products
  useEffect(() => {
    async function load() {
      setLoadingList(true);
      const res = await fetch("/api/admin/products");
      const data = await res.json();
      setProducts(data.products);
      setLoadingList(false);
    }
    load();
  }, []);

  // Handle form input changes
  const handleInput = (field: string, value: any) => {
    setFormState((s) => ({ ...s, [field]: value }));
  };

  // Add new product
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

      setStatus({ loading: false, error: "", success: "Product added 🎉" });
      // Reset form
      setFormState({
        name: "",
        description: "",
        price: "",
        category: "engagement",
        featured: false,
        imageFile: null,
      });
      // Refresh list (new product includes skuNumber)
      setProducts((p) => [data.product, ...p]);
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  // Update a product field
  const updateProduct = async (id: string, updates: Partial<AdminProduct>) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const json = await res.json();
      setProducts((p) => p.map((x) => (x._id === id ? json.product : x)));
    }
  };

  // Delete a product
  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) setProducts((p) => p.filter((x) => x._id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🛠️ Manage Products</h1>
      {status.error && <p className="text-red-500">❌ {status.error}</p>}
      {status.success && <p className="text-green-600">✅ {status.success}</p>}

      {/* Add New Product Form */}
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

      {/* Existing Products Table */}
      <h2 className="text-xl font-semibold mt-8">🗂️ Current Products</h2>
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
            {products.map((p) => (
              <tr key={p._id} className="border-t">
                <td className="p-2">
                  {p.skuNumber.toString().padStart(5, "0")}
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
                    value={p.category}
                    onChange={(e) =>
                      updateProduct(p._id, {
                        category: e.target.value as Category,
                      })
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
                    checked={p.featured}
                    onChange={(e) =>
                      updateProduct(p._id, { featured: e.target.checked })
                    }
                  />
                </td>
                <td className="p-2">
                  <button
                    onClick={() => deleteProduct(p._id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
