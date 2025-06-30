import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";

interface CustomPhoto {
  _id: string;
  imageUrl: string;
  createdAt: string;
}

export async function getServerSideProps(context: any) {
  const session = await getSession(context);
  if (!session || !session.user?.isAdmin) {
    return { redirect: { destination: "/", permanent: false } };
  }
  return { props: {} };
}

export default function AdminCustomPhotosPage() {
  const [photos, setPhotos] = useState<CustomPhoto[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [imageFile]);

  const loadPhotos = async () => {
    const res = await fetch("/api/custom-photos");
    const data = await res.json();
    setPhotos(data.photos || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    setStatus({ loading: true, error: "", success: "" });
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await fetch("/api/admin/custom-photos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPhotos((p) => [data.photo, ...p]);
      setImageFile(null);
      setStatus({ loading: false, error: "", success: "Photo added" });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--foreground)] p-6">
      <Head>
        <title>Admin Custom Photos | Classy Diamonds</title>
      </Head>
      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 mb-6 -mt-2">
        <Breadcrumbs />
      </div>
      <h1 className="text-3xl font-bold mb-6">🖼 Manage Custom Creations</h1>
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
        <Link href="/admin/products" className="hover:text-yellow-300">
          🛠 Products
        </Link>
        <Link href="/admin/custom-photos" className="text-yellow-400">
          🖼 Custom
        </Link>
        <Link href="/admin/logs" className="hover:text-yellow-300">
          📝 Logs
        </Link>
      </nav>
      {status.error && <p className="text-red-500">❌ {status.error}</p>}
      {status.success && <p className="text-green-600">✅ {status.success}</p>}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <label className="block">
          <span>🖼 Image</span>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="mt-1 w-full"
          />
          {previewUrl && (

            <div className="mt-2 w-40 h-40 relative">

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                className="object-cover rounded w-full h-full"
              />
            </div>
          )}
        </label>
        <button
          type="submit"
          disabled={status.loading}
          className="bg-blue-600 text-white rounded py-2 px-4 hover:bg-blue-700"
        >
          {status.loading ? "Saving..." : "Add Photo"}
        </button>
      </form>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {photos.map((p) => (
          <div key={p._id} className="relative w-full h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt="Custom creation" className="object-cover rounded w-full h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
