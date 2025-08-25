// components/ProductCard.tsx
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
    // 🔒 OUTER CARD: 219 x 339 EXACT
    <div
      className="rounded-2xl bg-[#25304f] shadow-lg hover:shadow-xl transition"
      style={{ width: 219, height: 339 }}
    >
      {/* 🔒 ANCHOR AREA: 195 x 259 EXACT */}
      <Link
        href={link}
        aria-label={name}
        className="block mx-auto"
        style={{ width: 195, height: 259 }}
      >
        {/* 🔒 IMAGE: 195 x 195 EXACT */}
        <div
          className="overflow-hidden rounded-xl"
          style={{ width: 195, height: 195 }}
        >
          <Image
            src={src}
            alt={name}
            width={195}
            height={195}
            className="object-cover"
            unoptimized={unoptimized}
            onError={handleImgError}
          />
        </div>

        {/* 🔒 Spacer: 16px to hit 259 total height */}
        <div style={{ width: 195, height: 16 }} />

        {/* 🔒 H3: 195 x 24 EXACT */}
        <h3
          className="font-medium text-white leading-[24px] truncate"
          style={{ width: 195, height: 24, fontSize: 14 }}
          title={name}
        >
          {name}
        </h3>

        {/* 🔒 P: 195 x 24 EXACT */}
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

      {/* 🔒 BUTTON: 195 x 44 EXACT */}
      <div className="w-full flex justify-center">
        <button
          onClick={onAddToCart}
          className="rounded-xl text-white font-semibold hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
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
