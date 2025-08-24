// 📂 components/Breadcrumbs.tsx – Jewelry crumb + left-aligned + hide "subcategory" + correct links
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

  // ✅ Canonical landing pages for top-level categories
  const CATEGORY_CANONICAL: Record<string, string> = {
    rings: "/category/rings",
    earrings: "/category/earrings",
    bracelets: "/category/bracelets",
    necklaces: "/category/necklaces",
    // add any others you support, e.g. watches: "/category/watches"
  };

  // Split once so we can both (1) render labels without "subcategory" and
  // (2) still build correct hrefs for subcategory pages.
  const originalSegments = pathOnly.split("/").filter(Boolean);

  // Remove display-only junk: "category", "subcategory", "subcatagory"
  const displaySegments = originalSegments.filter(
    (s) => s !== "category" && s !== "subcategory" && s !== "subcatagory"
  );

  const genderParam =
    router.query.gender === "him"
      ? "for-him"
      : router.query.gender === "her"
      ? "for-her"
      : router.query.category === "for-him" || router.query.category === "for-her"
      ? (router.query.category as string)
      : null;

  const isProductPage = router.pathname === "/category/[category]/[slug]";

  // Start with the segments we want to show
  let filteredSegments = [...displaySegments];

  // If browsing gender-only (not product), only show gender crumb
  if (genderParam) {
    filteredSegments = isProductPage ? displaySegments.slice(-1) : [];
  }

  const formatLabel = (segment: string) =>
    customLabels[segment] ??
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Build hrefs that point to the correct pages, even though we hid "subcategory"
  const buildHref = (index: number) => {
    const seg = filteredSegments[index];

    // 0) Developer-specified override wins
    if (seg && customPaths[seg]) return customPaths[seg];

    // 1) If the segment is a known top-level category, use its canonical page
    if (seg && CATEGORY_CANONICAL[seg]) {
      // • On PDP (product page), first crumb should go to canonical category
      // • On /category/... routes, first visible crumb should also go to canonical
      if (isProductPage && index === 0) return CATEGORY_CANONICAL[seg];
      if (isCategoryRoute && index === 0) return CATEGORY_CANONICAL[seg];
    }

    // 2) Category collection routes: second visible segment is the subcategory
    // Build: /category/{category}/subcategory/{subcategory}
    if (isCategoryRoute && index === 1) {
      const categorySeg = filteredSegments[0];
      return `/category/${encodeURIComponent(
        categorySeg
      )}/subcategory/${encodeURIComponent(seg!)}`;
    }

    // 3) Fallback: join the *display* segments we’re showing
    return "/" + filteredSegments.slice(0, index + 1).join("/");
  };

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
              href={`/jewelry?gender=${genderParam === "for-him" ? "him" : "her"}&scroll=true`}
              className="hover:text-white text-white/70 capitalize"
            >
              {genderParam === "for-him" ? "For Him" : "For Her"}
            </Link>
          </li>
        )}

        {/* Category / Subcategory / Product label crumbs */}
        {filteredSegments.map((seg, i) => {
          const href = buildHref(i);
          // Keep your "don’t auto-scroll" behavior for the category crumb on PDP
          const disableScroll = isProductPage && i === 0;
          const label = formatLabel(seg);

          return (
            <li key={`${seg}-${i}`} className="flex items-center">
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
