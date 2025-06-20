// 📄 pages/jewelry.tsx – Fully Fixed and Commented Jewelry Page 💎

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
  gender?: "unisex" | "him" | "her";
  description?: string;
};

export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [genderFilter, setGenderFilter] = useState<"him" | "her" | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const initialMount = useRef(true);

  const resetCount = () => setVisibleCount(8);

  useEffect(() => {
    resetCount();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("preselectedCategory");
    if (stored) {
      if (stored === "for-him") {
        setGenderFilter("him");
        setActiveCategory("All");
      } else if (stored === "for-her") {
        setGenderFilter("her");
        setActiveCategory("All");
      } else {
        setActiveCategory(stored);
        setGenderFilter(null);
      }
      resetCount();
      localStorage.removeItem("preselectedCategory");
      setTimeout(scrollBelowHero, 0);
    }
  }, []);

  const allCategories = Array.from(new Set(products.map((p) => p.category)));
  const categoryFilters = [...allCategories, "for-him", "for-her"];

  const scrollBelowHero = () => {
    if (heroRef.current) {
      const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  };

  const scrollToHeader = () => {
    headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const { category, gender, scroll } = router.query;

    if (gender === "him" || category === "for-him") {
      setGenderFilter("him");
      setActiveCategory("All");
    } else if (gender === "her" || category === "for-her") {
      setGenderFilter("her");
      setActiveCategory("All");
    } else if (typeof category === "string" && category) {
      setActiveCategory(category);
      setGenderFilter(null);
    }

    resetCount();

    if (scroll === "true") {
      setTimeout(scrollBelowHero, 0);
    }
  }, [router.isReady]);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    resetCount();
    scrollToHeader();
  }, [activeCategory, genderFilter]);

  const handleLoadMore = () => setVisibleCount((prev) => prev + 4);

  const formatCategory = (cat: string) =>
    cat.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const filteredByGender = genderFilter
    ? products.filter((p) => p.gender === genderFilter)
    : products;

  const filteredProducts =
    activeCategory === "All"
      ? filteredByGender
      : filteredByGender.filter((p) => p.category === activeCategory);

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

      {/* 🌟 Hero Section */}
      <section
        ref={heroRef}
        className="-mt-20 relative w-full h-[80vh] flex items-center justify-center overflow-hidden"
      >
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

      {/* 🧭 Breadcrumbs */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
        <Breadcrumbs />
      </div>

      {/* 💎 Category Header */}
      <section
        ref={headerRef}
        className="pt-16 pb-8 px-4 sm:px-6 max-w-7xl mx-auto"
      >
        <h2
          ref={titleRef}
          className="text-2xl sm:text-3xl font-semibold text-center"
        >
          {genderFilter === "him"
            ? "For Him"
            : genderFilter === "her"
            ? "For Her"
            : activeCategory === "All"
            ? "Our Jewelry"
            : formatCategory(activeCategory)}
        </h2>
        {genderFilter && (
          <p className="text-xl sm:text-2xl text-center mt-2 mb-6">
            {activeCategory === "All"
              ? "All Jewelry"
              : formatCategory(activeCategory)}
          </p>
        )}
        {!genderFilter && <div className="mb-8" />}

        <div className="overflow-x-auto no-scrollbar sm:overflow-visible mt-4">
          <div className="flex space-x-3 w-max py-2 whitespace-nowrap sm:flex-wrap sm:space-x-3 sm:w-full sm:whitespace-normal sm:justify-center">
            {["All", ...categoryFilters].map((cat) => {
            const label = cat
              .replace(/-/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase());
            const active =
              (cat === "for-him" &&
                genderFilter === "him" &&
                activeCategory === "All") ||
              (cat === "for-her" &&
                genderFilter === "her" &&
                activeCategory === "All") ||
              (cat !== "for-him" &&
                cat !== "for-her" &&
                activeCategory === cat &&
                !genderFilter);

            return (
              <button
                key={cat}
                onClick={() => {
                  if (cat === "for-him") {
                    setGenderFilter("him");
                    setActiveCategory("All");
                  } else if (cat === "for-her") {
                    setGenderFilter("her");
                    setActiveCategory("All");
                  } else {
                    setGenderFilter(null);
                    setActiveCategory(cat);
                  }
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold transition-transform hover:scale-105 ${
                  active
                    ? "bg-[var(--foreground)] text-[var(--bg-nav)]"
                    : "bg-[var(--bg-nav)] text-[var(--foreground)] hover:bg-[#364763]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        </div>
      </section>

      {/* 🛒 Product Grid */}
      <section className="px-4 sm:px-6 max-w-7xl mx-auto mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 auto-rows-fr">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div
              key={product.id}
              className="group bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition flex flex-col h-full justify-between"
            >
              <Link
                href={
                  genderFilter
                    ? {
                        pathname: `/category/${product.category}/${product.slug}`,
                        query: { gender: genderFilter },
                      }
                    : `/category/${product.category}/${product.slug}`
                }
                className="flex-1 flex flex-col h-full"
              >
                <div className="relative w-full aspect-square">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition"
                  />
                </div>
                <div className="p-4 text-center flex-1 flex flex-col justify-between">
                  <h3 className="font-semibold text-[var(--foreground)] truncate text-sm">
                    {product.name}
                  </h3>
                  <p className="text-[#cfd2d6] text-sm">
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
                className="m-4 px-6 py-3 bg-[#e0e0e0] text-[#1f2a44] rounded-xl hover:scale-105 transition"
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>

        {visibleCount < filteredProducts.length && (
          <div className="flex justify-center mt-10">
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

// 🧠 Server-side data loader
export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const client = await clientPromise;
  let genderQuery: "him" | "her" | undefined;
  if (query.category === "for-him") genderQuery = "him";
  if (query.category === "for-her") genderQuery = "her";
  const filter = genderQuery ? { gender: genderQuery } : {};
  const productsRaw = await client
    .db()
    .collection("products")
    .find(filter)
    .toArray();
  const products: ProductType[] = productsRaw.map((p: any) => ({
    id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image,
    category: p.category,
    gender: p.gender || "unisex",
    description: p.description || "",
  }));
  return { props: { products } };
};
