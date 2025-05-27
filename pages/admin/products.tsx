// 📄 pages/admin/products.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import { getSession } from "next-auth/react";

// Define allowed categories
type Category =
  | "engagement"
  | "wedding-bands"
  | "rings"
  | "bracelets"
  | "necklaces"
  | "earrings";

// 🛡️ Server-side guard: only admins can access
export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.isAdmin) {
    return {
      redirect: { destination: "/", permanent: false },
    };
  }
  return { props: {} };
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Category>("engagement");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const categories: Category[] = [
    "engagement",
    "wedding-bands",
    "rings",
    "bracelets",
    "necklaces",
    "earrings",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!imageFile) throw new Error("Please select an image.");

      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("category", category);
      formData.append("image", imageFile);

      const res = await fetch("/api/admin/products", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error adding product");

      setSuccess("Product added successfully! 🎉");
      // 🧹 Reset form
      setName("");
      setDescription("");
      setPrice("");
      setCategory("engagement");
      setImageFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🛠️ Add New Product</h1>
      {error && <p className="text-red-500">❌ {error}</p>}
      {success && <p className="text-green-600">✅ {success}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        {/* Name */}
        <label>
          📦 Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </label>

        {/* Description */}
        <label>
          📝 Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </label>

        {/* Price */}
        <label>
          💲 Price (USD)
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </label>

        {/* Category */}
        <label>
          📂 Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            required
            className="mt-1 w-full border rounded p-2"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {/* Image Upload */}
        <label>
          🖼️ Image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            required
            className="mt-1 w-full"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded py-2 hover:bg-blue-700"
        >
          {loading ? "Uploading..." : "Add Product"}
        </button>
      </form>
    </div>
  );
}
