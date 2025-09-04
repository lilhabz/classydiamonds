// components/ProductCard.tsx – Tiffany-style card (no CTA on card)
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
  /** kept for compatibility but unused on the card */
  onAddToCart?: () => void;
  href?: string;
  className?: string;
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
  href,
  className = "",
  style,
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
      className={
        // white card + subtle border like the screenshots
        `product-card group relative flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white ${className}`
      }
      style={{
        // Let the grid own width; avoid fixed px so cards don't overlap
        width: "100%",
        height: "auto",
        ...style,
      }}
    >
      {/* 🔗 Clickable top area */}
      <Link
        href={link}
        aria-label={name}
        className="pc-link block"
        style={{
          width: "100%",
          // If you were using your CSS vars, this still respects --link-h (optional)
          height: "var(--link-h, auto)",
        }}
      >
        {/* 🖼️ Framed image area (4:3 keeps rows even; object-contain like jewelry sites) */}
        <div className="relative w-full aspect-[4/3] bg-[#d6e9ff]/60 p-3">
          {/* pale green inner frame */}
          <div className="absolute inset-2 rounded-sm bg-[#d8efc8]" />
          <div className="relative h-full w-full">
            <Image
              src={src}
              alt={name}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              unoptimized={unoptimized}
              onError={handleImgError}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={false}
            />
          </div>
        </div>

        {/* (optional) spacer below image if you still rely on your vars */}
        <div style={{ width: "100%", height: "var(--spacer, 0px)" }} />

        {/* 🏷️ Title */}
        <h3
          className="px-4 text-center font-medium text-neutral-900 truncate"
          style={{
            height: "var(--title-h, auto)",
            fontSize: "var(--title-fs, 15px)",
            lineHeight: "var(--title-h, 1.2)",
          }}
          title={name}
        >
          {name}
        </h3>

        {/* 💲 Price row */}
        <p
          className="px-4 text-center text-neutral-900"
          style={{
            height: "var(--price-h, auto)",
            fontSize: "var(--price-fs, 16px)",
            lineHeight: "var(--price-h, 1.2)",
          }}
          title={
            salePrice
              ? `$${price.toLocaleString()} → $${displayPrice.toLocaleString()}`
              : `$${displayPrice.toLocaleString()}`
          }
        >
          {salePrice ? (
            <>
              <span className="mr-2 text-neutral-400 line-through">
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

      {/* ─────────── Divider like inspo ─────────── */}
      <div className="mx-4 my-3 border-t border-neutral-200" />
      {/* If you want “In Stock / Brand / Type”, render them above the divider instead.
          Kept minimal since your props don't include those fields. */}
    </div>
  );
}
