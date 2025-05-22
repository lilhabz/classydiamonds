// 📄 pages/category/[category]/[slug].tsx – Final Product Page with Breadcrumb Fix ✅

"use client";

import { useRouter } from "next/router";
import { productsData } from "@/data/productsData";
import { jewelryData } from "@/data/jewelryData";
import { useCart } from "@/context/CartContext";
import Head from "next/head";
import Image from "next/image";
import Breadcrumbs from "@/components/Breadcrumbs";

type ProductType = {
  id: number;
  name: string;
  price: number;
  image: string;
  slug: string;
  category: string;
  description?: string;
};

export default function ProductPage() {
  const router = useRouter();
  const { slug, category } = router.query;
  const { addToCart } = useCart();

  if (
    !slug ||
    typeof slug !== "string" ||
    !category ||
    typeof category !== "string"
  ) {
    return null;
  }

  const allProducts: ProductType[] = [...productsData, ...jewelryData];
  const product = allProducts.find((item) => item.slug === slug);

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white bg-[#1f2a44]">
        <h1 className="text-3xl font-bold mb-2">Product Not Found</h1>
        <p className="text-lg text-gray-400">
          Sorry, we couldn't find that item.
        </p>
      </div>
    );
  }

  const capitalizedCategory = category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      {/* 🧠 SEO */}
      <Head>
        <title>{product.name} | Classy Diamonds</title>
        <meta
          name="description"
          content={product.description || product.name}
        />
        <meta name="robots" content="index, follow" />
        <meta
          property="og:title"
          content={`${product.name} | Classy Diamonds`}
        />
        <meta
          property="og:description"
          content={product.description || product.name}
        />
        <meta
          property="og:image"
          content={`https://classydiamonds.vercel.app${product.image}`}
        />
        <meta
          property="og:url"
          content={`https://classydiamonds.vercel.app/category/${category}/${slug}`}
        />
      </Head>

      {/* 💎 Page */}
      <div className="min-h-screen flex flex-col bg-[#1f2a44] text-[#e0e0e0]">
        {/* 🧭 Breadcrumb */}
        <div className="pl-4 pr-4 sm:pl-8 sm:pr-8 mt-6 mb-6">
          <Breadcrumbs
            customLabels={{
              [category]: capitalizedCategory,
              [slug]: product.name,
            }}
            customPaths={{
              [category]: `/category/${category}`,
              [slug]: `/category/${category}/${slug}`,
            }}
          />
        </div>

        {/* 📦 Product Details */}
        <section className="pt-10 pb-16 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* 🖼 Product Image */}
          <div className="w-full md:w-1/2 overflow-hidden rounded-2xl shadow-lg">
            <Image
              src={product.image}
              alt={`Photo of ${product.name}`}
              width={600}
              height={600}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover w-full h-full"
              priority
            />
          </div>

          {/* 📋 Product Info */}
          <div className="w-full md:w-1/2 flex flex-col gap-6">
            <h1 className="text-4xl font-bold text-white">{product.name}</h1>
            <p className="text-lg text-[#cfd2d6]">
              {product.description || "Beautiful handcrafted piece."}
            </p>
            <p className="text-2xl font-semibold text-white">
              ${product.price.toLocaleString()}
            </p>

            <button
              onClick={() =>
                addToCart({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.image,
                  quantity: 1,
                })
              }
              className="mt-4 px-8 py-4 bg-white text-[#1f2a44] rounded-full text-lg font-semibold hover:bg-gray-100 hover:scale-105 transition-transform duration-300"
            >
              Add to Cart
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
