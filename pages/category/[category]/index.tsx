// pages/category/[category]/index.tsx
"use client";

import Head from "next/head";
import { GetServerSideProps } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import FiltersSidebar from "@/components/FiltersSidebar";
import SubcategoryCards from "@/components/SubcategoryCards";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";

/* ------------------------------ Types ------------------------------ */
type Product = {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  category: string;
  subcategory?: string;
  metal?: string;
  stone?: string;
  shape?: string;
  carat?: number;
  slug: string;
};

type SubItem = { label: string; slug: string };

type PageProps = {
  categorySlug: string;
  categoryLabel: string;
  subcategories: SubItem[];
  products: Product[];
};

/* ------------------------- Subcategory map ------------------------- */
const RINGS_SUBS: SubItem[] = [
  { label: "Engagement Rings", slug: "engagement-rings" },
  { label: "Wedding Rings", slug: "wedding-rings" },
  { label: "Promise Rings", slug: "promise-rings" },
  { label: "Eternity Rings", slug: "eternity-rings" },
  { label: "Birthstone Rings", slug: "birthstone-rings" },
  { label: "Signet Rings", slug: "signet-rings" },
  { label: "Mens Rings", slug: "mens-rings" },
];

const CATEGORY_SUBS: Record<string, SubItem[]> = {
  rings: RINGS_SUBS,
  earrings: [],
  bracelets: [],
  necklaces: [],
  engagement: [],
  "wedding-bands": [],
};

const labelFor = (slug: string) =>
  ((
    {
      engagement: "Engagement",
      "wedding-bands": "Wedding Bands",
      rings: "Rings",
      bracelets: "Bracelets",
      necklaces: "Necklaces",
      earrings: "Earrings",
    } as Record<string, string>
  )[slug] ?? slug);

/* ----------------------------- SERVER DATA ------------------------------ */
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const categorySlug = String(ctx.params?.category || "").toLowerCase();
  if (!categorySlug) return { notFound: true };

  const categoryLabel = labelFor(categorySlug);

  // Optional filters
  const sub =
    typeof ctx.query.sub === "string" ? ctx.query.sub.toLowerCase() : undefined;

  const metal = ctx.query.metal
    ? Array.isArray(ctx.query.metal)
      ? ctx.query.metal.map((m) => String(m).toLowerCase())
      : [String(ctx.query.metal).toLowerCase()]
    : [];

  const stone = ctx.query.stone
    ? Array.isArray(ctx.query.stone)
      ? ctx.query.stone.map((s) => String(s).toLowerCase())
      : [String(ctx.query.stone).toLowerCase()]
    : [];

  const shape = ctx.query.shape
    ? Array.isArray(ctx.query.shape)
      ? ctx.query.shape.map((s) => String(s).toLowerCase())
      : [String(ctx.query.shape).toLowerCase()]
    : [];

  const priceMin = ctx.query.priceMin ? Number(ctx.query.priceMin) : undefined;
  const priceMax = ctx.query.priceMax ? Number(ctx.query.priceMax) : undefined;
  const caratMin = ctx.query.caratMin ? Number(ctx.query.caratMin) : undefined;
  const caratMax = ctx.query.caratMax ? Number(ctx.query.caratMax) : undefined;

  let products: Product[] = [];
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "classydiamonds");

    const q: any = { category: categorySlug };
    if (sub && sub !== "all") q.subcategory = sub;
    if (metal.length) q.metal = { $in: metal };
    if (stone.length) q.stone = { $in: stone };
    if (shape.length) q.shape = { $in: shape };
    if (priceMin !== undefined || priceMax !== undefined) {
      q.price = {};
      if (priceMin !== undefined) q.price.$gte = priceMin;
      if (priceMax !== undefined) q.price.$lte = priceMax;
    }
    if (caratMin !== undefined || caratMax !== undefined) {
      q.carat = {};
      if (caratMin !== undefined) q.carat.$gte = caratMin;
      if (caratMax !== undefined) q.carat.$lte = caratMax;
    }

    const docs = await db
      .collection("products")
      .find(q)
      .project({
        _id: 1,
        name: 1,
        price: 1,
        salePrice: 1,
        image: 1,
        imageUrl: 1, // ✅ include remote field
        category: 1,
        subcategory: 1,
        metal: 1,
        stone: 1,
        shape: 1,
        carat: 1,
        slug: 1,
      })
      .toArray();

    products = docs.map((d: any) => ({
      _id: String(d._id),
      name: d.name,
      price: d.price,
      salePrice: d.salePrice ?? null,
      image: d.imageUrl || d.image || "", // ✅ fallback to imageUrl
      category: (d.category || "").toLowerCase(),
      subcategory: (d.subcategory || d.subCategory || "").toLowerCase(),
      metal: (d.metal || "").toLowerCase(),
      stone: (d.stone || "").toLowerCase(),
      shape: (d.shape || "").toLowerCase(),
      carat: typeof d.carat === "number" ? d.carat : undefined,
      slug: d.slug,
    }));
  } catch {
    products = [];
  }

  return {
    props: {
      categorySlug,
      categoryLabel,
      subcategories: CATEGORY_SUBS[categorySlug] || [],
      products,
    },
  };
};

/* ---------------------------------- PAGE --------------------------------- */
export default function CategoryPage({
  categorySlug,
  categoryLabel,
  subcategories,
  products,
}: PageProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  // Keep ?scroll=true behavior
  useEffect(() => {
    const { scroll } = router.query as { scroll?: string };
    if (scroll === "true") {
      const header = document.getElementById("category-header");
      if (!header) return;
      const navOffset = 80;
      const y =
        header.getBoundingClientRect().top + window.scrollY - navOffset - 20;
      requestAnimationFrame(() =>
        window.scrollTo({ top: y, behavior: "smooth" })
      );
      const q = { ...router.query };
      delete (q as any).scroll;
      router.replace({ pathname: router.pathname, query: q }, undefined, {
        shallow: true,
      });
    }
  }, [router]);

  // Subcategory card images
  const subcatImage = (slug: string) => {
    if (slug === "engagement-rings") return "/category/engagement-cat.jpg";
    if (slug === "wedding-rings") return "/category/wedding-band-cat.jpg";
    if (slug === "promise-rings") return "/category/ring-cat.jpg";
    if (slug === "eternity-rings") return "/category/ring-cat.jpg";
    if (slug === "birthstone-rings") return "/category/ring-cat.jpg";
    if (slug === "signet-rings") return "/category/ring-cat.jpg";
    if (slug === "mens-rings") return "/category/ring-cat.jpg";
    return "/category/ring-cat.jpg";
  };

  return (
    <>
      <Head>
        <title>{categoryLabel} | Classy Diamonds</title>
        <meta
          name="description"
          content={`Explore ${categoryLabel} at Classy Diamonds.`}
        />
      </Head>

      {/* ✅ Breadcrumbs aligned like other pages (flush to left edge with page padding) */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-6">
        <Breadcrumbs />
      </div>

      {/* ✅ Centered title, consistent with your other pages */}
      <div className="text-center mt-2 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide">
          {categoryLabel}
        </h1>
      </div>

      {/* ONLY subcategory cards — with bottom spacing to separate from grid */}
      {subcategories.length > 0 && (
        <div className="mt-4 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SubcategoryCards
              category={categorySlug}
              subcategories={subcategories.map((s) => ({
                key: s.slug,
                label: s.label,
                image: subcatImage(s.slug),
              }))}
            />
          </div>
          {/* 👇 extra space under subcategory cards */}
          <div className="h-6 sm:h-10" />
        </div>
      )}

      {/* Anchor for scroll=true */}
      <div id="category-header" className="sr-only" aria-hidden="true" />

      {/* Main content: Sidebar + Grid — with extra top margin so cards don’t crowd subcards */}
      <section className="mt-6 sm:mt-10 px-4 sm:px-6 pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
            {/* Sidebar */}
            <div className="hidden md:block">
              <FiltersSidebar />
            </div>

            {/* Product grid */}
            {products.length === 0 ? (
              <p className="text-white/80">No products found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                {products.map((p) => {
                  const href = `/category/${encodeURIComponent(
                    categorySlug
                  )}/${encodeURIComponent(p.slug)}`;

                  return (
                    <ProductCard
                      key={p.slug}
                      slug={p.slug}
                      image={p.image}
                      name={p.name}
                      price={p.price}
                      salePrice={p.salePrice ?? null}
                      href={href}
                      onAddToCart={() =>
                        addToCart({
                          id: p._id || p.id || p.slug,
                          slug: p.slug,
                          name: p.name,
                          price: p.price,
                          discountedPrice: p.salePrice ?? undefined,
                          image: p.image,
                          quantity: 1,
                        })
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
