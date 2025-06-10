// 📄 pages/category/[category]/index.tsx – Category Product Grid with Static + Server Data Merge 🚀

import { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useCart } from "@/context/CartContext";
import { jewelryData } from "@/data/jewelryData"; // static data
import Breadcrumbs from "@/components/Breadcrumbs";

interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  slug: string;
}

interface CategoryPageProps {
  products: Product[]; // from your DB
  category: string; // slug
}

// Fetch server items
export const getServerSideProps: GetServerSideProps<
  CategoryPageProps
> = async ({ query }) => {
  const cat = query.category as string;
  const res = await fetch(
    `${process.env.NEXTAUTH_URL}/api/products?category=${cat}`
  );
  const products: Product[] = await res.json();
  return { props: { products, category: cat } };
};

export default function CategoryPage({
  products,
  category,
}: CategoryPageProps) {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(8);
  const productsEndRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();

  // Normalize static data to Product[]
  const staticProducts: Product[] = jewelryData
    .filter((p) => p.category.toLowerCase() === category.toLowerCase())
    .map((p) => ({
      _id: p.id.toString(), // convert number to string id
      name: p.name,
      price: p.price,
      image: p.image,
      category: p.category,
      slug: p.slug,
    }));

  // Merge both sets
  const allProducts: Product[] = [...staticProducts, ...products];

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 4);
    setTimeout(
      () => productsEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      300
    );
  };

  const prettyCategory = category
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  const categoryHeroImages: Record<string, string> = {
    rings: "/category-hero/ring-hero.jpg",
    bracelets: "/category-hero/bracelet-hero.jpg",
    earrings: "/category-hero/earring-hero.jpg",
    "wedding-bands": "/category-hero/wedding-band-hero.jpg",
    engagement: "/category-hero/engagement-ring-hero.jpg",
    necklaces: "/category-hero/necklace-hero.jpg",
  };
  const categoryImagePosition: Record<string, string> = {
    rings: "object-[center_75%]",
    bracelets: "object-center",
    earrings: "object-[center_25%] brightness-275",
    "wedding-bands": "object-center",
    engagement: "object-[center_65%]",
    necklaces: "object-[center_30%]",
  };
  const categoryHeroSubtitles: Record<string, string> = {
    rings: "Timeless designs that sparkle forever",
    bracelets: "Refined elegance for every wrist",
    earrings: "Statement pieces that shine bright",
    "wedding-bands": "Symbolizing eternal commitment",
    engagement: "Crafted to capture forever",
    necklaces: "Luxury that completes any look",
  };

  const heroImage = categoryHeroImages[category.toLowerCase()];
  const heroClass = categoryImagePosition[category.toLowerCase()];
  const heroSubtitle = categoryHeroSubtitles[category.toLowerCase()];

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.scroll === "true") {
      const offset = 64; // account for sticky navbar height
      if (titleRef.current) {
        const top =
          titleRef.current.getBoundingClientRect().top +
          window.pageYOffset -
          offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  }, [router.isReady]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      {/* 🔖 Head Meta */}
      <Head>
        <title>{prettyCategory} | Classy Diamonds</title>
        <meta
          name="description"
          content={`Explore our stunning ${prettyCategory} pieces at Classy Diamonds.`}
        />
      </Head>

      {/* 🌟 Hero Section */}
      {heroImage && (
        <section className="relative w-full h-[40vh] sm:h-[50vh] overflow-hidden">
          <Image
            src={heroImage}
            alt={`${prettyCategory} banner`}
            fill
            className={`object-cover ${heroClass}`}
            priority
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-3xl sm:text-5xl font-bold text-white capitalize">
              {prettyCategory}
            </h1>
            {heroSubtitle && (
              <p className="mt-2 text-base sm:text-lg text-[#e0e0e0] max-w-xl">
                {heroSubtitle}
              </p>
            )}
          </div>
        </section>
      )}

      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
        <Breadcrumbs />
      </div>

      {/* 💍 Product Grid Section */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2
          ref={titleRef}
          className="text-2xl sm:text-3xl font-semibold text-center mb-12 scroll-mt-16"
        >
          {prettyCategory} Pieces
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {allProducts.slice(0, visibleCount).map((product) => (
            <div key={product._id} className="group">
              <div className="bg-[var(--bg-nav)] rounded-2xl overflow-hidden shadow-lg hover:ring-2 hover:ring-[var(--foreground)] hover:scale-105 transition-transform duration-300 flex flex-col h-full">
                {/* 🔗 Product Link & Image */}
                <Link
                  href={`/category/${product.category}/${product.slug}`}
                  className="flex-1"
                >
                  <div className="w-full h-48 relative">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 text-center">
                    <h3 className="text-lg font-semibold text-[#cfd2d6] group-hover:text-white">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-gray-400 group-hover:text-white">
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
                {/* 🛒 Add to Cart */}
                <div className="p-6 pt-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      addToCart({
                        id: product._id,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        quantity: 1,
                      });
                    }}
                    className="w-full px-6 py-3 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-xl font-semibold hover:scale-105 hover:bg-gray-200 transition duration-300"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* 🔽 Load More */}
        <div ref={productsEndRef} />
        {visibleCount < allProducts.length ? (
          <div className="flex justify-center mt-12">
            <button
              onClick={handleLoadMore}
              className="px-8 py-4 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-full font-semibold text-lg hover:bg-white hover:scale-105 transition-transform"
            >
              Load More
            </button>
          </div>
        ) : (
          <div className="text-center mt-12 text-lg text-gray-400">
            🎉 You’ve explored all our {prettyCategory.toLowerCase()} pieces!
          </div>
        )}
      </section>
    </div>
  );
}
