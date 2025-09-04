// components/ProductCard.tsx — Tiffany-style tile (uniform size, no CTA)
// ✅ Framed image → tiny icon row → divider → In Stock / Name / Type / Price
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
// 🆕 favorites
import { useFavorites } from "../context/FavoritesContext";

export type ProductCardProps = {
  slug: string;
  image?: string | null;
  name: string;
  price: number;
  salePrice?: number | null;
  /** link override (defaults to /product/[slug]) */
  href?: string;
  /** "In Stock" / "Out of Stock" etc. */
  stockLabel?: string;
  /** e.g., "Ring", "Watch", "Bracelet" */
  typeLabel?: string;
  className?: string;
  style?: React.CSSProperties;
};

const PLACEHOLDER = "/gray-placeholder.jpg";

/* Path helpers (no forced /products/) */
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
  stockLabel = "In Stock",
  typeLabel,
  className = "",
  style,
}: ProductCardProps) {
  const link = href ?? `/product/${slug}`;
  const initial = useMemo(() => resolveImageSrc(image), [image]);

  const [src, setSrc] = useState<string>(initial);
  const [unoptimized, setUnoptimized] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);

  // 🆕 favorites
  const { rehydrated, isFavorite, toggleFavorite } = useFavorites();
  const fav = rehydrated ? isFavorite(slug) : false;

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

  // 🆕 stop link navigation when clicking the heart
  const onHeartClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!rehydrated) return; // avoid mismatch before we know the real state
    toggleFavorite(slug);
  };

  return (
    <div
      className={
        // White card + subtle border (matches luxury inspo)
        "group relative flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white " +
        className
      }
      style={{
        // ✅ Let the grid decide the width; we guarantee same internal heights.
        width: "100%",
        height: "auto",
        // Row height constants so every card is identical across pages:
        ["--row-h-action" as any]: "36px",
        ["--row-h-title" as any]: "22px",
        ["--row-h-type" as any]: "20px",
        ["--row-h-price" as any]: "24px",
        ["--fs-title" as any]: "15px",
        ["--fs-type" as any]: "15px",
        ["--fs-price" as any]: "16px",
        ...style,
      }}
    >
      {/* Clickable top (image + text) */}
      <Link href={link} aria-label={name} className="block">
        {/* Framed image area (keeps rows even) */}
        <div className="relative w-full aspect-[4/3] bg-[#d6e9ff]/60 p-3">
          {/* Pale green inner frame */}
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

        {/* Tiny action row (♡ + quick view) — fixed height */}
        <div
          className="flex items-center justify-center gap-6 text-neutral-500"
          style={{ height: "var(--row-h-action)" }}
        >
          {/* 🆕 Heart button (persistent favorites) */}
          <button
            type="button"
            onClick={onHeartClick}
            aria-label={fav ? "Remove from favorites" : "Save to wishlist"}
            aria-pressed={fav}
            disabled={!rehydrated}
            className={
              "p-1 transition-colors " +
              (fav
                ? "text-rose-600 hover:text-rose-700"
                : "hover:text-neutral-700")
            }
            title={fav ? "Saved to Favorites" : "Save to Favorites"}
          >
            {/* same heart path; filled when active */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={fav ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* center dot spacer to match inspo */}
          <span aria-hidden="true" className="text-xs select-none">
            •
          </span>
        </div>

        {/* Hairline divider */}
        <div className="mx-4 border-t border-neutral-200" />

        {/* Centered meta (fixed row heights for perfect alignment) */}
        <div className="px-4 pb-4 pt-3 text-center">
          {/* Stock */}
          <p
            className="uppercase tracking-wide text-neutral-600"
            style={{
              height: "16px", // small and steady; not counted in the locked rows below
              fontSize: "12px",
              lineHeight: "16px",
            }}
          >
            {stockLabel}
          </p>

          {/* Name (single line) */}
          <p
            className="truncate text-neutral-900"
            style={{
              height: "var(--row-h-title)",
              fontSize: "var(--fs-title)",
              lineHeight: "var(--row-h-title)",
              fontWeight: 500,
              marginTop: 4,
            }}
            title={name}
          >
            {name}
          </p>

          {/* Type (single line) */}
          <p
            className="truncate text-neutral-900"
            style={{
              height: "var(--row-h-type)",
              fontSize: "var(--fs-type)",
              lineHeight: "var(--row-h-type)",
            }}
            title={typeLabel}
          >
            {typeLabel ?? ""}
          </p>

          {/* Price (single line) */}
          <p
            className="text-neutral-900"
            style={{
              height: "var(--row-h-price)",
              fontSize: "var(--fs-price)",
              lineHeight: "var(--row-h-price)",
              fontWeight: 600,
              marginTop: 4,
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
                ${displayPrice.toLocaleString()}
              </>
            ) : (
              <>${displayPrice.toLocaleString()}</>
            )}
          </p>
        </div>
      </Link>
    </div>
  );
}
