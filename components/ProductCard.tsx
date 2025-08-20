// components/ProductCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type ProductCardProps = {
  slug: string;
  image?: string | null; // can be empty/undefined
  name: string;
  price: number;
  salePrice?: number | null;
  onAddToCart: () => void;
  href?: string; // optional explicit href for category routes
};

const PLACEHOLDER = "/gray-placeholder.jpg"; // ensure this exists in /public

function normalizeLocalPath(src: string) {
  const trimmed = src.trim();
  if (!trimmed) return PLACEHOLDER;
  if (trimmed.startsWith("http")) return trimmed; // remote handled by next/image config
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  // If a bare filename or non-prefixed path was stored, force under /products
  return withSlash.startsWith("/products/")
    ? withSlash
    : `/products/${withSlash.replace(/^\//, "")}`;
}

function resolveImageSrc(raw?: string | null) {
  if (!raw || !raw.trim()) return PLACEHOLDER;
  return raw.startsWith("http") ? raw : normalizeLocalPath(raw);
}

export default function ProductCard({
  slug,
  image,
  name,
  price,
  salePrice,
  onAddToCart,
  href,
}: ProductCardProps) {
  const link = href ?? `/product/${slug}`;
  const initial = useMemo(() => resolveImageSrc(image), [image]);

  // If the Next optimizer 400s (remote host not allowed) or the URL is bad,
  // we retry once with unoptimized, then fall back to placeholder.
  const [src, setSrc] = useState<string>(initial);
  const [unoptimized, setUnoptimized] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);

  useEffect(() => {
    setSrc(initial);
    setUnoptimized(false);
    setFailedOnce(false);
  }, [initial]);

  const handleImgError = () => {
    if (!failedOnce) {
      // First failure: try bypassing the optimizer
      setFailedOnce(true);
      setUnoptimized(true);
    } else {
      // Second failure: fallback
      setSrc(PLACEHOLDER);
      setUnoptimized(false);
    }
  };

  const displayPrice = salePrice ?? price;

  return (
    <div className="group flex flex-col rounded-2xl bg-[#25304f] p-3 shadow-lg transition hover:shadow-xl">
      <Link href={link} className="block">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl">
          <Image
            src={src}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 90vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={false}
            unoptimized={unoptimized}
            onError={handleImgError}
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

      {/* Same size/scale as /jewelry */}
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
