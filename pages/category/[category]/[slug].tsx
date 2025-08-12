// 📄 pages/category/[category]/[slug].tsx – With Ring Size Selection ✅

"use client";

import { GetServerSideProps } from "next";
import { useCart } from "@/context/CartContext";
import clientPromise from "@/lib/mongodb";
import Breadcrumbs from "@/components/Breadcrumbs";
import Head from "next/head";
import Image from "next/image";
import { useState } from "react";

import { productsData } from "@/data/productsData";

type ProductType = {
  id: string;
  skuNumber?: number;
  name: string;
  price: number;
  salePrice?: number;
  image?: string;
  slug: string;
  category: string;
  description?: string;
};

export default function ProductPage({ product }: { product: ProductType }) {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState(""); // 🆕 Track ring size

  const capitalizedCategory = product.category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const placeholder = "/gray-placeholder.jpg";

  const fallbackImage =
    productsData.find((item) => item.slug === product.slug)?.image ||
    placeholder;

  const squareImage =
    product.image && product.image.trim() !== ""
      ? product.image.includes("cloudinary.com")
        ? product.image.replace(
            "/upload/",
            "/upload/c_fill,ar_1:1,w_1000,h_1000/"
          )
        : product.image
      : fallbackImage;

  const isRing = product.category.toLowerCase().includes("ring");

  const handleAddToCart = () => {
    // 🔒 Require size for rings
    if (isRing && !selectedSize) {
      alert("Please select a ring size before adding to cart.");
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      discountedPrice: product.salePrice,
      image:
        product.image && product.image.trim() !== ""
          ? product.image
          : fallbackImage,
      quantity: 1,
      size: isRing ? selectedSize : undefined, // 🆕 Store size in cart
    });
  };

  return (
    <>
      <Head>
        <title>{product.name} | Classy Diamonds</title>
        <meta
          name="description"
          content={product.description || product.name}
        />
        <meta property="og:image" content={squareImage} />
      </Head>

      <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--foreground)]">
        {/* 🔗 Breadcrumbs */}
        <div className="px-4 sm:px-8 mt-6 mb-6">
          <Breadcrumbs
            customLabels={{
              [product.category]: capitalizedCategory,
              [product.slug]: product.name,
            }}
            customPaths={{
              [product.category]: `/category/${product.category}`,
              [product.slug]: `/category/${product.category}/${product.slug}`,
            }}
          />
        </div>

        {/* 📦 Main Product Section */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* 🖼 Product Image */}
          <div className="relative w-full max-w-[500px] aspect-square mx-auto rounded-2xl overflow-hidden shadow-2xl bg-[var(--bg-nav)] sm:w-[400px] md:w-[500px]">
            <Image
              src={squareImage || placeholder}
              alt={`Photo of ${product.name}`}
              fill
              className="object-cover"
              priority
              onError={(e) =>
                ((e.target as HTMLImageElement).src = placeholder)
              }
            />
          </div>

          {/* 📄 Product Info */}
          <div className="flex flex-col justify-center space-y-8">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                {product.name}
              </h1>
              {product.skuNumber && (
                <p className="text-sm text-gray-400">
                  SKU # {String(product.skuNumber).padStart(5, "0")}
                </p>
              )}
            </div>

            <p className="text-base sm:text-lg text-gray-300 max-w-prose">
              {product.description || "A timeless handcrafted piece."}
            </p>

            {/* 💰 Price Display */}
            <div className="text-2xl sm:text-3xl font-semibold">
              {product.salePrice ? (
                <>
                  <span className="line-through mr-3 text-gray-400">
                    ${product.price.toLocaleString()}
                  </span>
                  <span className="text-green-500">
                    ${product.salePrice.toLocaleString()}
                  </span>
                </>
              ) : (
                <>${product.price.toLocaleString()}</>
              )}
            </div>

            {/* 🆕 Ring Size Selection */}
            {isRing && (
              <div>
                <label
                  htmlFor="ringSize"
                  className="block mb-2 font-medium text-gray-200"
                >
                  Select Ring Size
                </label>
                <select
                  id="ringSize"
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-nav)] border border-gray-500 rounded-lg text-white"
                >
                  <option value="">-- Choose a Size --</option>
                  {[...Array(16)].map((_, i) => {
                    const size = (i + 4).toString(); // Sizes 4–19
                    return (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* 🛒 Add to Cart */}
            <button
              onClick={handleAddToCart}
              className="px-8 py-4 bg-[#e0e0e0] text-[#1f2a44] text-lg rounded-xl hover:scale-105 transition"
            >
              Add to Cart
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = params?.slug as string;
  const client = await clientPromise;
  const p = await client.db().collection("products").findOne({ slug });
  if (!p) return { notFound: true };
  const product: ProductType = {
    id: p._id.toString(),
    skuNumber: p.skuNumber ?? null,
    name: p.name,
    price: p.price,
    salePrice: p.salePrice ?? null,
    image: p.imageUrl || p.image || "",
    slug: p.slug,
    category: p.category,
    description: p.description || "",
  };
  return { props: { product } };
};
