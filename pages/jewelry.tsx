// 📄 pages/jewelry.tsx – Simplified Shop Page Without Category Filters 📦

"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import { GetServerSideProps } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";

export type ProductType = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  description?: string;
};

export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const initialMount = useRef(true);

  // Initialize active category from query params
  useEffect(() => {
    const { category } = router.query;
    if (typeof category === "string") {
      setActiveCategory(category.toLowerCase());
    }
  }, [router.query.category]);

  // Optionally scroll to the products grid when coming from the home page
  useEffect(() => {
    if (router.query.scroll === "true") {
      setTimeout(() => {
        titleRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [router.query.scroll]);

  const resetCount = () => setVisibleCount(8);
  // Reset count on initial mount
  useEffect(() => {
    resetCount();
  }, []);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    resetCount();
    titleRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeCategory]);

  const headingLabel =
    activeCategory === "All"
      ? "Our Jewelry"
      : activeCategory
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

  const handleLoadMore = () => setVisibleCount((prev) => prev + 4);

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const pageTitle = "Jewelry Collection | Classy Diamonds";
  const pageDesc =
    "Explore timeless engagement rings, wedding bands, necklaces, earrings, and more.";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* 🌟 Hero */}
      <section className="-mt-20 relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
        <Image
          src="/hero-jewelry.jpg"
          alt="Jewelry Hero"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-6xl font-bold mb-4 text-[var(--foreground)]">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto text-[var(--foreground)]">
            Discover timeless pieces crafted with passion.
          </p>
        </div>
      </section>

      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
        <Breadcrumbs />
      </div>

      {/* 💎 Title */}
      <section className="pt-16 pb-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2
          ref={titleRef}
          className="text-2xl sm:text-3xl font-semibold text-center mb-8"
        >
          {headingLabel}
        </h2>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {["All", ...categories].map((cat) => {
            const label = cat
              .replace(/-/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full font-semibold transition-transform hover:scale-105 ${active ? "bg-[var(--foreground)] text-[var(--bg-nav)]" : "bg-[var(--bg-nav)] text-[var(--foreground)] hover:bg-[#364763]"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 📦 Products & Load More */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div
              key={product.id}
              className="group bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition flex flex-col h-full"
            >
              <Link href={`/category/${product.category}/${product.slug}`}>
                <div className="w-full h-44 sm:h-48 relative">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition"
                  />
                </div>
                <div className="p-4 text-center flex-1 flex flex-col justify-between">
                  <h3 className="font-semibold text-[var(--foreground)]">
                    {product.name}
                  </h3>
                  <p className="text-[#cfd2d6]">
                    {product.salePrice ? (
                      <>
                        <span className="line-through mr-1">
                          ${product.price.toLocaleString()}
                        </span>
                        <span className="text-red-500">
                          ${product.salePrice.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <>${product.price.toLocaleString()}</>
                    )}
                  </p>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: 1,
                  });
                }}
                className="m-4 px-4 py-2 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-xl font-semibold hover:bg-gray-100 hover:scale-105 hover:shadow-2xl transition"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>

        {visibleCount < filteredProducts.length && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              className="px-8 py-4 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-full"
            >
              Load More
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

// Server-side data fetching
export const getServerSideProps: GetServerSideProps = async () => {
  const client = await clientPromise;
  const productsRaw = await client.db().collection("products").find().toArray();
  const products: ProductType[] = productsRaw.map((p: any) => ({
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image,
    category: p.category,
    description: p.description || "",
  }));
  return { props: { products } };
};
