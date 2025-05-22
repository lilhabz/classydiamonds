// 📂 components/Breadcrumbs.tsx – Category crumbs now go to Jewelry page 💎

import Link from "next/link";
import { useRouter } from "next/router";

export default function Breadcrumbs({
  customLabels = {},
  customPaths = {},
}: {
  customLabels?: Record<string, string>;
  customPaths?: Record<string, string>;
}) {
  const router = useRouter();
  // Remove query string, split on slashes, drop any empty & the literal "category"
  const segments = router.asPath
    .split("?")[0]
    .split("/")
    .filter((s) => Boolean(s) && s !== "category");

  // Are we on a product-detail page under /category/[category]/[slug]?
  const isProductPage = router.pathname === "/category/[category]/[slug]";

  const buildHref = (index: number) => {
    const key = segments[index];

    // 1️⃣ Respect any custom override
    if (customPaths[key]) {
      return customPaths[key];
    }

    // 2️⃣ If this is the first segment on a product page, point to /jewelry
    if (isProductPage && index === 0) {
      return `/jewelry?category=${encodeURIComponent(key)}&scroll=true`;
    }

    // 3️⃣ Fallback to reconstruct path as normal
    return "/" + segments.slice(0, index + 1).join("/");
  };

  return (
    <nav className="text-sm text-gray-400 mb-4 px-2">
      <ol className="flex flex-wrap items-center space-x-2">
        {/* Home crumb */}
        <li>
          <Link href="/" className="hover:text-white text-white/80">
            Home
          </Link>
        </li>

        {/* Dynamic crumbs */}
        {segments.map((seg, i) => {
          const href = buildHref(i);
          const label =
            customLabels[seg] ??
            seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <li key={i} className="flex items-center">
              <span className="mx-1">›</span>
              <Link
                href={href}
                className="hover:text-white text-white/70 capitalize"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
