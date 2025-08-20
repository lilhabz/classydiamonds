// 📂 components/Breadcrumbs.tsx – Final Cleaned Version ✅
// - Watches + Jewelry fixed
// - Gender crumbs handled
// - Auto capitalization
// - Custom labels/paths respected

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

  // Split into path segments, excluding query + "category"
  const segments = router.asPath
    .split("?")[0]
    .split("/")
    .filter((s) => Boolean(s) && s !== "category");

  const genderParam =
    router.query.gender === "him"
      ? "for-him"
      : router.query.gender === "her"
      ? "for-her"
      : router.query.category === "for-him" ||
        router.query.category === "for-her"
      ? (router.query.category as string)
      : null;

  const isProductPage = router.pathname === "/category/[category]/[slug]";
  let filteredSegments = [...segments];

  // If browsing gender-only (not product), only show gender crumb
  if (genderParam) {
    filteredSegments = isProductPage ? segments.slice(-1) : [];
  }

  // Build hrefs for crumbs
  const buildHref = (index: number) => {
    const key = segments[index];
    const isWatches = key?.toLowerCase() === "watches";

    // On product page, first crumb = Watches or Jewelry
    if (isProductPage && index === 0) {
      return isWatches
        ? "/watches"
        : `/jewelry?category=${encodeURIComponent(key)}&scroll=true`;
    }

    // Custom path overrides
    if (customPaths[key]) return customPaths[key];

    // Default: rebuild path
    return "/" + segments.slice(0, index + 1).join("/");
  };

  // Format label for crumb
  const formatLabel = (segment: string) => {
    return (
      customLabels[segment] ??
      segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  return (
    <nav className="text-sm text-gray-400 mb-4 px-2">
      <ol className="flex flex-wrap items-center space-x-2">
        {/* 🏠 Home */}
        {!(genderParam && !isProductPage) && (
          <li>
            <Link href="/" className="hover:text-white text-white/80">
              Home
            </Link>
          </li>
        )}

        {/* 👔 Gender crumb */}
        {genderParam && (
          <li className="flex items-center">
            <span className="mx-1">›</span>
            <Link
              href={`/jewelry?gender=${
                genderParam === "for-him" ? "him" : "her"
              }&scroll=true`}
              className="hover:text-white text-white/70 capitalize"
            >
              {genderParam === "for-him" ? "For Him" : "For Her"}
            </Link>
          </li>
        )}

        {/* 📍 Category & Product crumbs */}
        {filteredSegments.map((seg, i) => {
          const origIndex = segments.indexOf(seg);
          const href = buildHref(origIndex);
          const disableScroll = isProductPage && origIndex === 0;
          const label = formatLabel(seg);

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
