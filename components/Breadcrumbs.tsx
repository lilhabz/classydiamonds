// 📂 components/Breadcrumbs.tsx – Category crumb now always points at /jewelry

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
  const segments = router.asPath
    .split("?")[0]
    .split("/")
    .filter((s) => Boolean(s) && s !== "category");

  const genderParam =
    router.query.gender === "him"
      ? "for-him"
      : router.query.gender === "her"
      ? "for-her"
      : router.query.category === "for-him" || router.query.category === "for-her"
      ? (router.query.category as string)
      : null;

  const isProductPage = router.pathname === "/category/[category]/[slug]";

  const buildHref = (index: number) => {
    const key = segments[index];

    // 1️⃣ Product page & first crumb: always link into /jewelry
    if (isProductPage && index === 0) {
      return `/jewelry?category=${encodeURIComponent(key)}&scroll=true`;
    }

    // 2️⃣ Then allow customPaths for everything else (e.g. slug crumb)
    if (customPaths[key]) {
      return customPaths[key];
    }

    // 3️⃣ Fallback to reconstructing the URL
    return "/" + segments.slice(0, index + 1).join("/");
  };

  return (
    <nav className="text-sm text-gray-400 mb-4 px-2">
      <ol className="flex flex-wrap items-center space-x-2">
        <li>
          <Link href="/" className="hover:text-white text-white/80">
            Home
          </Link>
        </li>
        {genderParam && (
          <li className="flex items-center">
            <span className="mx-1">›</span>
            <Link
              href={`/jewelry?gender=${genderParam === "for-him" ? "him" : "her"}&scroll=true`}
              className="hover:text-white text-white/70 capitalize"
            >
              {genderParam === "for-him" ? "For Him" : "For Her"}
            </Link>
          </li>
        )}
        {segments.map((seg, i) => {
          const href = buildHref(i);
          const disableScroll = isProductPage && i === 0;
          const label =
            customLabels[seg] ??
            seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

          return (
            <li key={i} className="flex items-center">
              <span className="mx-1">›</span>
              <Link
                href={href}
                scroll={disableScroll ? false : undefined}
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
