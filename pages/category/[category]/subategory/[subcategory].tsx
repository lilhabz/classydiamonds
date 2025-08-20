// pages/category/[category]/subcategory/[subcategory].tsx
"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import FiltersSidebar from "@/components/FiltersSidebar";
import HeroBanner from "@/components/HeroBanner";
import Breadcrumbs from "@/components/Breadcrumbs";

/* ------------------------------ Types ------------------------------ */
type Product = {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  subcategory?: string;
  metal?: string;
  stone?: string;
  shape?: string;
  carat?: number;
  slug: string;
};

type PageProps = {
  categorySlug: string;
  categoryLabel: string;
  subcategorySlug: string;
  subcategoryLabel: string;
  heroImage: string;
  heroSubtitle?: string;
  products: Product[];
};

/* ------------------------- Label / Hero maps ------------------------- */
// Reuse the same labels you used on the category page
const CATEGORY_LABELS: Record<string, string> = {
  engagement: "Engagement",
  "wedding-bands": "Wedding Bands",
  rings: "Rings",
  bracelets: "Bracelets",
  necklaces: "Necklaces",
  earrings: "Earrings",
};

const HERO_BY_CATEGORY: Record<string, { image: string; subtitle?: string }> = {
  engagement: {
    image: "/category-hero/engagement-ring-hero.jpg",
    subtitle: "Signature solitaires and brilliant halos.",
  },
  "wedding-bands": {
    image: "/category-hero/wedding-band-hero.jpg",
    subtitle: "Classic, comfort-fit, pavé and more.",
  },
  rings: {
    image: "/category-hero/ring-hero.jpg",
    subtitle: "From timeless designs to bold statements.",
  },
  bracelets: {
    image: "/category-hero/bracelet-hero.jpg",
    subtitle: "Chain, cuff, tennis and more.",
  },
  necklaces: {
    image: "/category-hero/necklace-hero.jpg",
    subtitle: "Minimal to ornate — elevate every neckline.",
  },
  earrings: {
    image: "/category-hero/earring-hero.jpg",
    subtitle: "Studs, hoops, drops and more.",
  },
};

const titleCase = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

/* ----------------------------- SSR ------------------------------ */
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const categorySlug = String(ctx.params?.category || "").toLowerCase();
  const subcategorySlug = String(ctx.params?.subcategory || "").toLowerCase();

  if (!categorySlug || !subcategorySlug) return { notFound: true };

  const categoryLabel =
    CATEGORY_LABELS[categorySlug] ?? titleCase(categorySlug);
  const subcategoryLabel = titleCase(subcategorySlug);

  // Read optional query filters (so filters work on subcategory page too)
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

    const q: any = { category: categorySlug, subcategory: subcategorySlug };
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
      salePrice: d.salePrice,
      image: d.image,
      category: (d.category || "").toLowerCase(),
      subcategory: (d.subcategory || d.subCategory || "").toLowerCase(),
      metal: (d.metal || "").toLowerCase(),
      stone: (d.stone || "").toLowerCase(),
      shape: (d.shape || "").toLowerCase(),
      carat: typeof d.carat === "number" ? d.carat : undefined,
      slug: d.slug,
    }));
  } catch (e) {
    products = [];
  }

  const hero = HERO_BY_CATEGORY[categorySlug] ?? {
    image: "/hero-jewelry.jpg",
    subtitle: undefined,
  };

  return {
    props: {
      categorySlug,
      categoryLabel,
      subcategorySlug,
      subcategoryLabel,
      heroImage: hero.image,
      heroSubtitle: hero.subtitle,
      products,
    },
  };
};

/* ---------------------------------- PAGE --------------------------------- */
export default function SubcategoryPage({
  categorySlug,
  categoryLabel,
  subcategorySlug,
  subcategoryLabel,
  heroImage,
  heroSubtitle,
  products,
}: PageProps) {
  const router = useRouter();

  // Preserve your ?scroll=true behavior
  useEffect(() => {
    const { scroll } = router.query as { scroll?: string };
    if (scroll === "true") {
      const header = document.getElementById("subcategory-header");
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

  return (
    <>
      <Head>
        <title>
          {subcategoryLabel}{" "}
          {categoryLabel !== subcategoryLabel ? `| ${categoryLabel}` : ""} |
          Classy Diamonds
        </title>
        <meta
          name="description"
          content={`Shop ${subcategoryLabel} in ${categoryLabel}. Filter by metal, stone, shape, price, and carat.`}
        />
      </Head>

      {/* 80vh hero, matches Home */}
      <HeroBanner
        title={subcategoryLabel}
        subtitle={categoryLabel}
        imageSrc={heroImage}
        heightClass="h-[80vh]"
        topOffsetClass="-mt-20"
        overlay="solid"
      />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4">
        <Breadcrumbs />
      </div>

      {/* Back link to the parent category */}
      <div className="px-4 sm:px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide mb-4">
            {subcategoryLabel}
          </h1>
          <Link
            href={`/category/${categorySlug}`}
            className="text-sm underline text-white/90 hover:text-white"
          >
            Back to all {categoryLabel}
          </Link>
        </div>
      </div>

      {/* Anchor for scroll=true */}
      <div id="subcategory-header" className="sr-only" aria-hidden="true" />

      {/* Main content: Sidebar + Grid */}
      <section className="px-4 sm:px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
            {/* Filters on subcategory too (optional but useful) */}
            <div className="hidden md:block">
              <FiltersSidebar />
            </div>

            {/* Product grid */}
            {products.length === 0 ? (
              <p className="text-white/80">No products found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((p) => {
                  const href = `/category/${encodeURIComponent(
                    categorySlug
                  )}/${encodeURIComponent(p.slug)}`;
                  return (
                    <Link
                      key={p.slug}
                      href={href}
                      className="group rounded-xl overflow-hidden bg-[#25304f] hover:shadow-xl transition"
                    >
                      <div className="relative aspect-square">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-black/20" />
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:underline">
                          {p.name}
                        </h4>
                        <div className="mt-1">
                          {p.salePrice ? (
                            <div className="flex items-center gap-2">
                              <span className="text-white font-semibold">
                                ${Number(p.salePrice).toFixed(2)}
                              </span>
                              <span className="text-white/60 line-through text-sm">
                                ${Number(p.price).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-white font-semibold">
                              ${Number(p.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
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
