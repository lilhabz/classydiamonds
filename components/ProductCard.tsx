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
  /** e.g., "Ring", "Watch", "Bracelet" */
  typeLabel?: string;
  /** 🆕 Real stock flag; if set, overrides stockLabel text & styling */
  inStock?: boolean;
  /** 🆕 When false, the card renders without a Link wrapper (useful for admin previews) */
  interactive?: boolean;
  /** 🆕 Color to use for the fallback swatch when no image is available */
  fallbackColor?: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * We keep this constant only as a sentinel value to detect "no image".
 * We DO NOT render this file anymore; instead we paint a color block.
 */
const PLACEHOLDER = "/gray-placeholder.jpg";

/* -------------------------------------------------------
   Path helpers
   - Preserve any valid scheme (e.g., blob:, data:, http:, https:)
   - Keep absolute /public paths ("/...") and make relative paths absolute
------------------------------------------------------- */
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i; // ✅ matches blob:, data:, http:, https:, file:, etc.

function normalizeLocalPath(src: string) {
  const trimmed = src.trim();
  if (!trimmed) return PLACEHOLDER;

  // 🆕 allow any URL scheme (includes blob:, data:, http:, https:, etc.)
  if (SCHEME_RE.test(trimmed)) return trimmed;

  // Keep absolute /public paths
  if (trimmed.startsWith("/")) return trimmed;

  // Make relative paths absolute
  return `/${trimmed.replace(/^(\.\/)+/, "")}`;
}

function resolveImageSrc(raw?: string | null) {
  if (!raw || !raw.trim()) return PLACEHOLDER;
  return normalizeLocalPath(raw);
}

/* -------------------------------------------------------
   Fallback color selection
   - Use explicit `fallbackColor` if provided.
   - Else choose a gentle, category-inspired default from `typeLabel`.
------------------------------------------------------- */
function pickDefaultColor(typeLabel?: string): string {
  const key = String(typeLabel || "").trim().toLowerCase();
  // Soft, subtle pastels that fit the brand vibe
  const palette: Record<string, string> = {
    ring: "#E0F2FE", // light sky
    rings: "#E0F2FE",
    bracelet: "#FCE7F3", // light pink
    bracelets: "#FCE7F3",
    earring: "#EDE9FE", // light violet
    earrings: "#EDE9FE",
    "necklace": "#FEF3C7", // light amber
    "necklaces": "#FEF3C7",
    "necklaces & pendants": "#FEF3C7",
    "pendant": "#FEF3C7",
    "pendants": "#FEF3C7",
    watch: "#E5E7EB", // neutral
    watches: "#E5E7EB",
    default: "#E6EEF5", // soft blue-gray fallback
  };
  return palette[key] || palette.default;
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
  inStock, // 🆕
  interactive = true, // 🆕 default clickable
  fallbackColor,
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
      // Second failure → mark as "no image": we will render a color swatch.
      setSrc(PLACEHOLDER);
      setUnoptimized(false);
    }
  };

  const displayPrice = salePrice ?? price;

  // 🆕 stop link navigation when clicking the heart
  const onHeartClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!rehydrated) return;
    toggleFavorite(slug);
  };

  // 🆕 Resolve stock label + styling based on boolean when provided
  const resolvedInStock = typeof inStock === "boolean" ? inStock : undefined;
  const resolvedStockText =
    resolvedInStock !== undefined
      ? resolvedInStock
        ? "In Stock"
        : "Out of Stock"
      : stockLabel;

  const outOfStock = resolvedInStock === false;

  // 🆕 Decide whether to render a color swatch instead of an <Image />
  const isColorFallback = src === PLACEHOLDER;
  const swatchColor = fallbackColor || pickDefaultColor(typeLabel);

  // 🆕 Wrapper: Link (interactive) or plain div (non-interactive)
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
        // removed: --row-h-action (no tiny action row anymore)
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
      {/* Clickable (or not) top (image + text) */}
      <Wrapper>
        {/* Framed media area with floating heart
            We keep the same height calc so the grid alignment doesn't change. */}
        <div
          className="relative w-full overflow-hidden rounded-sm"
          style={{ paddingTop: "calc(75% + 36px)" }} // 4/3 (75%) + extra 36px height
        >
          {/* Heart button (OVER image/swatch, top-right) */}
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

          {/* Media: either a Next/Image or a solid color swatch */}
          {isColorFallback ? (
            <div
              className={
                "absolute inset-0 transition-transform duration-300 group-hover:scale-[1.03]"
              }
              // Use inline style for precise brand-friendly hues
              style={{
                backgroundColor: swatchColor,
              }}
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

        {/* Centered meta (fixed row heights for perfect alignment) */}
        <div className="px-4 pb-4 pt-3 text-center">
          {/* Stock */}
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
      </Wrapper>
    </div>
  );
}
