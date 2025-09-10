// components/CategoryGrid.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

export type SubcategoryItem = {
  label: string;
  slug: string;
};

export type CategoryItem = {
  label: string;
  slug: string;
  image?: string;
  subcategories?: SubcategoryItem[];
};

type Props = {
  items: CategoryItem[];
  title?: string;
  fullBleedDesktop?: boolean;
  desktopCols?: 3 | 4 | 5 | 6;
  className?: string;
  activeSlug?: string | null;
  onSelect?: (slug: string) => void;
  /** Where clicks should route. "/category" -> /category/[slug], "/jewelry" -> /jewelry?category=slug */
  routeTo?: "/category" | "/jewelry";
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
  routeTo = "/category",
}: Props) {
  const router = useRouter();

  const gridCols =
    desktopCols === 6
      ? "grid-cols-6"
      : desktopCols === 5
      ? "grid-cols-5"
      : desktopCols === 3
      ? "grid-cols-3"
      : "grid-cols-4";

  // Build href preserving relevant filters when staying on /jewelry.
  const jewelryHrefObj = (slug: string) => {
    // Preserve any existing filter query keys (audience/gender/metals/etc.)
    const nextQuery: Record<string, any> = {
      ...router.query,
      category: slug,
      scroll: "true",
    };
    return { pathname: "/jewelry", query: nextQuery };
  };

  const hrefForString = (slug: string) =>
    routeTo === "/category"
      ? `/category/${encodeURIComponent(slug)}?scroll=true`
      : `/jewelry?category=${encodeURIComponent(slug)}&scroll=true`;

  const hrefFor = (slug: string) =>
    routeTo === "/jewelry" ? jewelryHrefObj(slug) : hrefForString(slug);

  const handleSelect = (slug: string) => {
    // 1) Immediate local state for parent
    if (onSelect) onSelect(slug);

    // 2) Route update (shallow for speed)
    if (routeTo === "/category") {
      router.push(
        { pathname: `/category/${slug}`, query: { scroll: "true" } },
        undefined,
        { shallow: true }
      );
    } else {
      // Preserve existing query params when staying on /jewelry
      const nextQuery: Record<string, any> = {
        ...router.query,
        category: slug,
        scroll: "true",
      };
      router.push({ pathname: "/jewelry", query: nextQuery }, undefined, {
        shallow: true,
      });
    }
  };

  return (
    // ⬇️ Match Gifts section spacing: py-16 sm:py-20 px-4 sm:px-10 w-full
    <section className={clsx("py-16 sm:py-20 px-4 sm:px-10 w-full", className)}>
      {/* Title */}
      {/* ⬇️ Give the title the same breathing room as Gifts: mb-12 sm:mb-16 */}
      <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wider leading-snug">
          {title}
        </h2>
      </div>

      {/* Mobile */}
      {/* ⬇️ Remove tight top margin; keep content aligned */}
      <div className="sm:hidden px-0">
        <div
          className="overflow-x-auto show-scrollbar"
          style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }}
          role="list"
          aria-label="Categories"
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
                !!activeSlug &&
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
                  aria-pressed={isActive}
                  aria-current={isActive ? "true" : undefined}
                  title={cat.label}
                >
                  <div className="relative w-full bg-[#25304f] aspect-[4/3]">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.label}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 128px, 200px"
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

      {/* Desktop */}
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
          <div
            className={clsx("grid gap-[8px]", gridCols)}
            role="list"
            aria-label="Categories"
          >
            {items.map((cat, i) => {
              const isActive =
                !!activeSlug &&
                activeSlug.toLowerCase() === cat.slug.toLowerCase();
              const common = clsx(
                "group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-transform duration-150 hover:scale-[1.03]",
                isActive && "ring-2 ring-white"
              );

              // When onSelect is provided, intercept and shallow-push; else fallback to Link.
              if (onSelect) {
                return (
                  <a
                    key={`d-${cat.slug}-${i}`}
                    href={
                      routeTo === "/jewelry"
                        ? undefined
                        : hrefForString(cat.slug)
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelect(cat.slug);
                    }}
                    className={common}
                    aria-label={cat.label}
                    aria-current={isActive ? "true" : undefined}
                    role="listitem"
                  >
                    <div className="relative w-full bg-[#25304f] aspect-[5/4]">
                      {cat.image ? (
                        <Image
                          src={cat.image}
                          alt={cat.label}
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 320px, 200px"
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
                );
              }

              // No onSelect: use Link. For /jewelry we pass the full href object to preserve filters.
              return routeTo === "/jewelry" ? (
                <Link
                  key={`d-${cat.slug}-${i}`}
                  href={
                    hrefFor(cat.slug) as {
                      pathname: string;
                      query: Record<string, any>;
                    }
                  }
                  className={common}
                  aria-label={cat.label}
                  aria-current={isActive ? "true" : undefined}
                  role="listitem"
                  shallow
                >
                  <div className="relative w-full bg-[#25304f] aspect-[5/4]">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.label}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 320px, 200px"
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
              ) : (
                <Link
                  key={`d-${cat.slug}-${i}`}
                  href={hrefForString(cat.slug)}
                  className={common}
                  aria-label={cat.label}
                  aria-current={isActive ? "true" : undefined}
                  role="listitem"
                  shallow
                >
                  <div className="relative w-full bg-[#25304f] aspect-[5/4]">
                    {cat.image ? (
                      <Image
                        src={cat.image}
                        alt={cat.label}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 320px, 200px"
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
