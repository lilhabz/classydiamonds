// pages/jewelry.tsx — All Jewelry + categories + subcategory pills + FILTER SIDEBAR
"use client";

import Image from "next/image";
import Head from "next/head";
// ❌ removed CartContext import (no add-to-cart from cards)
// import { useCart } from "@/context/CartContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import type { GetServerSideProps } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CategoryGrid, { CategoryItem } from "@/components/CategoryGrid";
import FiltersSidebar from "@/components/FiltersSidebar";
import ProductGrid from "@/components/ProductGrid"; // ✅ use shared grid
import { listProducts } from "@/lib/products";
import SubcategoryGrid from "@/components/SubcategoryGrid";
import SubcategoryCards from "@/components/SubcategoryCards";

/* ----------------------------- Canonical helper ---------------------------- */
// 🔒 Canonical slugs guard: maps legacy "necklaces" → "necklaces-pendants"
const canonicalizeCategory = (raw: string) => {
  const v = String(raw || "").toLowerCase();
  if (v === "necklaces") return "necklaces-pendants";
  return v;
};

export type Audience = "him" | "her";

export type ProductType = {
  id: string;
  slug: string;
  name: string;
  price: number;
  salePrice?: number | null;
  image: string;
  category: string; // canonical
  subcategory?: string;
  metal?: string;
  stone?: string;
  shape?: string;
  carat?: number | null;
  /** ✅ New (preferred): audience array */
  audience?: Audience[];
  /** ⚠️ Legacy: kept for compat; normalized at runtime */
  gender?: "unisex" | "him" | "her";
  description?: string;
  inStock?: boolean; // ✅ real stock flag
};

type SubItem = { label: string; slug: string };
// ✅ include canonical "necklaces-pendants"
type CategorySlug = "rings" | "earrings" | "bracelets" | "necklaces-pendants";
const ALLOWED: readonly CategorySlug[] = [
  "rings",
  "earrings",
  "bracelets",
  "necklaces-pendants",
] as const;

/* --------------------------------- Helpers -------------------------------- */
const toArray = (v: string | string[] | undefined): string[] =>
  !v ? [] : Array.isArray(v) ? v : [v];

const TITLE = (s: string) =>
  s
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/\s{2,}/g, " ")
    .trim();

/** Normalize query audience (and legacy gender) → Set<"him"|"her"> */
function normalizeAudienceFromQuery(q: {
  audience?: string | string[];
  gender?: string | string[];
}): Set<Audience> | null {
  const vals = [
    ...toArray(q.audience),
    ...toArray(q.gender), // legacy
  ]
    .map((s) => String(s).toLowerCase().trim())
    .filter(Boolean);

  if (vals.length === 0) return null;

  const set = new Set<Audience>();
  for (const v of vals) {
    if (v === "him" || v === "male" || v === "men" || v === "for-him")
      set.add("him");
    if (v === "her" || v === "female" || v === "women" || v === "for-her")
      set.add("her");
    if (v === "unisex" || v === "all" || v === "any") {
      set.add("him");
      set.add("her");
    }
  }
  return set.size ? set : null;
}

/** Determine a product's audience set from either audience[] or legacy gender */
function productAudiences(p: ProductType): Set<Audience> {
  const set = new Set<Audience>();
  if (Array.isArray(p.audience) && p.audience.length) {
    for (const a of p.audience) {
      const v = String(a).toLowerCase();
      if (v === "him" || v === "male" || v === "men" || v === "for-him")
        set.add("him");
      if (v === "her" || v === "female" || v === "women" || v === "for-her")
        set.add("her");
      if (v === "unisex" || v === "all" || v === "any") {
        set.add("him");
        set.add("her");
      }
    }
  } else if (p.gender) {
    const g = String(p.gender).toLowerCase();
    if (g === "unisex" || g === "all" || g === "any") {
      set.add("him");
      set.add("her");
    } else if (g === "him" || g === "male" || g === "men" || g === "for-him") {
      set.add("him");
    } else if (
      g === "her" ||
      g === "female" ||
      g === "women" ||
      g === "for-her"
    ) {
      set.add("her");
    }
  } else {
    // No info → treat as unisex so it appears in both views
    set.add("him");
    set.add("her");
  }
  return set;
}

/* ------------------------------- Constants -------------------------------- */
// ✅ Use canonical slug here too
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
    slug: "necklaces-pendants", // ✅ canonical
    image: "/category/necklace-cat.jpg",
  },
];

// ✅ SUBS keyed by canonical category slugs
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
  "necklaces-pendants": [
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
  "necklaces-pendants": "Necklaces & Pendants",
};

/* --------------------------- Inline icon components ------------------------ */
function IconHamburger(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M3 6h18M3 12h18M3 18h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconClose(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------------------------------- Page ---------------------------------- */
// 🆕 accepts optional heroTitle / seoTitle overrides (legacy), but now derives from ?audience= by default
export default function JewelryPage({
  products,
  heroTitle,
  seoTitle,
}: {
  products: ProductType[];
  heroTitle?: string;
  seoTitle?: string;
}) {
  // const { addToCart } = useCart();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [activeCategorySlug, setActiveCategorySlug] =
    useState<CategorySlug | null>(null);
  const [activeSub, setActiveSub] = useState<string>("all");

  const heroRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Strip stray ?scroll=true when no category is present (safe no-op now)
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

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileFiltersOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [mobileFiltersOpen]);

  // Sync URL -> state (kept for backward-compat deep links; harmless otherwise)
  useEffect(() => {
    if (!router.isReady) return;
    const { category, sub, scroll } = router.query;

    if (typeof category === "string") {
      const cat = canonicalizeCategory(category) as CategorySlug;
      if (ALLOWED.includes(cat)) {
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
    } else {
      setActiveCategorySlug(null);
      setActiveSub("all");
    }

    if (scroll === "true" && typeof category === "string" && heroRef.current) {
      const offset = heroRef.current.offsetTop + heroRef.current.offsetHeight;
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
  }, [router.isReady, router.query]);

  // Do NOT auto-scroll on initial mount when no category is selected.
  const firstRunRef = useRef<boolean>(true);
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (activeCategorySlug) {
      headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeCategorySlug]);

  // 🔎 Parse URL filters
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

  // 🎯 NEW: audience filter from URL (supports legacy ?gender=)
  const audienceWanted = useMemo(
    () =>
      normalizeAudienceFromQuery({
        audience: router.query.audience as any,
        gender: router.query.gender as any,
      }),
    [router.query.audience, router.query.gender]
  );

  const shown = useMemo(() => {
    const allowedSet = new Set(ALLOWED);
    let base = products.filter((p) =>
      allowedSet.has(canonicalizeCategory(p.category) as CategorySlug)
    );

    if (activeCategorySlug) {
      base = base.filter(
        (p) => canonicalizeCategory(p.category) === activeCategorySlug
      );
      if (activeSub !== "all") {
        base = base.filter(
          (p) => (p.subcategory || "").toLowerCase() === activeSub
        );
      }
    }

    // 🎯 NEW: apply audience filter (supports array or legacy gender)
    if (audienceWanted && audienceWanted.size) {
      base = base.filter((p) => {
        const pa = productAudiences(p);
        // match if intersection is non-empty
        for (const a of audienceWanted) {
          if (pa.has(a)) return true;
        }
        return false;
      });
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
    audienceWanted,
    metals,
    stones,
    shapes,
    priceMin,
    priceMax,
    caratMin,
    caratMax,
  ]);

  const goSub = (slug: string) => {
    if (!activeCategorySlug) return;
    setActiveSub(slug);
    const next = { ...router.query };
    if (slug === "all") delete (next as any).sub;
    else (next as any).sub = slug;
    next.category = activeCategorySlug;
    // ✅ preserves ?audience= in the URL automatically via spreading query
    router.push({ pathname: "/jewelry", query: next }, undefined, {
      shallow: true,
    });
  };

  // 🧭 Audience for breadcrumbs (only when exactly one audience is selected)
  const breadcrumbAudience: Audience | undefined = useMemo(() => {
    if (!audienceWanted) return undefined;
    if (audienceWanted.size === 1) {
      const only = Array.from(audienceWanted)[0];
      return only;
    }
    return undefined;
  }, [audienceWanted]);

  // 🆕 Derive friendly hero & SEO titles from audience (unless explicitly overridden via props)
  const audienceLabel: string | null = useMemo(() => {
    if (!breadcrumbAudience) return null;
    return breadcrumbAudience === "him" ? "For Him" : "For Her";
  }, [breadcrumbAudience]);

  const computedHeroTitle =
    heroTitle ||
    (audienceLabel ? `${audienceLabel} Jewelry` : "Jewelry Collection");

  const defaultSeoTitle = audienceLabel
    ? `${audienceLabel} Jewelry | Classy Diamonds`
    : "Jewelry Collection | Classy Diamonds";

  const pageTitle = seoTitle || defaultSeoTitle;

  const pageDesc = audienceLabel
    ? `Explore ${audienceLabel.toLowerCase()} pieces across rings, earrings, bracelets, and necklaces & pendants.`
    : "Explore timeless rings, earrings, bracelets, and necklaces & pendants.";

  const heading = activeCategorySlug
    ? CATEGORY_LABELS[activeCategorySlug]
    : computedHeroTitle;

  // Derive a friendly type label per product (prefer subcategory, else category)
  const typeFrom = (p: ProductType) => {
    const sub = (p.subcategory || "").trim();
    if (sub && sub !== "all") return TITLE(sub);
    const canon = canonicalizeCategory(p.category) as CategorySlug;
    return CATEGORY_LABELS[canon] ?? TITLE(p.category || "");
  };

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
            {computedHeroTitle}
          </h1>
          <p className="text-base md:text-xl max-w-2xl mx-auto leading-relaxed tracking-wide">
            Discover timeless pieces crafted with passion.
          </p>
        </div>
      </section>

      {/* 🧭 Breadcrumbs */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-8">
        <Breadcrumbs audience={breadcrumbAudience} />
      </div>

      {/* 💎 Category Tiles — now stay on /jewelry via querystring */}
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
          routeTo="/jewelry" // ✅ changed from "/category" → keeps navigation on jewelry.tsx
        />
      </section>

      {/* 🔖 Subcategory UI (only when deep-linked to ?category=…) */}
      {activeCategorySlug && (
        <section className="mt-2 mb-4">
          <div className="mx-auto max-w-7xl">
            {/* Mobile: swipe row */}
            <div className="sm:hidden">
              <SubcategoryGrid
                category={activeCategorySlug}
                subcategories={SUBS[activeCategorySlug]}
                activeSlug={activeSub}
                onSelect={(slug) => goSub(slug)}
                layout="row"
              />
            </div>

            {/* Desktop: 6 smaller photo cards in a single line */}
            <div className="hidden sm:block">
              <SubcategoryGrid
                category={activeCategorySlug}
                subcategories={SUBS[activeCategorySlug]}
                activeSlug={activeSub}
                onSelect={(slug) => goSub(slug)}
                layout="desktop-grid"
                desktopCols={6}
                desktopGapPx={12}
                desktopCardScale={0.82}
              />
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
      {/* ⬇️ CHANGED: clamp widened so 4-up fits beside the sidebar */}
      <section className="mt-6 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto mb-20">
        {/* Mobile filters trigger */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <div className="text-sm text-white/80">
            {shown.length} {shown.length === 1 ? "item" : "items"}
          </div>
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg:white/5 hover:bg-white/10 text-sm font-medium transition-colors"
            aria-haspopup="dialog"
            aria-controls="filters-drawer"
          >
            <IconHamburger className="w-5 h-5" />
            Filters
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Desktop sticky sidebar */}
          <div className="hidden lg:block">
            <FiltersSidebar mode="desktop" />
          </div>

          {/* Right column (grid) */}
          <div className="jewelry-fixed">
            {shown.length === 0 ? (
              <p className="text-white/80">No products found.</p>
            ) : (
              <ProductGrid
                items={shown.map((product) => {
                  const category = canonicalizeCategory(
                    product.category || ""
                  ) as CategorySlug;
                  const href = `/category/${category}/${product.slug}`;
                  return {
                    slug: product.slug,
                    image: product.image,
                    name: product.name,
                    price: product.price,
                    salePrice: product.salePrice ?? null,
                    href,
                    inStock: product.inStock, // ✅ real stock
                    typeLabel: typeFrom(product),
                    categorySlug: category, // helps color swatch fallback
                    subcategorySlug: product.subcategory ?? null,
                  };
                })}
              />
            )}
          </div>
        </div>
      </section>

      {/* 📱 Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div
          id="filters-drawer"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] lg:hidden"
        >
          {/* Backdrop */}
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
          />
          {/* Panel */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-[var(--bg-page)] shadow-xl border-l border-white/10 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-base font-semibold">Filters</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 rounded-md hover:bg-white/10"
                aria-label="Close"
              >
                <IconClose className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24">
              <FiltersSidebar
                mode="drawer"
                open={mobileFiltersOpen}
                onClose={() => setMobileFiltersOpen(false)}
              />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[var(--bg-page)]">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full px-4 py-3 rounded-lg bg-[var(--foreground)] text-[var(--bg-nav)] font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 Page-scoped override: force explicit 2→3→4 columns ONLY here */}
      <style jsx>{`
        .jewelry-fixed :global(.product-grid) {
          grid-template-columns: repeat(2, minmax(var(--card-w), 1fr));
        }
        @media (min-width: 768px) {
          .jewelry-fixed :global(.product-grid) {
            grid-template-columns: repeat(3, minmax(var(--card-w), 1fr));
          }
        }
        @media (min-width: 1024px) {
          .jewelry-fixed :global(.product-grid) {
            grid-template-columns: repeat(4, minmax(var(--card-w), 1fr));
          }
        }
      `}</style>
    </div>
  );
}

/* ----------------------------- Server-side data ---------------------------- */
export const getServerSideProps: GetServerSideProps = async () => {
  const rows = await listProducts({}, { sort: { createdAt: -1 }, limit: 2000 });

  // ✅ include canonical slug
  const ALLOWED_SET = new Set<
    "rings" | "earrings" | "bracelets" | "necklaces-pendants"
  >(["rings", "earrings", "bracelets", "necklaces-pendants"]);

  const products: ProductType[] = rows
    .map((p: any) => {
      const cat = canonicalizeCategory(String(p.category || ""));
      // Normalize audience from either p.audience (array/string) or legacy p.gender
      let audienceArr: Audience[] | undefined;
      if (Array.isArray(p.audience)) {
        const set = new Set<Audience>();
        for (const a of p.audience) {
          const v = String(a).toLowerCase();
          if (v === "him" || v === "male" || v === "men" || v === "for-him")
            set.add("him");
          if (v === "her" || v === "female" || v === "women" || v === "for-her")
            set.add("her");
          if (v === "unisex" || v === "all" || v === "any") {
            set.add("him");
            set.add("her");
          }
        }
        audienceArr = Array.from(set);
      } else if (typeof p.audience === "string") {
        const v = String(p.audience).toLowerCase();
        if (v === "unisex" || v === "all" || v === "any")
          audienceArr = ["him", "her"];
        else if (v === "him" || v === "male" || v === "men" || v === "for-him")
          audienceArr = ["him"];
        else if (
          v === "her" ||
          v === "female" ||
          v === "women" ||
          v === "for-her"
        )
          audienceArr = ["her"];
      } else if (p.gender) {
        const g = String(p.gender).toLowerCase();
        if (g === "unisex" || g === "all" || g === "any")
          audienceArr = ["him", "her"];
        else if (g === "him" || g === "male" || g === "men" || g === "for-him")
          audienceArr = ["him"];
        else if (
          g === "her" ||
          g === "female" ||
          g === "women" ||
          g === "for-her"
        )
          audienceArr = ["her"];
      }
      // Default to unisex if nothing provided
      if (!audienceArr || audienceArr.length === 0)
        audienceArr = ["him", "her"];

      return {
        id: String(p._id),
        slug: p.slug,
        name: p.title || p.name || "",
        price: p.price ?? p.unitPrice ?? 0,
        salePrice: p.salePrice ?? p.discountedPrice ?? null,
        image:
          p.imageUrl ||
          (Array.isArray(p.images) && p.images.length ? p.images[0] : "") ||
          "",
        category: cat, // ✅ normalized here
        subcategory: (p.subCategory ?? p.subcategory ?? "").toLowerCase(),
        metal: (p.metal || "").toLowerCase(),
        stone: (p.stone || "").toLowerCase(),
        shape: (p.shape || "").toLowerCase(),
        carat: typeof p.carat === "number" ? p.carat : null,
        audience: audienceArr, // ✅ new array schema
        gender: p.gender || "unisex", // ⚠️ legacy kept for compat
        description: p.description || "",
        // ✅ Real stock derivation (compatible with several backends)
        inStock:
          typeof p.inStock === "boolean"
            ? p.inStock
            : typeof p.stock === "boolean"
            ? p.stock
            : typeof p.quantity === "number"
            ? p.quantity > 0
            : true,
      } as ProductType;
    })
    .filter((p: ProductType) => ALLOWED_SET.has(p.category as any));

  return { props: { products } };
};
