// components/ProductCard.tsx — Tiffany-style tile (uniform size, no CTA)
// ✅ Framed image with floating heart (top-right) → divider → In Stock / Name / Type / Price
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
  /** "In Stock" / "Out of Stock" etc. (used only if `inStock` is undefined) */
  stockLabel?: string;
  /** e.g., "Ring", "Watch", "Bracelet" (human label) */
  typeLabel?: string;
  /** 🆕 Real stock flag; if set, overrides stockLabel text & styling */
  inStock?: boolean;
  /** 🆕 When false, the card renders without a Link wrapper (useful for admin previews) */
  interactive?: boolean;
  /** 🆕 Color to use for the fallback swatch when no image is available */
  fallbackColor?: string;
  /** 🆕 Canonical slugs to auto-pick swatch colors */
  categorySlug?: string | null;     // e.g. "engagement", "necklaces-pendants", "bracelets"
  subcategorySlug?: string | null;  // e.g. "halo", "solitaire", "tennis"
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Sentinel only — we don't render this file; it signals "no image".
 */
const PLACEHOLDER = "/gray-placeholder.jpg";

/* -------------------------------------------------------
   Path helpers
------------------------------------------------------- */
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

function normalizeLocalPath(src: string) {
  const trimmed = src.trim();
  if (!trimmed) return PLACEHOLDER;
  if (SCHEME_RE.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed.replace(/^(\.\/)+/, "")}`;
}

function resolveImageSrc(raw?: string | null) {
  if (!raw || !raw.trim()) return PLACEHOLDER;
  return normalizeLocalPath(raw);
}

/* -------------------------------------------------------
   Swatch color selection (subcategory → category → type → default)
   - Extend these maps as your taxonomy grows.
------------------------------------------------------- */
const CATEGORY_COLORS: Record<string, string> = {
  // primary categories
  "engagement": "#E0F2FE",          // light sky
  "rings": "#DBEAFE",               // light cornflower
  "bracelets": "#FCE7F3",           // light pink
  "necklaces-pendants": "#FEF3C7",  // light amber
  "earrings": "#EDE9FE",            // light violet
  "for-him": "#E5E7EB",             // neutral
  "for-her": "#F5F3FF",             // lavender
  "watches": "#E5E7EB",             // neutral
};

const SUBCATEGORY_COLORS: Record<string, string> = {
  // format: "<category>:<subcategory>"
  "engagement:solitaire": "#C7F2FF",
  "engagement:halo": "#FBCFE8",
  "engagement:three-stone": "#DDD6FE",
  "engagement:pave": "#FEF9C3",
  "rings:eternity": "#E9D5FF",
  "bracelets:tennis": "#FDE68A",
  "bracelets:bangle": "#D1FAE5",
  "earrings:studs": "#D1FAE5",
  "earrings:hoops": "#A7F3D0",
  "necklaces-pendants:pendant": "#FEF9C3",
  "necklaces-pendants:initial": "#FFEDD5",
  "watches:mens": "#E5E7EB",
  "watches:womens": "#F3F4F6",
};

function slugify(v?: string | null): string {
  const s = String(v ?? "").toLowerCase();
  return s
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pickSwatchColor(opts: {
  fallbackColor?: string;
  categorySlug?: string | null;
  subcategorySlug?: string | null;
  typeLabel?: string;
}): string {
  const { fallbackColor, categorySlug, subcategorySlug, typeLabel } = opts;

  if (fallbackColor) return fallbackColor;

  const cat = slugify(categorySlug);
  const sub = slugify(subcategorySlug);

  if (cat && sub) {
    const key = `${cat}:${sub}`;
    if (SUBCATEGORY_COLORS[key]) return SUBCATEGORY_COLORS[key];
  }

  if (cat && CATEGORY_COLORS[cat]) return CATEGORY_COLORS[cat];

  // As a final hint, try typeLabel buckets
  const t = slugify(typeLabel);
  if (CATEGORY_COLORS[t]) return CATEGORY_COLORS[t];

  // brand-friendly default
  return "#E6EEF5";
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
  inStock,
  interactive = true,
  fallbackColor,
  categorySlug,
  subcategorySlug,
  className = "",
  style,
}: ProductCardProps) {
  const link = href ?? `/product/${slug}`;
  const initial = useMemo(() => resolveImageSrc(image), [image]);

  const [src, setSrc] = useState<string>(initial);
  const [unoptimized, setUnoptimized] = useState(false);

  // 🆕 favorites
  const { rehydrated, isFavorite, toggleFavorite } = useFavorites();
  const fav = rehydrated ? isFavorite(slug) : false;

  useEffect(() => {
    setSrc(initial);
    setUnoptimized(false);
  }, [initial]);

  // Simplified: on first error, flip to swatch immediately.
  const handleImgError = () => {
    setSrc(PLACEHOLDER);
    setUnoptimized(false);
  };

  const displayPrice = salePrice ?? price;

  const onHeartClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!rehydrated) return;
    toggleFavorite(slug);
  };

  const resolvedInStock = typeof inStock === "boolean" ? inStock : undefined;
  const resolvedStockText =
    resolvedInStock !== undefined
      ? resolvedInStock
        ? "In Stock"
        : "Out of Stock"
      : stockLabel;

  const outOfStock = resolvedInStock === false;

  const isColorFallback = src === PLACEHOLDER;
  const swatchColor = pickSwatchColor({
    fallbackColor,
    categorySlug,
    subcategorySlug,
    typeLabel,
  });

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    interactive ? (
      <Link href={link} aria-label={name} className="block group">
        {children}
      </Link>
    ) : (
      <div aria-label={name} className="block group">
        {children}
      </div>
    );

  return (
    <div
      className={
        "group relative flex flex-col overflow-hidden rounded-xl border border-black/10 bg-gray-50 " +
        (outOfStock ? "opacity-[0.92]" : "") +
        " " +
        className
      }
      style={{
        width: "100%",
        height: "auto",
        ["--row-h-title" as any]: "22px",
        ["--row-h-type" as any]: "20px",
        ["--row-h-price" as any]: "24px",
        ["--fs-title" as any]: "15px",
        ["--fs-type" as any]: "15px",
        ["--fs-price" as any]: "16px",
        ...style,
      }}
      aria-busy={false}
    >
      <Wrapper>
        {/* Media area (+36px to preserve previous heart-row space) */}
        <div
          className="relative w-full overflow-hidden rounded-sm"
          style={{ paddingTop: "calc(75% + 36px)" }}
        >
          {/* Heart button (over image/swatch) */}
          <button
            type="button"
            onClick={onHeartClick}
            aria-label={fav ? "Remove from favorites" : "Save to wishlist"}
            aria-pressed={fav}
            disabled={!rehydrated}
            className={
              "absolute top-2 right-2 z-10 rounded-md bg-white/80 backdrop-blur px-2 py-1 " +
              "transition-colors shadow-sm " +
              (fav
                ? "text-rose-600 hover:text-rose-700"
                : "text-neutral-500 hover:text-neutral-700")
            }
            title={fav ? "Saved to Favorites" : "Save to Favorites"}
          >
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

          {/* Media: either Next/Image or a solid color swatch */}
          {isColorFallback ? (
            <div
              className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03]"
              style={{ backgroundColor: swatchColor }}
              aria-hidden="true"
            />
          ) : (
            <Image
              src={src}
              alt={name}
              fill
              className={
                "absolute inset-0 object-cover transition-transform duration-300 group-hover:scale-[1.03]" +
                (outOfStock ? " grayscale" : "")
              }
              unoptimized={unoptimized}
              onError={handleImgError}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={false}
            />
          )}
        </div>

        {/* Hairline divider */}
        <div className="mx-4 border-t border-neutral-200" />

        {/* Meta */}
        <div className="px-4 pb-4 pt-3 text-center">
          <p
            className={
              "uppercase tracking-wide " +
              (outOfStock ? "text-red-600" : "text-neutral-600")
            }
            style={{
              height: "16px",
              fontSize: "12px",
              lineHeight: "16px",
              fontWeight: 600,
            }}
          >
            {resolvedStockText}
          </p>

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
                ? `$${price.toLocaleString()} → $${(salePrice ?? price).toLocaleString()}`
                : `$${price.toLocaleString()}`
            }
          >
            {salePrice ? (
              <>
                <span className="mr-2 text-neutral-400 line-through">
                  ${price.toLocaleString()}
                </span>
                ${(salePrice ?? price).toLocaleString()}
              </>
            ) : (
              <>${price.toLocaleString()}</>
            )}
          </p>
        </div>
      </Wrapper>
    </div>
  );
}
