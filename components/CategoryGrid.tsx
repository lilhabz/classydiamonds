// components/CategoryGrid.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

export type CategoryItem = {
  label: string; // e.g. "Necklaces & Pendants"
  slug: string; // e.g. "necklaces" (query ?category=necklaces)
  image?: string; // e.g. "/category/necklace-cat.jpg"
};

type Props = {
  items: CategoryItem[];
  title?: string;
  /** If true, desktop grid stretches full-bleed (w-screen) like your Jewelry page */
  fullBleedDesktop?: boolean;
  /** Number of columns on desktop (default: 4) */
  desktopCols?: 3 | 4 | 5 | 6;
  /** Optional className wrappers */
  className?: string;
  /** Highlight the active category by slug (e.g., "rings") */
  activeSlug?: string | null;
  /** Handle selection yourself; we'll shallow-push and call onSelect */
  onSelect?: (slug: string) => void;
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function CategoryGrid({
  items,
  title = "Shop by Category",
  fullBleedDesktop = true,
  desktopCols = 4,
  className,
  activeSlug = null,
  onSelect,
}: Props) {
  const router = useRouter();

  const gridCols =
    desktopCols === 6
      ? "grid-cols-6"
      : desktopCols === 5
      ? "grid-cols-5"
      : desktopCols === 3
      ? "grid-cols-3"
      : "grid-cols-4"; // default 4

  const handleSelect = (slug: string) => {
    if (onSelect) onSelect(slug);
    router.push(
      { pathname: "/jewelry", query: { category: slug, scroll: "true" } },
      undefined,
      { shallow: true }
    );
  };

  return (
    <section className={clsx("pt-6 pb-6", className)}>
      {/* Title */}
      <div className="text-center mb-4 px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug">
          {title}
        </h2>
      </div>

      {/* 📱 Mobile: swipe row (visible scrollbar) — matches Jewelry */}
      <div className="sm:hidden px-0 mt-2">
        <div
          className="overflow-x-auto show-scrollbar"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
          }}
        >
          <style jsx>{`
            .show-scrollbar::-webkit-scrollbar {
              height: 8px;
            }
            .show-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .show-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.35);
              border-radius: 9999px;
            }
            .show-scrollbar:hover::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.55);
            }
          `}</style>

          <div className="flex gap-3 w-max px-4">
            {items.map((cat, i) => {
              const isActive =
                activeSlug &&
                activeSlug.toLowerCase() === cat.slug.toLowerCase();
              return (
                <button
                  key={`m-${cat.slug}-${i}`}
                  type="button"
                  onClick={() => handleSelect(cat.slug)}
                  className={clsx(
                    "group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-150 flex-shrink-0 hover:scale-[1.03] w-32",
                    isActive && "ring-2 ring-white"
                  )}
                  aria-label={cat.label}
                  title={cat.label}
                >
                  <div className="relative w-full bg-[#25304f] aspect-[4/3]">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.label}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-10" />
                    <span className="absolute inset-0 flex items-center justify-center z-30 font-semibold text-white text-center px-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] text-[12px]">
                      {cat.label}
                    </span>
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-0 ring-2 ring-white rounded-xl z-20"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🖥️ Desktop: single row grid — matches Jewelry */}
      <div
        className={clsx(
          "hidden sm:block",
          fullBleedDesktop &&
            "w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]"
        )}
      >
        <div
          className={clsx(
            "mx-auto",
            fullBleedDesktop ? "max-w-[1440px] px-2" : "max-w-7xl px-4 sm:px-6"
          )}
        >
          <div className={clsx("grid gap-[8px]", gridCols)}>
            {items.map((cat, i) => {
              const isActive =
                activeSlug &&
                activeSlug.toLowerCase() === cat.slug.toLowerCase();
              return onSelect ? (
                <a
                  key={`d-${cat.slug}-${i}`}
                  href={`/jewelry?category=${encodeURIComponent(
                    cat.slug
                  )}&scroll=true`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelect(cat.slug);
                  }}
                  className={clsx(
                    "group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-150 hover:scale-[1.03]",
                    isActive && "ring-2 ring-white"
                  )}
                  aria-label={cat.label}
                >
                  <div className="relative w-full bg-[#25304f] aspect-[5/4]">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.label}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-10" />
                    <span className="absolute inset-0 flex items-center justify-center z-30 font-semibold text-white text-center px-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] text-[13px]">
                      {cat.label}
                    </span>
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-0 ring-2 ring-white rounded-xl z-20"
                      />
                    )}
                  </div>
                </a>
              ) : (
                <Link
                  key={`d-${cat.slug}-${i}`}
                  href={{
                    pathname: "/jewelry",
                    query: { category: cat.slug, scroll: "true" },
                  }}
                  className={clsx(
                    "group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-150 hover:scale-[1.03]",
                    isActive && "ring-2 ring-white"
                  )}
                  aria-label={cat.label}
                >
                  <div className="relative w-full bg-[#25304f] aspect-[5/4]">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.label}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-10" />
                    <span className="absolute inset-0 flex items-center justify-center z-30 font-semibold text-white text-center px-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] text-[13px]">
                      {cat.label}
                    </span>
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-0 ring-2 ring-white rounded-xl z-20"
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
