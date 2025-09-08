// pages/category/[category]/index.tsx
// Category landing (e.g., /category/rings, /category/bracelets)

import Head from "next/head";
import { GetServerSideProps } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import clientPromise from "@/lib/mongodb";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductCard from "@/components/ProductCard";
import SubcategoryCards from "@/components/SubcategoryCards";
import { CATEGORY_LABELS, SUBCATEGORY_MAP } from "@/data/taxonomy";

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
  inStock?: boolean;
};

type SubItem = { label: string; slug: string };

type PageProps = {
  categoryUi: string; // from URL (e.g., "rings")
  categoryLabel: string; // pretty label from taxonomy
  products: Product[];
  subcategories: SubItem[]; // for the subcategory card row
};

/* ------------------------- Helpers ------------------------- */
const titleCase = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const canonicalCandidates = (cat: string) => {
  // Accept singular/plural and common variants in DB
  const v = cat.toLowerCase();
  const set = new Set<string>([v]);
  if (v === "rings") set.add("ring");
  if (v === "ring") set.add("rings");
  if (v === "earrings") set.add("earring");
  if (v === "earring") set.add("earrings");
  if (v === "bracelets") set.add("bracelet");
  if (v === "bracelet") set.add("bracelets");
  if (v === "necklaces" || v === "necklace") set.add("necklaces-pendants");
  if (v === "necklaces-pendants") {
    set.add("necklaces");
    set.add("necklace");
  }
  return Array.from(set);
};

const prettySub = (slug: string) =>
  slug.endsWith("-rings")
    ? titleCase(slug.replace(/-rings$/, "")) + " Rings"
    : titleCase(slug);

/* ----------------------------- SERVER DATA ------------------------------ */
export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const categoryUi = String(ctx.params?.category || "").toLowerCase();
  if (!categoryUi) return { notFound: true };

  // Pretty label for category
  const categoryLabel =
    CATEGORY_LABELS[categoryUi as keyof typeof CATEGORY_LABELS] ??
    titleCase(categoryUi);

  // Build subcategory list for the row
  const subSlugs =
    SUBCATEGORY_MAP[categoryUi as keyof typeof SUBCATEGORY_MAP] || [];
  const subcategories: SubItem[] = subSlugs.map((slug) => ({
    slug,
    label: prettySub(slug),
  }));

  // Optional filters via querystring (same keys as on [sub].tsx)
  const metal = ctx.query.metal
    ? (Array.isArray(ctx.query.metal)
        ? ctx.query.metal
        : [ctx.query.metal]
      ).map((m) => String(m).toLowerCase())
    : [];
  const stone = ctx.query.stone
    ? (Array.isArray(ctx.query.stone)
        ? ctx.query.stone
        : [ctx.query.stone]
      ).map((s) => String(s).toLowerCase())
    : [];
  const shape = ctx.query.shape
    ? (Array.isArray(ctx.query.shape)
        ? ctx.query.shape
        : [ctx.query.shape]
      ).map((s) => String(s).toLowerCase())
    : [];
  const priceMin = ctx.query.priceMin ? Number(ctx.query.priceMin) : undefined;
  const priceMax = ctx.query.priceMax ? Number(ctx.query.priceMax) : undefined;
  const caratMin = ctx.query.caratMin ? Number(ctx.query.caratMin) : undefined;
  const caratMax = ctx.query.caratMax ? Number(ctx.query.caratMax) : undefined;

  // Query products for the WHOLE category (no sub filter here)
  const catCandidates = canonicalCandidates(categoryUi);

  let products: Product[] = [];
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "classydiamonds");

    const q: any = { category: { $in: catCandidates } };
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
        inStock: 1,
        stock: 1,
        quantity: 1,
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
      inStock:
        typeof d.inStock === "boolean"
          ? d.inStock
          : typeof d.stock === "boolean"
          ? d.stock
          : typeof d.quantity === "number"
          ? d.quantity > 0
          : true,
    }));
  } catch {
    products = [];
  }

  return {
    props: { categoryUi, categoryLabel, products, subcategories },
  };
};

/* ---------------------------------- PAGE --------------------------------- */
export default function CategoryLanding({
  categoryUi,
  categoryLabel,
  products,
  subcategories,
}: PageProps) {
  const router = useRouter();

  // honor ?scroll=true like elsewhere
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

  const subcatImage = (slug: string) => {
    if (categoryUi === "rings" || categoryUi === "ring") {
      if (slug === "engagement-rings") return "/category/engagement-cat.jpg";
      if (slug === "wedding-rings") return "/category/wedding-band-cat.jpg";
      return "/category/ring-cat.jpg";
    }
    if (categoryUi === "earrings" || categoryUi === "earring")
      return "/category/earring-cat.jpg";
    if (categoryUi === "bracelets" || categoryUi === "bracelet")
      return "/category/bracelet-cat.jpg";
    if (categoryUi === "necklaces-pendants" || categoryUi === "necklaces")
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
        <Breadcrumbs
          customLabels={{ [categoryUi]: categoryLabel }}
          customPaths={{ [categoryUi]: `/category/${categoryUi}` }}
        />
      </div>

      {/* Title */}
      <div className="text-center mt-2 px-4 sm:px-6">
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide">
          {categoryLabel}
        </h1>
        <p className="text-sm opacity-70 mt-1">
          Browse by subcategory or see all items below.
        </p>
      </div>

      {/* Subcategory navigation row */}
      {subcategories.length > 0 && (
        <div className="mt-4 px-4 sm:px-6">
          <div className="mx-auto max-w-screen-2xl">
            <SubcategoryCards
              category={categoryUi}
              subcategories={subcategories.map((s) => ({
                key: s.slug,
                label: s.label,
                image: subcatImage(s.slug),
                href: `/category/${encodeURIComponent(
                  categoryUi
                )}/${encodeURIComponent(s.slug)}?scroll=true`,
              }))}
            />
          </div>
          <div className="h-6 sm:h-10" />
        </div>
      )}

      {/* Anchor for scroll=true */}
      <div id="category-header" className="sr-only" aria-hidden="true" />

      {/* Product grid */}
      <section className="mt-6 sm:mt-10 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mx-auto max-w-screen-2xl">
          {products.length === 0 ? (
            <p className="text-white/80">No products found.</p>
          ) : (
            <div
              className="
                grid gap-x-6 gap-y-10
                grid-cols-[repeat(2,minmax(var(--card-w),1fr))]
                md:grid-cols-[repeat(3,minmax(var(--card-w),1fr))]
                lg:grid-cols-[repeat(4,minmax(var(--card-w),1fr))]
              "
            >
              {products.map((p) => {
                // product details route (matches your app)
                const href = `/product/${encodeURIComponent(p.slug)}`;
                return (
                  <ProductCard
                    key={p.slug}
                    slug={p.slug}
                    image={p.image}
                    name={p.name}
                    price={p.price}
                    salePrice={p.salePrice ?? null}
                    href={href}
                    inStock={p.inStock}
                    typeLabel={
                      p.subcategory
                        ? p.subcategory
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (m) => m.toUpperCase())
                        : categoryLabel.replace(/& Pendants/i, "Necklace")
                    }
                    categorySlug={categoryUi}
                    subcategorySlug={p.subcategory || null}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
