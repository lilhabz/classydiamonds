// components/SubcategoryCards.tsx
import Link from "next/link";
import Image from "next/image";

export type Subcat = { key: string; label: string; image: string };

export default function SubcategoryCards({
  category,
  subcategories,
}: {
  category: string; // e.g. "rings"
  subcategories: Subcat[]; // from CATEGORY_CONFIG[category].subcats
}) {
  if (!subcategories?.length) return null;

  return (
    <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {subcategories.map((s) => (
          <Link
            key={s.key}
            href={`/category/${category}/subcategory/${s.key}`}
            className="group relative overflow-hidden rounded-2xl bg-[#25304f] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300"
          >
            <div className="relative h-28 sm:h-32 md:h-40">
              <Image
                src={s.image}
                alt={s.label}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-black/25" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="px-2 py-1 rounded-md text-white text-sm sm:text-base font-medium backdrop-blur-sm bg-black/30">
                  {s.label}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
