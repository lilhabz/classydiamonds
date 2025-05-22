// 📂 components/Breadcrumbs.tsx – Now points category crumbs at the jewelry page 💎

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

  // Strip off query and ignore the literal "category" segment
  const segments = router.asPath
    .split("?")[0]
    .split("/")
    .filter((s) => Boolean(s) && s !== "category");

  // Are we on a product-detail page? (category/[category]/[slug])
  const isProductPage = router.pathname === "/category/[category]/[slug]";

  const buildHref = (index: number) => {
    const segmentKey = segments[index];

    // 1️⃣ Custom override
    if (customPaths[segmentKey]) {
      return customPaths[segmentKey];
    }

    // 2️⃣ If this is the FIRST crumb on a product page, link into jewelry.tsx
    if (isProductPage && index === 0) {
      return `/jewelry?category=${segmentKey}&scroll=true`;
    }

    // 3️⃣ Fallback to reconstructing the path
    return "/" + segments.slice(0, index + 1).join("/");
  };

  return (
    <nav className="text-sm text-gray-400 mb-4 px-2">
      <ol className="flex flex-wrap items-center space-x-2">
        {/* ▶️ Home crumb */}
        <li>
          <Link href="/" className="hover:text-white text-white/80">
            Home
          </Link>
        </li>

        {/* 🔗 Dynamic crumbs */}
        {segments.map((seg, i) => {
          const href = buildHref(i);
          const label =
            customLabels[seg] ??
            // Humanize: replace dashes, capitalize
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
