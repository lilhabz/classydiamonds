// components/ProductCard.tsx – Desktop pixel-locked; sub-desktop scales via CSS vars
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

/* ============================
   🔧 Path helpers
   ============================ */
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

/* ============================
   💳 Component
   ============================ */
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
      /* 💎 Pixel-lock on desktop; hover scale only on md+ and non-touch
         - md:hover:scale-105 keeps phones from “sticky hover”
         - no-touch-scale disables transform on hover-capable=false devices */
      className="rounded-2xl bg-[#25304f] shadow-lg transition hover:shadow-xl transform-gpu transition-transform duration-300 md:hover:scale-105 no-touch-scale"
      style={{
        width: "var(--card-w)",
        height: "var(--card-h)",
      }}
    >
      {/* 🔗 Clickable top area */}
      <Link
        href={link}
        aria-label={name}
        className="block mx-auto group"
        style={{
          width: "var(--card-inner-w)", // 195px desktop
          height: "var(--link-h)", // 259px desktop
        }}
      >
        {/* 🖼️ Image */}
        <div
          className="overflow-hidden rounded-xl relative"
          style={{
            width: "var(--img)",
            height: "var(--img)",
          }}
        >
          <Image
            src={src}
            alt={name}
            fill
            className="object-cover transform transition-transform duration-300 group-hover:scale-105"
            unoptimized={unoptimized}
            onError={handleImgError}
            sizes="(max-width: 1024px) 33vw, 195px"
            priority={false}
          />
        </div>

        {/* 🔢 Spacer within the link area math */}
        <div
          style={{ width: "var(--card-inner-w)", height: "var(--spacer)" }}
        />

        {/* 🏷️ Title */}
        <h3
          className="font-medium text-white leading-[24px] truncate"
          style={{
            width: "var(--card-inner-w)",
            height: "var(--title-h)",
            fontSize: "var(--title-fs)",
          }}
          title={name}
        >
          {name}
        </h3>

        {/* 💲 Price row */}
        <p
          className="text-gray-200 leading-[24px] truncate"
          style={{
            width: "var(--card-inner-w)",
            height: "var(--price-h)",
            fontSize: "var(--price-fs)",
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

      {/* 🛒 CTA */}
      <div className="w-full flex justify-center">
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
