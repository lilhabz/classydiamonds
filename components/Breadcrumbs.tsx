// 📂 components/Breadcrumbs.tsx – Jewelry crumb + left-aligned + existing logic

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

  const pathOnly = router.asPath.split("?")[0];
  const isCategoryRoute = pathOnly.startsWith("/category/");

  // Remove the literal "category" segment for display
  const segments = pathOnly
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

  const buildHref = (index: number) => {
    const key = segments[index];
    const isWatches = key?.toLowerCase() === "watches";

    if (isProductPage && index === 0) {
      return isWatches
        ? "/watches"
        : `/jewelry?category=${encodeURIComponent(key)}&scroll=true`;
    }

    if (customPaths[key]) return customPaths[key];

    return "/" + segments.slice(0, index + 1).join("/");
  };

  const formatLabel = (segment: string) =>
    customLabels[segment] ??
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // LEFT-ALIGNED container like other pages
  return (
    <nav className="text-sm text-gray-400 mb-4 px-2">
      <ol className="flex flex-wrap items-center space-x-2">
        {/* Home */}
        {!(genderParam && !isProductPage) && (
          <li>
            <Link href="/" className="hover:text-white text-white/80">
              Home
            </Link>
          </li>
        )}

        {/* Inject "Jewelry" when on /category/... */}
        {isCategoryRoute && (
          <li className="flex items-center">
            <span className="mx-1">›</span>
            <Link href="/jewelry" className="hover:text-white text-white/70">
              Jewelry
            </Link>
          </li>
        )}

        {/* Gender crumb */}
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

        {/* Category & product crumbs */}
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
