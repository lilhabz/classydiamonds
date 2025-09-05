// pages/for-him.tsx
"use client";

import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { listProducts } from "../lib/products"; // keep relative path like for-her
import JewelryPage from "./jewelry"; // reuse the shared page

// Match the Audience type from jewelry.tsx
type Audience = import("./jewelry").Audience;

type ProductType = {
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
  audience?: Audience[];
  gender?: "unisex" | "him" | "her"; // legacy passthrough
  description?: string;
  inStock?: boolean;
};

// Canonicalize legacy category slugs
const canonicalizeCategory = (raw: string) => {
  const v = String(raw || "").toLowerCase();
  if (v === "necklaces") return "necklaces-pendants";
  return v;
};

export default function ForHim({ products }: { products: ProductType[] }) {
  const router = useRouter();

  // Reflect audience=him in the URL (shallow) to keep filters consistent
  useEffect(() => {
    if (!router.isReady) return;
    const curr = router.query;
    if (curr.audience !== "him") {
      router.replace(
        { pathname: "/for-him", query: { ...curr, audience: "him" } },
        undefined,
        { shallow: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  return (
    <>
      <Head>
        <title>For Him | Classy Diamonds</title>
        <meta name="description" content="Curated jewelry for him." />
      </Head>

      <JewelryPage
        products={products}
        heroTitle="For Him"
        seoTitle="For Him | Classy Diamonds"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  // Fetch a generous set server-side, then filter to MEN-ONLY (exclude unisex)
  const rows = await listProducts({}, { sort: { createdAt: -1 }, limit: 2000 });

  const ALLOWED_SET = new Set([
    "rings",
    "earrings",
    "bracelets",
    "necklaces-pendants",
  ]);

  // Normalize to Audience[] strictly as "him" | "her" (unisex => both)
  const toAudience = (v: any): Audience[] => {
    const arr = Array.isArray(v) ? v : v ? [v] : [];
    const set = new Set<Audience>();
    for (const raw of arr) {
      const t = String(raw || "")
        .toLowerCase()
        .trim();
      if (t === "her" || t === "female" || t === "women" || t === "for-her")
        set.add("her");
      if (t === "him" || t === "male" || t === "men" || t === "for-him")
        set.add("him");
      if (t === "unisex" || t === "all" || t === "any") {
        set.add("him");
        set.add("her");
      }
    }
    return Array.from(set);
  };

  const products: ProductType[] = rows
    .map((p: any) => {
      const aud: Audience[] = Array.isArray(p.audience)
        ? toAudience(p.audience)
        : toAudience(p.gender);

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
        category: canonicalizeCategory(String(p.category || "")),
        subcategory: String(p.subCategory ?? p.subcategory ?? "").toLowerCase(),
        metal: String(p.metal || "").toLowerCase(),
        stone: String(p.stone || "").toLowerCase(),
        shape: String(p.shape || "").toLowerCase(),
        carat: typeof p.carat === "number" ? p.carat : null,
        audience: aud,
        gender: p.gender || "unisex",
        description: p.description || "",
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
    .filter((p) => ALLOWED_SET.has(p.category))
    // ✅ Men-only: include items explicitly for "him" and NOT for "her"
    .filter((p) => {
      const set = new Set(p.audience ?? []);
      return set.has("him") && !set.has("her");
    });

  return { props: { products } };
};
