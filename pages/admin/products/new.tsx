// pages/admin/products/new.tsx
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductForm from "@/components/admin/ProductForm";
import type { Product } from "@/types/product";

export default function AdminProductCreate() {
  const { data: session, status } = useSession();
  if (status === "loading") return <div className="p-6">Checking access…</div>;
  if (!session?.user?.isAdmin) return <div className="p-6 text-red-300">❌ Unauthorized</div>;

  return (
    <div className="p-6 min-h-screen bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head><title>New Product | Admin</title></Head>
      <div className="pl-2 pr-2 sm:pl-4 sm:pr-4 -mt-2 mb-6"><Breadcrumbs /></div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/products" className="text-sm underline">← Back to Products</Link>
        <h1 className="text-2xl font-serif font-bold">Add Product</h1>
      </div>

      <ProductForm
        mode="create"
        onSaved={(p: Product) => {
          window.location.href = `/admin/products/${p._id}`;
        }}
      />
    </div>
  );
}
