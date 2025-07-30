// 📄 pages/category/[category]/[slug].tsx – Fixed Consistent Box Size 💎

"use client";

import { GetServerSideProps } from "next";
import { useCart } from "@/context/CartContext";
import clientPromise from "@/lib/mongodb";
import Breadcrumbs from "@/components/Breadcrumbs";
import Head from "next/head";
import Image from "next/image";

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

  const capitalizedCategory = product.category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // use your local placeholder in /public/gray-placeholder.jpg
  const placeholder = "/gray-placeholder.jpg";

  // If it's a Cloudinary URL, preserve its version (v12345/) and inject our 1:1 crop
  const squareImage =
    product.image && product.image.trim() !== ""
      ? product.image.includes("cloudinary.com")
        ? product.image.replace(
            /\/upload\/(v\d+\/)?/,
            "/upload/c_fill,ar_1:1,w_1200,h_1200/$1"
          )
        : product.image
      : placeholder;

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

        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* 🖼 Fixed Consistent Image Box */}
          <div className="relative w-full max-w-[600px] aspect-square mx-auto rounded-2xl overflow-hidden shadow-2xl bg-[var(--bg-nav)]">
            <Image
              src={squareImage}
              alt={`Photo of ${product.name}`}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col justify-center space-y-8">
            <div>
              <h1 className="text-5xl font-bold mb-4">{product.name}</h1>
              {product.skuNumber && (
                <p className="text-sm text-gray-400">
                  SKU # {String(product.skuNumber).padStart(5, "0")}
                </p>
              )}
            </div>

            <p className="text-lg text-gray-300 max-w-prose">
              {product.description || "A timeless handcrafted piece."}
            </p>

            <div className="text-3xl font-semibold">
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

            <button
              onClick={() =>
                addToCart({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  discountedPrice: product.salePrice,
                  image:
                    product.image && product.image.trim() !== ""
                      ? product.image
                      : placeholder,
                  quantity: 1,
                })
              }
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
    image: p.imageUrl,
    slug: p.slug,
    category: p.category,
    description: p.description || "",
  };
  return { props: { product } };
};
