// components/SubcategoryGrid.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

export type Subcat = {
  label: string;
  slug: string; // e.g. "all", "studs", "tennis"
  /** Optional image. If omitted we’ll try a sensible fallback. */
  image?: string;
};

type Props = {
  category: string; // e.g., "rings"
  subcategories: Subcat[];
  /** If provided, we run in “filter-in-place” mode (no navigation). */
  onSelect?: (slug: string) => void;
  /** Highlight the currently selected subcategory (for filter-in-place). */
  activeSlug?: string;

  /** Style knobs to match your Featured grid exactly on mobile. */
  gridGapPx?: number; // default 16 (gap-4)
  pagePadPx?: number; // default 0  (this section uses px-0)
  imgRatioMobile?: number; // default 1.333... (~4/3). Set to 1.3 for Featured feel
  fontScaleMobile?: number; // default 0.82
};

export default function SubcategoryGrid({
  category,
  subcategories,
  onSelect,
  activeSlug,
  gridGapPx = 16,
  pagePadPx = 0,
  imgRatioMobile = 1.333,
  fontScaleMobile = 0.82,
}: Props) {
  if (!subcategories?.length) return null;

  // Fallback chain:
  //  1) provided image
  //  2) /subcategory/{category}-{slug}.jpg
  //  3) /category/{category}-cat.jpg
  //  4) /gray-placeholder.jpg
  const imgFor = (s: Subcat) =>
    s.image ||
    `/subcategory/${category}-${s.slug}.jpg` ||
    `/category/${category}-cat.jpg` ||
    `/gray-placeholder.jpg`;

  const isActive = (slug: string) =>
    (activeSlug || "all").toLowerCase() === slug.toLowerCase();

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

      {/* 🔒 2 cols on phones, same spacing/feel as “Featured” */}
      <div className="grid grid-cols-2 gap-4 justify-items-center">
        {subcategories.map((s) => {
          const cardInner = (
            <div
              className="relative w-full"
              style={{ aspectRatio: `${imgRatioMobile}` }} // e.g., 1.3 to match Featured
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
                className={
                  "absolute inset-x-2 bottom-2 z-10 text-center font-semibold px-2 py-1 rounded-md backdrop-blur-[2px] " +
                  (onSelect && isActive(s.slug)
                    ? "bg-white/70 text-[#1f2a44]"
                    : "bg-black/25 text-white")
                }
                style={{ fontSize: `calc(14px * var(--mobile-font-scale, 1))` }}
              >
                {s.label}
              </span>
            </div>
          );

          // If onSelect is provided, we’re in “filter-in-place” mode (button, no navigation).
          if (onSelect) {
            const active = isActive(s.slug);
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => onSelect(s.slug)}
                aria-pressed={active}
                aria-label={`${s.label} in ${category}${
                  active ? " (selected)" : ""
                }`}
                className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-transform duration-300 hover:scale-[1.02] w-full text-left"
              >
                {cardInner}
              </button>
            );
          }

          // Default: link mode (your current behavior).
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
              className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-transform duration-300 hover:scale-[1.02] w-full"
            >
              {cardInner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
