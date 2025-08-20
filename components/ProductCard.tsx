// components/ProductCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export type ProductCardProps = {
  slug: string; // product slug (fallback link goes to /product/[slug])
  image: string;
  name: string;
  price: number;
  salePrice?: number | null;
  onAddToCart: () => void;
  href?: string; // ✅ optional explicit href for category routes
};

export default function ProductCard({
  slug,
  image,
  name,
  price,
  salePrice,
  onAddToCart,
  href,
}: ProductCardProps) {
  const displayPrice = salePrice ?? price;
  const link = href ?? `/product/${slug}`;

  return (
    <div className="group flex flex-col rounded-2xl bg-[#25304f] p-3 shadow-lg transition hover:shadow-xl">
      <Link href={link} className="block">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl">
          <Image
            src={image}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 90vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false}
          />
        </div>

        <div className="mt-3">
          <h3 className="line-clamp-1 text-sm md:text-base font-medium text-white">
            {name}
          </h3>

          <p className="mt-1 text-sm md:text-base text-gray-200">
            {salePrice ? (
              <>
                <span className="mr-2 text-gray-300 line-through">
                  ${price.toLocaleString()}
                </span>
                <span className="font-semibold">
                  ${displayPrice.toLocaleString()}
                </span>
              </>
            ) : (
              <span className="font-semibold">
                ${displayPrice.toLocaleString()}
              </span>
            )}
          </p>
        </div>
      </Link>

      {/* ✅ Same size/scale as /jewelry */}
      <button
        onClick={onAddToCart}
        className="mt-3 w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm md:text-base font-semibold text-white backdrop-blur
                   hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
        aria-label={`Add ${name} to cart`}
      >
        Add to Cart
      </button>
    </div>
  );
}
