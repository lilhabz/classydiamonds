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
  salePrice?: number;
  image: string;
  category: string;
};

interface WatchesProps {
  products: ProductType[];
}

export default function WatchesPage({ products }: WatchesProps) {
  const { addToCart } = useCart();

  const watchProducts = products;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>Watches</title>
        <meta
          name="description"
          content="Browse our selection of luxury watches."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* 🖼 Hero Section */}
      <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/hero-jewelry.jpg" // 🛠 (Optional) Replace with a hero specific to watches
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

      {/* 🧭 Breadcrumb */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-8">
        <Breadcrumbs />
      </div>

      {/* 📦 Product Grid */}
      <section className="pt-20 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-serif font-semibold tracking-wide text-white text-center mb-8">
          Watches
        </h1>

        {watchProducts.length === 0 ? (
          <div className="text-center text-gray-400">No watches available.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 auto-rows-fr">
            {watchProducts.map((product) => {
              return (
                <div
                  key={product.id}
                  className="group bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 flex flex-col h-full justify-between"
                >
                  {/* 🔗 FIXED: Link points to /category/watches/[slug] */}
                  <Link
                    href={`/category/watches/${product.slug}`}
                    className="flex-1 flex flex-col h-full"
                  >
                    <div className="product-card-img">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-110 transition h-full w-full"
                      />
                    </div>
                    <div className="p-4 text-center flex-1 flex flex-col justify-between">
                      <h3 className="font-semibold text-[var(--foreground)] truncate text-sm tracking-wide leading-snug">
                        {product.name}
                      </h3>
                      <p className="text-[#cfd2d6] text-sm">
                        ${product.price.toLocaleString()}
                      </p>
                    </div>
                  </Link>

                  {/* 🛒 Add to Cart */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        discountedPrice: product.salePrice,
                        image: product.image,
                        quantity: 1,
                      });
                    }}
                    className="m-4 px-6 py-3 bg-[#e0e0e0] text-[#1f2a44] rounded-xl hover:scale-105 transition"
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

// 📤 Server-side data fetching
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
    image: p.imageUrl || p.image,
    category: p.category,
  }));

  return { props: { products } };
};
