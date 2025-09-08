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

  const imgFor = (s: Subcat) =>
    s.image ||
    `/subcategory/${category}-${s.slug}.jpg` ||
    `/category/${category}-cat.jpg` ||
    `/gray-placeholder.jpg`;

  const isActive = (slug: string) =>
    (activeSlug || "all").toLowerCase() === slug.toLowerCase();

  // ---------- Shared card contents ----------
  const CardInnerRow = ({ s }: { s: Subcat }) => (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        // ✅ CSS var fallbacks: if page defines --img/--img-h, they win; else these keep cards visible
        width: "var(--img, 195px)",
        height: "var(--img-h, var(--img, 150px))",
        margin: "0 auto",
      }}
    >
      <Image
        src={imgFor(s)}
        alt={s.label}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        sizes="(max-width: 640px) 50vw, 195px"
        priority={false}
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
      <Image
        src={imgFor(s)}
        alt={s.label}
        fill
        className="object-cover"
        sizes="(min-width: 640px) 16vw, 100vw"
        priority={false}
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-10" />
      <span className="absolute inset-0 flex items-center justify-center z-30 font-semibold text-white text-center px-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] text-[13px]">
        {s.label}
      </span>
    </div>
  );

  // ---------- Render helpers ----------
  const renderRowCard = (s: Subcat) => {
    const cls =
      "group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-transform duration-300 " +
      "inline-block align-top flex-none sm:flex-initial bg-[#25304f]";
    const style = {
      // ✅ CSS var fallbacks: respect page-level --card-w/--card-h if present
      width: "var(--card-w, 195px)",
      height: "var(--card-h, 150px)",
    } as React.CSSProperties;

    if (onSelect) {
      const active = isActive(s.slug);
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
    const cls =
      "group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-150 hover:scale-[1.03]";
    if (onSelect) {
      const active = isActive(s.slug);
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

  // ---------- Layouts ----------
  if (layout === "row") {
    // Mobile swipe (and natural wrap on desktop if you render it there)
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
    // sm+ only: show a fixed grid with smaller photo cards (6-up by default)
    const cols =
      desktopCols === 6
        ? "grid-cols-6"
        : desktopCols === 5
        ? "grid-cols-5"
        : desktopCols === 4
        ? "grid-cols-4"
        : "grid-cols-3";

    // scale the desktop card a bit smaller than category tiles
    const scale = Math.max(0.7, Math.min(1, desktopCardScale));

    return (
      <section
        className="hidden sm:block"
        style={
          {
            // Tweak spacing and internal sizing via CSS vars for this section scope
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
                // scale card content a touch smaller without breaking layout
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

  // (kept for completeness) Mobile-only 2-col grid
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
              <Image
                src={imgFor(s)}
                alt={s.label}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 240px"
                priority={false}
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
