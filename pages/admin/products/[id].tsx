// pages/admin/products/[id].tsx
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductForm from "@/components/admin/ProductForm";
import type { Product } from "@/types/product";

export default function AdminProductEdit() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== "string") return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/products/${id}`);
        const data = await res.json();
        // tolerate either shape: {ok,item} or {product}
        const p = data.item || data.product || null;
        setProduct(p);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin)
    return <div className="p-6 text-red-300">❌ Unauthorized</div>;

  return (
    <div className="p-6 min-h-screen bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Edit Product | Admin</title>
      </Head>
      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 -mt-2 mb-6">
        <Breadcrumbs />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/products" className="text-sm underline">
          ← Back to Products
        </Link>
        <h1 className="text-2xl font-serif font-bold">Edit Product</h1>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : !product ? (
        <p>Not found.</p>
      ) : (
        <ProductForm
          mode="edit"
          initial={product}
          onSaved={() => {
            alert("✅ Saved");
            // Reload to reflect latest server data (thumbnail etc.)
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
