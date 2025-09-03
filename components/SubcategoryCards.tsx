// components/SubcategoryCards.tsx
import Link from "next/link";
import Image from "next/image";

export type Subcat = { key: string; label: string; image: string };

export default function SubcategoryCards({
  category,
  subcategories,
}: {
  category: string;
  subcategories: Subcat[];
}) {
  if (!subcategories?.length) return null;

  return (
    <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      {/* Mobile: horizontal swipe. Desktop: no overflow, centered, one line */}
      <div className="mt-3 -mx-2 px-2 overflow-x-auto sm:overflow-visible no-scrollbar touch-pan-x">
        <div className="flex w-max sm:w-auto gap-3 sm:gap-3 md:gap-4 whitespace-nowrap sm:whitespace-normal sm:justify-center">
          {subcategories.map((s) => (
            <Link
              key={s.key}
              href={{
                pathname: `/category/${encodeURIComponent(
                  category
                )}/subcategory/${encodeURIComponent(s.key)}`,
                query: { scroll: "true" },
              }}
              aria-label={`${s.label} in ${category}`}
              /* Prevent shrink on mobile (for swipe). On desktop, allow normal flow. */
              className="group inline-block align-top flex-none sm:flex-initial rounded-2xl overflow-hidden bg-[#25304f] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300
                         w-32 sm:w-[168px] md:w-[188px] lg:w-[200px]"
            >
              {/* Keep the same visual ratio as CategoryGrid cards */}
              <div className="relative aspect-[4/3]">
                <Image
                  src={s.image}
                  alt={s.label}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  sizes="(max-width: 640px) 8rem, (max-width: 768px) 168px, (max-width: 1024px) 188px, 200px"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-end justify-center">
                  <span className="mb-3 px-3 py-1 rounded-md text-white text-sm sm:text-base font-medium backdrop-blur-sm bg-black/30 text-center">
                    {s.label}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
