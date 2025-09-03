// pages/category/[category]/index.tsx

import Head from "next/head";
import { GetServerSideProps } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import FiltersSidebar from "@/components/FiltersSidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";
import { CATEGORY_LABELS, SUBCATEGORY_MAP } from "@/data/taxonomy";
import SubcategoryCards from "@/components/SubcategoryCards";

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

/* ------------------------- Helpers ------------------------- */
const pretty = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/* ----------------------------- SERVER DATA ------------------------------ */
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const categorySlug = String(ctx.params?.category || "").toLowerCase();
  if (!categorySlug) return { notFound: true };

  const categoryLabel =
    CATEGORY_LABELS[categorySlug as keyof typeof CATEGORY_LABELS] ??
    categorySlug;

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
        imageUrl: 1,
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
      image: d.imageUrl || d.image || "",
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

  // Build subcategory cards from taxonomy (not hardcoded)
  const subSlugs =
    SUBCATEGORY_MAP[categorySlug as keyof typeof SUBCATEGORY_MAP] || [];
  const subcategories: SubItem[] = subSlugs.map((slug) => ({
    slug,
    label: pretty(slug),
  }));

  return {
    props: {
      categorySlug,
      categoryLabel,
      subcategories,
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

  // Subcategory card images (fallbacks)
  const subcatImage = (slug: string) => {
    if (categorySlug === "rings") {
      if (slug === "engagement-rings") return "/category/engagement-cat.jpg";
      if (slug === "wedding-rings") return "/category/wedding-band-cat.jpg";
      return "/category/ring-cat.jpg";
    }
    if (categorySlug === "earrings") return "/category/earring-cat.jpg";
    if (categorySlug === "bracelets") return "/category/bracelet-cat.jpg";
    if (categorySlug === "necklaces-pendants")
      return "/category/necklace-cat.jpg";
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

      {/* Breadcrumbs */}
      <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-8 mb-6">
        <Breadcrumbs />
      </div>

      {/* Title */}
      <div className="text-center mt-2 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide">
          {categoryLabel}
        </h1>
      </div>

      {/* Subcategory photo row (slides on mobile, one line on desktop) */}
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
          <div className="h-6 sm:h-10" />
        </div>
      )}

      {/* Anchor for scroll=true */}
      <div id="category-header" className="sr-only" aria-hidden="true" />

      {/* Main content: Sidebar + Grid */}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
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
