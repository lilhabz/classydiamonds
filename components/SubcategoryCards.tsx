// components/SubcategoryCards.tsx
import Link from "next/link";
import Image from "next/image";

export type Subcat = { key: string; label: string; image: string };

export default function SubcategoryCards({
  category,
  subcategories,
}: {
  category: string; // e.g., "rings"
  subcategories: Subcat[]; // e.g., the rings list below
}) {
  if (!subcategories?.length) return null;

  return (
    <div className="px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      {/* single row, no wrap; scroll on small screens */}
      <div className="mt-3 -mx-2 px-2 overflow-x-auto">
        <div className="flex gap-3 sm:gap-4 whitespace-nowrap">
          {subcategories.map((s) => (
            <Link
              key={s.key}
              href={`/category/${category}/subcategory/${s.key}`}
              className="group inline-block align-top w-[220px] sm:w-[240px] rounded-2xl overflow-hidden bg-[#25304f] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300"
            >
              <div className="relative aspect-[3/2]">
                <Image
                  src={s.image}
                  alt={s.label}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-end">
                  <span className="m-3 px-2 py-1 rounded-md text-white text-sm sm:text-base font-medium backdrop-blur-sm bg-black/30">
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
