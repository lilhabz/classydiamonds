// components/SubcategoryGrid.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

export type Subcat = {
  label: string;
  slug: string; // e.g. "all", "studs", "tennis"
  image?: string;
};

type Props = {
  category: string;
  subcategories: Subcat[];
  onSelect?: (slug: string) => void;
  activeSlug?: string;

  /**
   * "row"          = mobile swipe row (matches category/product card vars). On desktop it wraps naturally.
   * "grid"         = 2-col mobile grid (not used here, but kept for jewelry page if needed elsewhere).
   * "desktop-grid" = sm+: fixed grid (default 6 cols), smaller photo cards like category tiles.
   */
  layout?: "grid" | "row" | "desktop-grid";

  // Grid (mobile) style knobs
  gridGapPx?: number;
  pagePadPx?: number;
  imgRatioMobile?: number;
  fontScaleMobile?: number;

  // Desktop grid controls
  desktopCols?: 3 | 4 | 5 | 6;
  desktopGapPx?: number; // px gap between cards (default 12)
  desktopCardScale?: number; // scale relative to category card look (default 0.85)
};

/* --------------------------- Fallback image helper -------------------------- */
// Cycles through candidate srcs until one loads.
function ImageWithFallback({
  srcList,
  alt,
  fill,
  className,
  sizes,
  priority = false,
}: {
  srcList: string[];
  alt: string;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [idx, setIdx] = React.useState(0);
  const src = srcList[Math.min(idx, srcList.length - 1)];

  // We render <Image> with a key so Next re-initializes when src changes
  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      fill={fill}
      className={className}
      sizes={sizes}
      priority={priority}
      onError={() => {
        // advance to next fallback (if any)
        setIdx((i) => (i + 1 < srcList.length ? i + 1 : i));
      }}
    />
  );
}

export default function SubcategoryGrid({
  category,
  subcategories,
  onSelect,
  activeSlug,
  layout = "grid",
  gridGapPx = 16,
  pagePadPx = 0,
  imgRatioMobile = 1.333,
  fontScaleMobile = 0.82,
  desktopCols = 6,
  desktopGapPx = 12,
  desktopCardScale = 0.85,
}: Props) {
  if (!subcategories?.length) return null;

  // Build ordered candidates; do NOT use "a || b || c" (all non-empty strings are truthy).
  const candidatesFor = (s: Subcat): string[] => [
    ...(s.image ? [s.image] : []),
    `/subcategory/${category}-${s.slug}.jpg`,
    `/category/${category}-cat.jpg`,
    `/products/placeholder.jpg`,
  ];

  const isActive = (slug: string) =>
    (activeSlug || "all").toLowerCase() === slug.toLowerCase();

  /* ------------------------------ Card inners ------------------------------ */
  const CardInnerRow = ({ s }: { s: Subcat }) => (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        width: "var(--img, 195px)",
        height: "var(--img-h, var(--img, 150px))",
        margin: "0 auto",
      }}
    >
      <ImageWithFallback
        srcList={candidatesFor(s)}
        alt={s.label}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        sizes="(max-width: 640px) 50vw, 195px"
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 flex items-end justify-center">
        <span className="mb-2 px-3 py-1 rounded-md text-white text-sm font-medium backdrop-blur-sm bg-black/30 text-center">
          {s.label}
        </span>
      </div>
    </div>
  );

  const CardInnerDesktop = ({ s }: { s: Subcat }) => (
    <div className="relative w-full bg-[#25304f] aspect-[5/4] rounded-xl overflow-hidden">
      <ImageWithFallback
        srcList={candidatesFor(s)}
        alt={s.label}
        fill
        className="object-cover"
        sizes="(min-width: 640px) 16vw, 100vw"
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-10" />
      <span className="absolute inset-0 flex items-center justify-center z-30 font-semibold text-white text-center px-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] text-[13px]">
        {s.label}
      </span>
    </div>
  );

  /* ----------------------------- Render helpers ---------------------------- */
  const renderRowCard = (s: Subcat) => {
    const active = isActive(s.slug);
    const cls =
      "group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-transform duration-300 " +
      "inline-block align-top flex-none sm:flex-initial bg-[#25304f] " +
      (active ? "ring-2 ring-white" : "");
    const style = {
      width: "var(--card-w, 195px)",
      height: "var(--card-h, 150px)",
    } as React.CSSProperties;

    if (onSelect) {
      return (
        <button
          key={s.slug}
          type="button"
          onClick={() => onSelect(s.slug)}
          aria-pressed={active}
          aria-label={`${s.label} in ${category}${active ? " (selected)" : ""}`}
          className={cls}
          style={style}
        >
          <CardInnerRow s={s} />
        </button>
      );
    }

    return (
      <Link
        key={s.slug}
        href={{
          pathname: `/category/${encodeURIComponent(
            category
          )}/subcategory/${encodeURIComponent(s.slug)}`,
          query: { scroll: "true" },
        }}
        aria-label={`${s.label} in ${category}`}
        className={cls}
        style={style}
      >
        <CardInnerRow s={s} />
      </Link>
    );
  };

  const renderDesktopCard = (s: Subcat) => {
    const active = isActive(s.slug);
    const cls =
      "group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-150 hover:scale-[1.03] " +
      (active ? "ring-2 ring-white" : "");
    if (onSelect) {
      return (
        <button
          key={s.slug}
          type="button"
          onClick={() => onSelect(s.slug)}
          aria-pressed={active}
          aria-label={`${s.label} in ${category}${active ? " (selected)" : ""}`}
          className={cls}
        >
          <CardInnerDesktop s={s} />
        </button>
      );
    }
    return (
      <Link
        key={s.slug}
        href={{
          pathname: `/category/${encodeURIComponent(
            category
          )}/subcategory/${encodeURIComponent(s.slug)}`,
          query: { scroll: "true" },
        }}
        aria-label={`${s.label} in ${category}`}
        className={cls}
      >
        <CardInnerDesktop s={s} />
      </Link>
    );
  };

  /* -------------------------------- Layouts -------------------------------- */
  if (layout === "row") {
    return (
      <section className="px-4 mt-2 mb-6">
        <h3 className="sr-only">Subcategories</h3>
        <div className="-mx-2 px-2 overflow-x-auto sm:overflow-visible no-scrollbar touch-pan-x">
          <div className="flex w-max sm:w-auto sm:flex-wrap sm:justify-start gap-3 sm:gap-4 whitespace-nowrap sm:whitespace-normal">
            {subcategories.map(renderRowCard)}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "desktop-grid") {
    const cols =
      desktopCols === 6
        ? "grid-cols-6"
        : desktopCols === 5
        ? "grid-cols-5"
        : desktopCols === 4
        ? "grid-cols-4"
        : "grid-cols-3";

    const scale = Math.max(0.7, Math.min(1, desktopCardScale));

    return (
      <section
        className="hidden sm:block"
        style={
          {
            ["--subgrid-gap" as any]: `${desktopGapPx}px`,
            ["--subgrid-scale" as any]: `${scale}`,
          } as React.CSSProperties
        }
      >
        <div className={`grid ${cols}`} style={{ gap: `var(--subgrid-gap)` }}>
          {subcategories.map((s) => (
            <div
              key={s.slug}
              style={{
                transform: "scale(var(--subgrid-scale))",
                transformOrigin: "top left",
              }}
            >
              {renderDesktopCard(s)}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Mobile-only 2-col grid (kept for completeness)
  return (
    <section
      className="sm:hidden px-0 mt-2 mb-6"
      style={
        {
          ["--grid-gap" as any]: `${gridGapPx}px`,
          ["--page-pad" as any]: `${pagePadPx}px`,
          ["--img-ratio-mobile" as any]: `${imgRatioMobile}`,
          ["--mobile-font-scale" as any]: `${fontScaleMobile}`,
        } as React.CSSProperties
      }
    >
      <h3 className="sr-only">Subcategories</h3>
      <div className="grid grid-cols-2 gap-4 justify-items-center">
        {subcategories.map((s) => (
          <Link
            key={s.slug}
            href={{
              pathname: `/category/${encodeURIComponent(
                category
              )}/subcategory/${encodeURIComponent(s.slug)}`,
              query: { scroll: "true" },
            }}
            aria-label={`${s.label} in ${category}`}
            className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-transform duration-300 hover:scale-[1.02] w-full"
          >
            <div
              className="relative w-full"
              style={{ aspectRatio: `${imgRatioMobile}` }}
            >
              <ImageWithFallback
                srcList={candidatesFor(s)}
                alt={s.label}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 240px"
              />
              <div className="absolute inset-0 bg-black/35 group-hover:bg-black/30 transition-colors" />
              <span
                className="absolute inset-x-2 bottom-2 z-10 text-center font-semibold px-2 py-1 rounded-md backdrop-blur-[2px] bg-black/25 text-white"
                style={{ fontSize: `calc(14px * var(--mobile-font-scale, 1))` }}
              >
                {s.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
