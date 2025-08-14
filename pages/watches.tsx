// 📄 pages/watches.tsx – Watches Page using the Same Card Spec as Jewelry 💎🕰️

"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { GetServerSideProps } from "next";
import clientPromise from "@/lib/mongodb";
import Breadcrumbs from "@/components/Breadcrumbs";

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

      {/* 🖼 Hero Section (unchanged layout) */}
      <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/hero-jewelry.jpg" /* ✅ swap later if you add a watches-specific hero */
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

      {/* 📦 Product Grid */}
      <section className="pt-20 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-serif font-semibold tracking-wide text-white text-center mb-8">
          Watches
        </h2>

        {products.length === 0 ? (
          <div className="text-center text-gray-400">No watches available.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {products.map((product) => {
              const cardInner = (
                <div className="flex-1 flex flex-col h-full">
                  {/* 🖼 Image block — exact match with Jewelry (aspect-square + zoom on hover) */}
                  <div className="relative w-full aspect-square">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      priority={false}
                    />
                  </div>

                  {/* 🏷️ Name + Price (with sale logic identical to Jewelry) */}
                  <div className="p-4 text-center flex-1 flex flex-col justify-between">
                    <h3 className="font-semibold text-[var(--foreground)] truncate text-sm tracking-wide leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[#cfd2d6] text-sm leading-relaxed tracking-wide">
                      {product.salePrice ? (
                        <>
                          <span className="line-through mr-1">
                            ${product.price.toLocaleString()}
                          </span>
                          <span className="text-green-500">
                            ${product.salePrice.toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <>${product.price.toLocaleString()}</>
                      )}
                    </p>
                  </div>
                </div>
              );

              const linkHref =
                product.slug &&
                `/category/${product.category || "watches"}/${product.slug}`;

              return (
                <div
                  key={product.id}
                  className="group bg-[var(--bg-nav)] w-full sm:w-full md:w-[210px] lg:w-[233.61px] h-auto min-h-[387.61px] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 flex flex-col justify-between"
                >
                  {linkHref ? (
                    <Link href={linkHref} className="flex-1">
                      {cardInner}
                    </Link>
                  ) : (
                    cardInner
                  )}

                  {/* 🛒 Quick Add (Watches = quick-add allowed) */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart({
                        id: product.id,
                        slug: product.slug, // ✅ include slug for cart + checkout
                        name: product.name,
                        price: product.price,
                        discountedPrice: product.salePrice || undefined,
                        image: product.image,
                        quantity: 1,
                      });
                    }}
                    className="m-4 px-6 py-3 bg-[#e0e0e0] text-[#1f2a44] rounded-xl hover:scale-105 transition"
                    aria-label={`Add ${product.name} to cart`}
                  >
                    Add to Cart
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* 🧠 Server-side data loader — mirrors Jewelry mapping (includes salePrice, image fallbacks) */
export const getServerSideProps: GetServerSideProps<
  WatchesProps
> = async () => {
  const client = await clientPromise;
  const productsRaw = await client
    .db()
    .collection("products")
    .find({ category: "watches" })
    .toArray();

  const products: ProductType[] = productsRaw.map((p: any) => ({
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image,
    category: p.category || "watches",
  }));

  return { props: { products } };
};
