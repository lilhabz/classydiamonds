// pages/account/favorites.tsx — Favorites grid for guests & signed-in users
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useFavorites } from "@/context/FavoritesContext";
import ProductCard from "@/components/ProductCard";
import Breadcrumbs from "@/components/Breadcrumbs";

type ProductLite = {
  slug: string;
  image?: string | null;
  name: string;
  price: number;
  salePrice?: number | null;
  inStock?: boolean;
  /** we’ll treat this as category-ish for display & link building */
  typeLabel?: string;
  /** final URL for the card */
  href?: string;
};

// 🔑 helper to pick the most likely image field
const pickImage = (p: any) =>
  p.image ??
  p.imageUrl ??
  p.thumbnail ??
  p.mainImage ??
  p.coverImage ??
  (Array.isArray(p.images) ? p.images[0] : undefined) ??
  (Array.isArray(p.photos) ? p.photos[0]?.url || p.photos[0] : undefined) ??
  null;

// Build a category-aware href when possible
const buildHref = (p: any) => {
  const slug = p.slug ?? p.id ?? "";
  const category =
    p.category ??
    p.type ?? // tolerate legacy “type” as category
    p.subcategory ??
    p.subCategory;

  if (p.href) return p.href;
  if (category && slug) return `/category/${category}/${slug}`;
  if (slug) return `/product/${slug}`;
  return undefined;
};

const mapProduct = (p: any): ProductLite => ({
  slug: p.slug ?? p.id ?? "",
  image: pickImage(p),
  name: p.name ?? p.title ?? p.slug ?? "Unnamed Product",
  // show sale if present, otherwise base price
  price: Number(p.salePrice ?? p.price ?? p.unitPrice ?? 0) || 0,
  salePrice:
    p.salePrice != null
      ? Number(p.salePrice)
      : p.discountPrice != null
      ? Number(p.discountPrice)
      : null,
  inStock: typeof p.inStock === "boolean" ? p.inStock : undefined,
  typeLabel:
    p.type ?? p.category ?? p.subcategory ?? p.subCategory ?? undefined,
  href: buildHref(p), // category-aware link
});

async function fetchProductsBySlugs(slugs: string[]): Promise<ProductLite[]> {
  if (!slugs.length) return [];

  // Prefer GET /api/products?slugs=a,b,c if you have it
  try {
    const res = await fetch(
      `/api/products?slugs=${encodeURIComponent(slugs.join(","))}`
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data.map(mapProduct);
    }
  } catch {}

  // Fallback: POST /api/products/bulk  { slugs } (if you’ve added it)
  try {
    const res = await fetch(`/api/products/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data.map(mapProduct);
    }
  } catch {}

  // Last resort: minimal stubs (name-only)
  return slugs.map((slug) => ({
    slug,
    name: slug,
    price: 0,
    image: null,
    href: `/product/${slug}`,
  }));
}

export default function FavoritesPage() {
  const { rehydrated, favorites, toggleFavorite } = useFavorites();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  const slugs = useMemo(() => favorites, [favorites]);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!rehydrated) return; // wait to avoid flicker / wrong state
      setLoading(true);
      setError(null);
      try {
        const list = await fetchProductsBySlugs(slugs);
        if (!alive) return;
        setProducts(list);
      } catch {
        if (!alive) return;
        setError("Failed to load favorites.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [rehydrated, slugs]);

  const remove = (slug: string) => toggleFavorite(slug);

  return (
    <div className="min-h-screen px-4 py-10 bg-[var(--bg-page)] text-[var(--foreground)]">
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mb-6 -mt-2">
        <Breadcrumbs />
      </div>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          Your Favorites ❤️
        </h1>
        <p className="text-sm text-gray-300 mb-8">
          Save items you love and come back anytime. Signed-in favorites sync
          across devices.
        </p>

        {!rehydrated || loading ? (
          <div className="bg-white/10 backdrop-blur p-6 rounded-2xl shadow-lg text-gray-300">
            Loading your favorites…
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/40 text-red-200 p-4 rounded-xl">
            {error}
          </div>
        ) : slugs.length === 0 ? (
          <div className="bg-white/10 backdrop-blur p-8 rounded-2xl shadow-lg text-center">
            <p className="text-lg mb-2">No favorites yet.</p>
            <p className="text-gray-300 mb-6">
              Tap the ♡ on any product to add it here.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/jewelry"
                className="px-4 py-2 rounded-lg bg-[#2a374f] hover:bg-[#364763]"
              >
                Explore Jewelry
              </Link>
              <Link
                href="/watches"
                className="px-4 py-2 rounded-lg bg-[#2a374f] hover:bg-[#364763]"
              >
                Explore Watches
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ✅ Uniform card sizing via shared grid */}
            <div className="product-grid grid gap-x-6 gap-y-10 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => {
                const stockLabel =
                  typeof p.inStock === "boolean"
                    ? p.inStock
                      ? "In Stock"
                      : "Out of Stock"
                    : "In Stock";

                return (
                  <div key={p.slug} className="relative">
                    {/* category-aware link comes via p.href */}
                    <ProductCard
                      slug={p.slug}
                      image={p.image ?? undefined}
                      name={p.name}
                      price={p.price}
                      salePrice={p.salePrice ?? null}
                      stockLabel={stockLabel}
                      typeLabel={p.typeLabel}
                      href={p.href}
                    />
                    {/* Quick remove pill */}
                    <button
                      onClick={() => remove(p.slug)}
                      className="absolute top-2 right-2 text-xs bg-white/90 text-black px-2 py-1 rounded-md hover:bg-white"
                      aria-label={`Remove ${p.name} from favorites`}
                      title="Remove"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Little count + clear-all affordance (optional) */}
            <div className="mt-6 text-sm text-gray-300">
              {products.length} item{products.length === 1 ? "" : "s"} saved
            </div>
          </>
        )}
      </div>
    </div>
  );
}
