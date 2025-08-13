// 📄 pages/jewelry.tsx – Category Filters Styled Like Home ✅💎

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

// 🔹 Reusable tile for category filters
function CategoryTile({
  name,
  src,
  active,
  onClick,
}: {
  name: string;
  src?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-transform duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
    >
      <div className="relative aspect-[4/3] w-full">
        {src ? (
          <Image
            src={src}
            alt={name}
            fill
            sizes="(max-width: 768px) 160px, 200px"
            className="object-cover rounded-xl group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center bg-[#25304f] text-white/80 w-full h-full">
            {name}
          </div>
        )}
        <div
          className={`absolute inset-0 bg-black/35 z-10 ${
            active ? "ring-2 ring-indigo-500" : ""
          }`}
        />
        <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-semibold text-white z-20">
          {name}
        </span>
      </div>
    </button>
  );
}

export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [genderFilter, setGenderFilter] = useState<"him" | "her" | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const initialMount = useRef(true);
  const router = useRouter();

  const isRingCategory = (cat: string) => cat?.toLowerCase().includes("ring");

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
  const categoryFilters = [...allCategories, "For Him", "For Her"];

  // ✅ Image map matches Home page
  const categoryImages: Record<string, string | undefined> = {
    All: undefined,
    Engagement: "/category/engagement-cat.jpg",
    "Wedding Bands": "/category/wedding-band-cat.jpg",
    Rings: "/category/ring-cat.jpg",
    Bracelets: "/category/bracelet-cat.jpg",
    Necklaces: "/category/necklace-cat.jpg",
    Earrings: "/category/earring-cat.jpg",
    Watches: "/category/watches-cat.jpg", // add if exists
    "For Him": "/category/his-gift-cat.jpg",
    "For Her": "/category/her-gift-cat.jpg",
  };

  const getImageForCategory = (label: string) =>
    categoryImages[label] ??
    `/category/${label.toLowerCase().replace(/\s+/g, "-")}-cat.jpg`;

  const scrollBelowHero = () => {
    if (heroRef.current) {
      const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  };

  const scrollToHeader = () => {
    headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!router.isReady) return;
    const { category, gender, scroll } = router.query;

    if (gender === "him" || category === "for-him" || category === "For Him") {
      setGenderFilter("him");
      setActiveCategory("All");
    } else if (
      gender === "her" ||
      category === "for-her" ||
      category === "For Her"
    ) {
      setGenderFilter("her");
      setActiveCategory("All");
    } else if (typeof category === "string" && category) {
      setActiveCategory(category);
      setGenderFilter(null);
    }

    resetCount();
    if (scroll === "true") setTimeout(scrollBelowHero, 0);
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
  const filteredProducts = filteredByGender.filter((p) =>
    activeCategory === "All" ? true : p.category === activeCategory
  );

  const pageTitle = "Jewelry Collection | Classy Diamonds";
  const pageDesc =
    "Explore timeless engagement rings, wedding bands, necklaces, earrings, and more.";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
      </Head>

      {/* 🌟 Hero */}
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
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-6xl font-serif font-bold tracking-wider mb-4">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto">
            Discover timeless pieces crafted with passion.
          </p>
        </div>
      </section>

      {/* 🧭 Breadcrumbs */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-8">
        <Breadcrumbs />
      </div>

      {/* 💎 Category Filters */}
      <section
        ref={headerRef}
        className="pt-20 pb-12 px-4 sm:px-6 max-w-7xl mx-auto"
      >
        <div className="text-center mb-6">
          <h2
            ref={titleRef}
            className="text-2xl sm:text-3xl font-serif font-semibold"
          >
            {genderFilter === "him"
              ? "For Him"
              : genderFilter === "her"
              ? "For Her"
              : activeCategory === "All"
              ? "Our Jewelry"
              : formatCategory(activeCategory)}
          </h2>
        </div>

        {/* All devices: wide one-line scrollable categories */}
        <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none]">
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {["All", ...categoryFilters].map((cat) => {
            const label = formatCategory(cat);
            const active =
              (label === "For Him" &&
                genderFilter === "him" &&
                activeCategory === "All") ||
              (label === "For Her" &&
                genderFilter === "her" &&
                activeCategory === "All") ||
              (label !== "For Him" &&
                label !== "For Her" &&
                activeCategory === cat &&
                !genderFilter);

            return (
              <div
                key={label}
                className="snap-start flex-shrink-0 w-48 md:w-56"
              >
                <CategoryTile
                  name={label}
                  src={getImageForCategory(label)}
                  active={active}
                  onClick={() => {
                    if (label === "For Him") {
                      setGenderFilter("him");
                      setActiveCategory("All");
                    } else if (label === "For Her") {
                      setGenderFilter("her");
                      setActiveCategory("All");
                    } else {
                      setGenderFilter(null);
                      setActiveCategory(cat);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 🛒 Product Grid */}
      <section className="mt-8 px-4 sm:px-6 max-w-7xl mx-auto mb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div
              key={product.id}
              className="group bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-105 transition-transform flex flex-col"
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
                className="flex-1 flex flex-col"
              >
                <div className="relative w-full aspect-square">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform"
                  />
                </div>
                <div className="p-4 text-center flex flex-col flex-grow justify-between">
                  <h3 className="font-semibold truncate text-sm">
                    {product.name}
                  </h3>
                  <p className="text-[#cfd2d6] text-sm">
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
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (isRingCategory(product.category)) {
                    router.push(
                      `/category/${product.category}/${product.slug}`
                    );
                    return;
                  }
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
  if (query.category === "for-him" || query.category === "For Him")
    genderQuery = "him";
  if (query.category === "for-her" || query.category === "For Her")
    genderQuery = "her";
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
//
