// 📄 pages/watches.tsx – Watches Page using the Same Card Spec as Jewelry 💎🕰️
"use client";

import Image from "next/image";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { GetServerSideProps } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";

// ✅ unified data source
import { listProducts } from "@/lib/products";

export type ProductType = {
  id: string;
  slug?: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  category: string;
};

interface WatchesProps {
  products: ProductType[];
}

export default function WatchesPage({ products }: WatchesProps) {
  const { addToCart } = useCart();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Watches | Classy Diamonds</title>
        <meta
          name="description"
          content="Browse our selection of luxury watches."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* 🖼 Hero Section */}
      <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/hero-jewelry.jpg" /* swap later if you add a watches-specific hero */
          alt="Watch Hero"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-6xl font-serif font-bold tracking-wider leading-snug mb-4 text-[var(--foreground)]">
            Watch Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto text-[var(--foreground)] leading-relaxed tracking-wide">
            Explore precision-crafted timepieces.
          </p>
        </div>
      </section>

      {/* 🧭 Breadcrumbs */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-8">
        <Breadcrumbs />
      </div>

      {/* 📦 Product Grid (uses shared ProductCard) */}
      <section className="pt-20 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-serif font-semibold tracking-wide text-white text-center mb-8">
          Watches
        </h2>

        {products.length === 0 ? (
          <div className="text-center text-gray-400">No watches available.</div>
        ) : (
          /* Grid: 2→3→3→4; cards keep fixed/var sizing via globals.css */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {products.map((product) => {
              const href =
                product.slug &&
                `/category/${(product.category || "watches").toLowerCase()}/${
                  product.slug
                }`;

              return (
                <ProductCard
                  key={product.id}
                  slug={product.slug || product.id}
                  image={product.image}
                  name={product.name}
                  price={product.price}
                  salePrice={product.salePrice ?? null}
                  href={href || undefined}
                  onAddToCart={() =>
                    addToCart({
                      id: product.id,
                      slug: product.slug,
                      name: product.name,
                      price: product.price,
                      discountedPrice: product.salePrice ?? undefined,
                      image: product.image,
                      quantity: 1,
                    })
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* 🧠 Server-side data loader — unified via lib/products */
export const getServerSideProps: GetServerSideProps<
  WatchesProps
> = async () => {
  // Pull all watch docs, regardless of legacy field names
  const rows = await listProducts(
    {
      $or: [
        { department: "watch" }, // new
        { category: "watch" }, // legacy singular
        { category: "watches" }, // legacy plural
      ],
    },
    { sort: { createdAt: -1 }, limit: 2000 }
  );

  const products: ProductType[] = rows.map((p: any) => ({
    id: String(p._id),
    slug: p.slug,
    name: p.title || p.name || "",
    price: p.price ?? p.unitPrice ?? 0,
    salePrice: p.salePrice ?? p.discountedPrice ?? null,
    image:
      p.imageUrl ||
      (Array.isArray(p.images) && p.images.length ? p.images[0] : "") ||
      "",
    category: String(p.category || "watches").toLowerCase(),
  }));

  return { props: { products } };
};
