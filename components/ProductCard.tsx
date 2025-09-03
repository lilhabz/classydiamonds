// components/ProductCard.tsx – Tiffany mobile sizes (phones), auto-height card
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
  /** ✅ new: allow external classes (e.g. lg:[--card-w:100%]) */
  className?: string;
  /** ✅ new: allow optional inline style overrides */
  style?: React.CSSProperties;
};

const PLACEHOLDER = "/gray-placeholder.jpg";

/* 🔧 Path helpers (no forced /products/) */
function normalizeLocalPath(src: string) {
  const trimmed = src.trim();
  if (!trimmed) return PLACEHOLDER;
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:"))
    return trimmed;
  if (trimmed.startsWith("/")) return trimmed; // absolute within /public
  return `/${trimmed.replace(/^(\.\/)+/, "")}`; // make relative paths absolute
}
function resolveImageSrc(raw?: string | null) {
  if (!raw || !raw.trim()) return PLACEHOLDER;
  return normalizeLocalPath(raw);
}

export default function ProductCard({
  slug,
  image,
  name,
  price,
  salePrice,
  onAddToCart,
  href,
  className = "", // ✅ new
  style, // ✅ new
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
      className={`product-card rounded-2xl bg-[#25304f] shadow-lg hover:shadow-xl transform-gpu transition-transform duration-300 md:hover:scale-105 no-touch-scale ${className}`}
      style={{
        width: "var(--card-w)",
        // ✅ critical: let the card height be auto so the button never overlaps the next row
        height: "auto",
        ...style, // allow caller overrides if provided
      }}
    >
      {/* 🔗 Clickable top area (Tiffany-sized per device) */}
      <Link
        href={link}
        aria-label={name}
        className="pc-link block mx-auto group"
        style={{
          width: "var(--card-inner-w)",
          height: "var(--link-h)", // image + content area (per-device)
        }}
      >
        {/* 🖼️ Image */}
        <div
          className="pc-img overflow-hidden rounded-xl relative"
          style={{
            width: "var(--img)",
            height: "var(--img-h, var(--img))", // phones use square
            minHeight: 120,
          }}
        >
          <Image
            src={src}
            alt={name}
            fill
            className="object-cover transform transition-transform duration-300 group-hover:scale-105"
            unoptimized={unoptimized}
            onError={handleImgError}
            sizes="(max-width: 640px) 50vw, 195px"
            priority={false}
          />
        </div>

        {/* 🔢 Spacer below image inside link area */}
        <div
          style={{ width: "var(--card-inner-w)", height: "var(--spacer)" }}
        />

        {/* 🏷️ Title */}
        <h3
          className="font-medium text-white truncate"
          style={{
            width: "var(--card-inner-w)",
            height: "var(--title-h)",
            fontSize: "var(--title-fs)",
            lineHeight: "var(--title-h)", // single-line, vertically centered like their tiles
          }}
          title={name}
        >
          {name}
        </h3>

        {/* 💲 Price row */}
        <p
          className="text-gray-200 truncate"
          style={{
            width: "var(--card-inner-w)",
            height: "var(--price-h)",
            fontSize: "var(--price-fs)",
            lineHeight: "var(--price-h)",
          }}
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

      {/* 🛒 CTA (outside the link; adds to total auto height) */}
      <div className="w-full flex justify-center pb-2">
        <button
          onClick={onAddToCart}
          className="rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors duration-200 hover:bg-white/20"
          style={{
            width: "var(--card-inner-w)",
            height: "var(--btn-h)",
            background: "rgba(255,255,255,0.10)",
            fontSize: "var(--btn-fs)",
          }}
          aria-label={`Add ${name} to cart`}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
