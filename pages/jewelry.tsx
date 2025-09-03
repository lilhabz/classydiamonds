// pages/jewelry.tsx — All Jewelry + categories + subcategory pills + FILTER SIDEBAR
"use client";

import Image from "next/image";
import Link from "next/link";
import Head from "next/head";
import { useCart } from "@/context/CartContext";
import { useEffect, useMemo, useRef, useState, useRef as useRef2 } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryGrid, { CategoryItem } from "@/components/CategoryGrid";
import FiltersSidebar from "@/components/FiltersSidebar";
import ProductCard from "@/components/ProductCard";
import { listProducts } from "@/lib/products";

export type ProductType = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  category: string;
  subcategory?: string;
  metal?: string;
  stone?: string;
  shape?: string;
  carat?: number | null;
  gender?: "unisex" | "him" | "her";
  description?: string;
};

type SubItem = { label: string; slug: string };
type CategorySlug = "rings" | "earrings" | "bracelets" | "necklaces";
const ALLOWED: readonly CategorySlug[] = [
  "rings",
  "earrings",
  "bracelets",
  "necklaces",
] as const;

/* --------------------------------- Helpers -------------------------------- */
const isRingCategory = (cat?: string) =>
  (cat ?? "").toLowerCase().includes("ring");
const toArray = (v: string | string[] | undefined): string[] =>
  !v ? [] : Array.isArray(v) ? v : [v];

/* ------------------------------- Constants -------------------------------- */
const CATEGORY_ITEMS: CategoryItem[] = [
  { label: "Rings", slug: "rings", image: "/category/ring-cat.jpg" },
  { label: "Earrings", slug: "earrings", image: "/category/earring-cat.jpg" },
  {
    label: "Bracelets",
    slug: "bracelets",
    image: "/category/bracelet-cat.jpg",
  },
  {
    label: "Necklaces & Pendants",
    slug: "necklaces",
    image: "/category/necklace-cat.jpg",
  },
];

const SUBS: Record<CategorySlug, SubItem[]> = {
  rings: [
    { label: "All", slug: "all" },
    { label: "Engagement", slug: "engagement" },
    { label: "Wedding Bands", slug: "wedding-bands" },
    { label: "Solitaire", slug: "solitaire" },
    { label: "Halo", slug: "halo" },
    { label: "Three-Stone", slug: "three-stone" },
    { label: "Eternity", slug: "eternity" },
    { label: "Men’s", slug: "mens" },
  ],
  earrings: [
    { label: "All", slug: "all" },
    { label: "Studs", slug: "studs" },
    { label: "Hoops", slug: "hoops" },
    { label: "Drops", slug: "drops" },
    { label: "Huggies", slug: "huggies" },
  ],
  bracelets: [
    { label: "All", slug: "all" },
    { label: "Tennis", slug: "tennis" },
    { label: "Bangles", slug: "bangles" },
    { label: "Cuffs", slug: "cuffs" },
    { label: "Chains", slug: "chains" },
  ],
  necklaces: [
    { label: "All", slug: "all" },
    { label: "Pendants", slug: "pendants" },
    { label: "Solitaire", slug: "solitaire" },
    { label: "Station", slug: "station" },
    { label: "Nameplates", slug: "nameplates" },
    { label: "Pearl", slug: "pearl" },
  ],
};

const CATEGORY_LABELS: Record<CategorySlug, string> = {
  rings: "Rings",
  earrings: "Earrings",
  bracelets: "Bracelets",
  necklaces: "Necklaces & Pendants",
};

/* ---------------------------------- Page ---------------------------------- */
export default function JewelryPage({ products }: { products: ProductType[] }) {
  const { addToCart } = useCart();
  const [visibleCount, setVisibleCount] = useState(50);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [activeCategorySlug, setActiveCategorySlug] =
    useState<CategorySlug | null>(null);
  const [activeSub, setActiveSub] = useState<string>("all");

  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const resetCount = () => setVisibleCount(50);

  // Strip stray ?scroll=true when no category is present (no deep-link intent)
  useEffect(() => {
    if (!router.isReady) return;
    const { scroll, category } = router.query as {
      scroll?: string;
      category?: string;
    };
    if (scroll === "true" && !category) {
      const next = { ...router.query };
      delete (next as any).scroll;
      router.replace({ pathname: "/jewelry", query: next }, undefined, {
        shallow: true,
      });
    }
  }, [router.isReady, router.query]);

  // Sync URL -> state, and perform deep-link scroll ONLY when category is present & scroll=true
  useEffect(() => {
    if (!router.isReady) return;
    const { category, sub, scroll } = router.query;

    if (
      typeof category === "string" &&
      ALLOWED.includes(category.toLowerCase() as CategorySlug)
    ) {
      const cat = category.toLowerCase() as CategorySlug;
      setActiveCategorySlug(cat);

      const subs = SUBS[cat];
      if (
        typeof sub === "string" &&
        subs?.some((s) => s.slug.toLowerCase() === sub.toLowerCase())
      ) {
        setActiveSub(sub.toLowerCase());
      } else {
        setActiveSub("all");
      }
    } else {
      setActiveCategorySlug(null);
      setActiveSub("all");
    }

    resetCount();

    // Deep-link behavior: only when explicitly requested
    if (scroll === "true" && typeof category === "string" && heroRef.current) {
      const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [router.isReady, router.query]);

  // 🔒 IMPORTANT: Do NOT auto-scroll on initial mount when no category is selected.
  // Only smooth-scroll to the grid when the user actually chooses a category (state change to non-null).
  const firstRunRef = useRef<boolean>(true);
  useEffect(() => {
    // Skip on initial mount
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    // Only scroll when a category is selected (i.e., user action or explicit URL)
    if (activeCategorySlug) {
      resetCount();
      headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // If activeCategorySlug is null, do nothing (remain at top/hero)
  }, [activeCategorySlug]);

  const pageTitle = "Jewelry Collection | Classy Diamonds";
  const pageDesc =
    "Explore timeless rings, earrings, bracelets, and necklaces & pendants.";

  const subPills: SubItem[] = activeCategorySlug
    ? SUBS[activeCategorySlug] ?? [{ label: "All", slug: "all" }]
    : [];

  const metals = toArray(router.query.metal as any).map((x) =>
    String(x).toLowerCase()
  );
  const stones = toArray(router.query.stone as any).map((x) =>
    String(x).toLowerCase()
  );
  const shapes = toArray(router.query.shape as any).map((x) =>
    String(x).toLowerCase()
  );

  const priceMin = router.query.priceMin
    ? Number(router.query.priceMin)
    : undefined;
  const priceMax = router.query.priceMax
    ? Number(router.query.priceMax)
    : undefined;
  const caratMin = router.query.caratMin
    ? Number(router.query.caratMin)
    : undefined;
  const caratMax = router.query.caratMax
    ? Number(router.query.caratMax)
    : undefined;

  const shown = useMemo(() => {
    const allowedSet = new Set(ALLOWED);
    let base = products.filter((p) =>
      allowedSet.has((p.category || "").toLowerCase() as CategorySlug)
    );

    if (activeCategorySlug) {
      base = base.filter(
        (p) => (p.category || "").toLowerCase() === activeCategorySlug
      );
      if (activeSub !== "all") {
        base = base.filter(
          (p) => (p.subcategory || "").toLowerCase() === activeSub
        );
      }
    }

    const meets = (p: ProductType) => {
      const metalOk = metals.length
        ? metals.includes((p.metal || "").toLowerCase())
        : true;
      const stoneOk = stones.length
        ? stones.includes((p.stone || "").toLowerCase())
        : true;
      const shapeOk = shapes.length
        ? shapes.includes((p.shape || "").toLowerCase())
        : true;

      const effectivePrice = (p.salePrice ?? p.price) as number;
      const priceOk =
        (priceMin === undefined || effectivePrice >= priceMin) &&
        (priceMax === undefined || effectivePrice <= priceMax);

      const caratVal = typeof p.carat === "number" ? p.carat : null;
      const caratOk =
        caratMin === undefined && caratMax === undefined
          ? true
          : caratVal !== null &&
            (caratMin === undefined || caratVal >= caratMin) &&
            (caratMax === undefined || caratVal <= caratMax);

      return metalOk && stoneOk && shapeOk && priceOk && caratOk;
    };

    return base.filter(meets);
  }, [
    products,
    activeCategorySlug,
    activeSub,
    metals,
    stones,
    shapes,
    priceMin,
    priceMax,
    caratMin,
    caratMax,
  ]);

  const totalProducts = shown.length;

  const goCategory = (slug: CategorySlug) => {
    setActiveCategorySlug(slug);
    setActiveSub("all");
    router.push(
      {
        pathname: "/jewelry",
        query: { category: slug, scroll: "true", ...router.query },
      },
      undefined,
      { shallow: true }
    );
  };

  const goSub = (slug: string) => {
    if (!activeCategorySlug) return;
    setActiveSub(slug);
    const next = { ...router.query };
    if (slug === "all") delete (next as any).sub;
    else (next as any).sub = slug;
    next.category = activeCategorySlug;
    router.push({ pathname: "/jewelry", query: next }, undefined, {
      shallow: true,
    });
  };

  const heading = activeCategorySlug
    ? CATEGORY_LABELS[activeCategorySlug]
    : "All Jewelry";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-3xl md:text-6xl font-serif font-bold tracking-wider leading-snug mb-4">
            Jewelry Collection
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto leading-relaxed tracking-wide">
            Discover timeless pieces crafted with passion.
          </p>
        </div>
      </section>

      {/* 🧭 Breadcrumbs */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-8">
        <Breadcrumbs />
      </div>

      {/* 💎 Category Tiles */}
      <section
        ref={headerRef}
        className="pt-6 pb-4 px-0 sm:px-0 w-full"
        style={{ scrollMarginTop: "40px" }}
      >
        <CategoryGrid
          items={CATEGORY_ITEMS}
          title="Shop by Category"
          fullBleedDesktop
          desktopCols={4}
          routeTo="/category"
        />
      </section>

      {/* 🔖 Subcategory pills (only when a category is selected) */}
      {activeCategorySlug && (
        <section className="mt-2 mb-4 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <h3 className="sr-only">Filters</h3>
            {/* mobile */}
            <div className="sm:hidden mt-1 overflow-x-auto">
              <div className="flex gap-2 w-max">
                {SUBS[activeCategorySlug].map((s) => {
                  const active = activeSub === s.slug.toLowerCase();
                  return (
                    <button
                      key={s.slug}
                      onClick={() => goSub(s.slug)}
                      className={
                        "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap border " +
                        (active
                          ? "bg-white text-[#1f2a44] border-white"
                          : "bg-[#25304f] text-white border-white/20 hover:bg-[#2b3760]")
                      }
                      aria-pressed={active}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* desktop */}
            <div className="hidden sm:flex gap-2 mt-1 flex-wrap">
              {SUBS[activeCategorySlug].map((s) => {
                const active = activeSub === s.slug.toLowerCase();
                return (
                  <button
                    key={s.slug}
                    onClick={() => goSub(s.slug)}
                    className={
                      "px-3 py-2 rounded-lg text-sm font-medium border " +
                      (active
                        ? "bg-white text-[#1f2a44] border-white"
                        : "bg-[#25304f] text-white border-white/20 hover:bg-[#2b3760]")
                    }
                    aria-pressed={active}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 🏷️ Dynamic heading */}
      <div className="text-center mt-2 px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug">
          {heading}
        </h2>
      </div>

      {/* 🧰 SIDEBAR + GRID */}
      <section className="mt-6 px-0 sm:px-6 lg:pl-0 lg:pr-8 max-w-none sm:max-w-7xl sm:mx-auto mb-20">
        {/* Mobile filters trigger */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <div className="text-sm text-white/80">
            {shown.length} {shown.length === 1 ? "item" : "items"}
          </div>
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors"
            aria-haspopup="dialog"
            aria-controls="filters-drawer"
          >
            Filters
          </button>
        </div>

        {/* Drawer (mobile/tablet only) */}
        <FiltersSidebar
          mode="drawer"
          open={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Desktop sticky sidebar */}
          <div className="hidden lg:block">
            <FiltersSidebar mode="desktop" />
          </div>

          {/* Product Grid */}
          <div className="flex justify-center">
            {shown.length === 0 ? (
              <p className="text-white/80">No products found.</p>
            ) : (
              <div
  className="
    product-grid-fullbleed
    sm:grid sm:grid-cols-3 lg:grid-cols-4
    sm:gap-6 sm:justify-items-center
    w-full
    max-w-none sm:max-w-[705px] lg:max-w-[948px]
    sm:mx-auto
  "
  style={{
    ["--grid-gap" as any]: "16px", // tighter mobile gap (optional)
    ["--img-ratio-mobile" as any]: "1.28",
    ["--mobile-font-scale" as any]: "0.84",
  }}
>

                {shown.slice(0, visibleCount).map((product) => {
                  const href = `/category/${product.category}/${product.slug}`;
                  return (
                    <ProductCard
                      key={product.id}
                      slug={product.slug}
                      image={product.image}
                      name={product.name}
                      price={product.price}
                      salePrice={product.salePrice ?? null}
                      href={href}
                      onAddToCart={() => {
                        if (
                          (product.category || "")
                            .toLowerCase()
                            .includes("ring")
                        ) {
                          return router.push(href);
                        }
                        addToCart({
                          id: product.id,
                          slug: product.slug,
                          name: product.name,
                          price: product.price,
                          discountedPrice: product.salePrice ?? undefined,
                          image: product.image,
                          quantity: 1,
                        });
                      }}
                    />
                  );
                })}
              </div>
            )}
            {visibleCount < totalProducts && shown.length > 0 && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setVisibleCount((v) => v + 50)}
                  className="px-8 py-4 bg-[var(--foreground)] text-[var(--bg-nav)] rounded-full"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ----------------------------- Server-side data ---------------------------- */
export const getServerSideProps: GetServerSideProps = async () => {
  const rows = await listProducts({}, { sort: { createdAt: -1 }, limit: 2000 });

  const ALLOWED_SET = new Set<"rings" | "earrings" | "bracelets" | "necklaces">(
    ["rings", "earrings", "bracelets", "necklaces"]
  );

  const products: ProductType[] = rows
    .filter((p: any) =>
      ALLOWED_SET.has(String(p.category || "").toLowerCase() as any)
    )
    .map((p: any) => ({
      id: String(p._id),
      slug: p.slug,
      name: p.title || p.name || "",
      price: p.price ?? p.unitPrice ?? 0,
      salePrice: p.salePrice ?? p.discountedPrice ?? null,
      image:
        p.imageUrl ||
        (Array.isArray(p.images) && p.images.length ? p.images[0] : "") ||
        "",
      category: (p.category || "").toLowerCase(),
      subcategory: (p.subCategory ?? p.subcategory ?? "").toLowerCase(),
      metal: (p.metal || "").toLowerCase(),
      stone: (p.stone || "").toLowerCase(),
      shape: (p.shape || "").toLowerCase(),
      carat: typeof p.carat === "number" ? p.carat : null,
      gender: p.gender || "unisex",
      description: p.description || "",
    }));

  return { props: { products } };
};
