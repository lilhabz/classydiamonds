// components/SubcategoryGrid.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

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

  // "grid" = 2-col mobile grid (used on /jewelry)
  // "row"  = swipe on mobile; always visible; wraps on larger screens
  layout?: "grid" | "row";

  gridGapPx?: number;
  pagePadPx?: number;
  imgRatioMobile?: number;
  fontScaleMobile?: number;
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
}: Props) {
  if (!subcategories?.length) return null;

  const imgFor = (s: Subcat) =>
    s.image ||
    `/subcategory/${category}-${s.slug}.jpg` ||
    `/category/${category}-cat.jpg` ||
    `/gray-placeholder.jpg`;

  const isActive = (slug: string) =>
    (activeSlug || "all").toLowerCase() === slug.toLowerCase();

  const CardInner = ({ s }: { s: Subcat }) =>
    layout === "grid" ? (
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
    ) : (
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: "var(--img)",
          height: "var(--img-h, var(--img))",
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

  const renderCard = (s: Subcat) => {
    const base =
      "group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-transform duration-300 ";
    const cls =
      base +
      (layout === "grid"
        ? "hover:scale-[1.02] w-full"
        : // mobile: prevent shrink for swipe; sm+: allow wrapping and normal flow
          "inline-block align-top flex-none sm:flex-initial bg-[#25304f]");
    const style =
      layout === "row"
        ? ({
            width: "var(--card-w)",
            height: "var(--card-h)",
          } as React.CSSProperties)
        : undefined;

    if (onSelect) {
      const active = isActive(s.slug);
      return (
        <button
          key={s.slug}
          type="button"
          onClick={() => onSelect(s.slug)}
          aria-pressed={active}
          aria-label={`${s.label} in ${category}${active ? " (selected)" : ""}`}
          className={cls + (layout === "grid" ? " text-left" : "")}
          style={style}
        >
          <CardInner s={s} />
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
        <CardInner s={s} />
      </Link>
    );
  };

  /** LAYOUTS */
  if (layout === "row") {
    // ✅ ALWAYS visible; swipe only on small screens
    return (
      <section className="px-4 mt-2 mb-6">
        <h3 className="sr-only">Subcategories</h3>
        <div className="-mx-2 px-2 overflow-x-auto sm:overflow-visible no-scrollbar touch-pan-x">
          <div className="flex w-max sm:w-auto sm:flex-wrap sm:justify-center gap-3 sm:gap-4 whitespace-nowrap sm:whitespace-normal">
            {subcategories.map(renderCard)}
          </div>
        </div>
      </section>
    );
  }

  // Mobile-only 2-col grid (used on /jewelry)
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
        {subcategories.map(renderCard)}
      </div>
    </section>
  );
}
