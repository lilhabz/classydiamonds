// components/ProductCard.tsx – Fixed sizes + Animations restored
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type ProductCardProps = {
  slug: string;
  image?: string | null;
  name: string;
  price: number;
  salePrice?: number | null;
  onAddToCart: () => void;
  href?: string;
};

const PLACEHOLDER = "/gray-placeholder.jpg";

function normalizeLocalPath(src: string) {
  const trimmed = src.trim();
  if (!trimmed) return PLACEHOLDER;
  if (trimmed.startsWith("http")) return trimmed;
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
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
      setFailedOnce(true);
      setUnoptimized(true);
    } else {
      setSrc(PLACEHOLDER);
      setUnoptimized(false);
    }
  };

  const displayPrice = salePrice ?? price;

  return (
    <div
      className="rounded-2xl bg-[#25304f] shadow-lg transition hover:shadow-xl"
      style={{ width: 219, height: 339 }}
    >
      <Link
        href={link}
        aria-label={name}
        className="block mx-auto group"
        style={{ width: 195, height: 259 }}
      >
        {/* 🔒 IMAGE with hover scale */}
        <div
          className="overflow-hidden rounded-xl"
          style={{ width: 195, height: 195 }}
        >
          <Image
            src={src}
            alt={name}
            width={195}
            height={195}
            className="object-cover transform transition-transform duration-300 group-hover:scale-105"
            unoptimized={unoptimized}
            onError={handleImgError}
          />
        </div>

        <div style={{ width: 195, height: 16 }} />

        <h3
          className="font-medium text-white leading-[24px] truncate"
          style={{ width: 195, height: 24, fontSize: 14 }}
          title={name}
        >
          {name}
        </h3>

        <p
          className="text-gray-200 leading-[24px] truncate"
          style={{ width: 195, height: 24, fontSize: 14 }}
          title={
            salePrice
              ? `$${price.toLocaleString()} → $${displayPrice.toLocaleString()}`
              : `$${displayPrice.toLocaleString()}`
          }
        >
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
      </Link>

      <div className="w-full flex justify-center">
        <button
          onClick={onAddToCart}
          className="rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-white/40
                     transition-colors duration-200 hover:bg-white/20"
          style={{
            width: 195,
            height: 44,
            background: "rgba(255,255,255,0.10)",
          }}
          aria-label={`Add ${name} to cart`}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
