// pages/for-her.tsx
"use client";

import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { listProducts } from "../lib/products"; // relative path is safest
import JewelryPage from "./jewelry"; // reuse the component

// 🔧 Use the EXACT Audience type from the Jewelry page to avoid mismatch
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
  gender?: "unisex" | "him" | "her"; // legacy
  description?: string;
  inStock?: boolean;
};

const canonicalizeCategory = (raw: string) => {
  const v = String(raw || "").toLowerCase();
  if (v === "necklaces") return "necklaces-pendants";
  return v;
};

export default function ForHer({ products }: { products: ProductType[] }) {
  const router = useRouter();

  // Reflect audience in URL without full reload
  useEffect(() => {
    if (!router.isReady) return;
    const curr = router.query;
    if (curr.audience !== "her") {
      router.replace(
        { pathname: "/for-her", query: { ...curr, audience: "her" } },
        undefined,
        { shallow: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  return (
    <>
      <Head>
        <title>For Her | Classy Diamonds</title>
        <meta name="description" content="Curated jewelry for her." />
      </Head>

      <JewelryPage
        products={products}
        heroTitle="For Her"
        seoTitle="For Her | Classy Diamonds"
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  // Pull a generous set; filter server-side to women-only (NO unisex)
  const rows = await listProducts({}, { sort: { createdAt: -1 }, limit: 2000 });

  const ALLOWED_SET = new Set([
    "rings",
    "earrings",
    "bracelets",
    "necklaces-pendants",
  ]);

  // Normalize to Audience[] strictly as "him" | "her"
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
        gender: p.gender || "unisex", // legacy passthrough
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
    // 🚫 Women-only: include items explicitly marked for "her" and NOT for "him"
    .filter((p) => {
      const set = new Set(p.audience ?? []);
      return set.has("her") && !set.has("him");
    });

  return { props: { products } };
};
