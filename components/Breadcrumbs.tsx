// 📂 components/Breadcrumbs.tsx – audience-aware crumbs + left-aligned + hide "subcategory" + correct links
import Link from "next/link";
import { useRouter } from "next/router";

type Audience = "him" | "her";

export default function Breadcrumbs({
  customLabels = {},
  customPaths = {},
  audience, // optional explicit audience from parent (e.g., ForHim page)
}: {
  customLabels?: Record<string, string>;
  customPaths?: Record<string, string>;
  audience?: Audience;
}) {
  const router = useRouter();

  const pathOnly = router.asPath.split("?")[0];
  const isCategoryRoute = pathOnly.startsWith("/category/");
  const isProductPage = router.pathname === "/category/[category]/[slug]";

  // --- helper: lowercase safely ---
  const lc = (v: any) => (typeof v === "string" ? v.toLowerCase() : undefined);

  // Determine if this breadcrumb trail should be "Watches" (top-level) instead of "Jewelry"
  // Cases:
  //  • /watches or /watches/...
  //  • /category/watch/... or /category/watches/...
  const originalSegments = pathOnly.split("/").filter(Boolean); // e.g. ["category","watch","submariner"]
  const firstSeg = originalSegments[0]; // "category" or "watches"
  const secondSeg = originalSegments[1]; // category slug on /category/ routes

  const qCategory = lc(router.query.category);
  const isWatchCategorySlug = qCategory === "watch" || qCategory === "watches";
  const isWatchesPath =
    firstSeg === "watches" ||
    (firstSeg === "category" &&
      (secondSeg === "watch" || secondSeg === "watches")) ||
    isWatchCategorySlug;

  // ✅ Canonical landing pages for top-level categories (incl. Watches)
  const CATEGORY_CANONICAL: Record<string, string> = {
    rings: "/category/rings",
    earrings: "/category/earrings",
    bracelets: "/category/bracelets",
    necklaces: "/category/necklaces",
    "necklaces-and-pendants": "/category/necklaces-and-pendants",
    "necklaces-pendants": "/category/necklaces-pendants",
    watch: "/watches",
    watches: "/watches",
  };

  // Remove display-only junk: "category", "subcategory", "subcatagory"
  const displaySegments = originalSegments.filter(
    (s) => s !== "category" && s !== "subcategory" && s !== "subcatagory"
  );

  // ---- Audience detection ----
  // 1) Prefer explicit prop from parent (e.g., /for-him page passes audience="him")
  let audienceProp: Audience | undefined = audience;

  // 2) Otherwise, derive from query (?audience=, legacy ?gender=)
  if (!audienceProp) {
    const raw = [
      ...(Array.isArray(router.query.audience)
        ? router.query.audience
        : router.query.audience
        ? [router.query.audience]
        : []),
      ...(Array.isArray(router.query.gender)
        ? router.query.gender
        : router.query.gender
        ? [router.query.gender]
        : []), // legacy
    ]
      .map((s) => String(s).toLowerCase().trim())
      .filter(Boolean);

    const hasHim =
      raw.includes("him") ||
      raw.includes("male") ||
      raw.includes("men") ||
      raw.includes("for-him") ||
      raw.includes("unisex") ||
      raw.includes("all") ||
      raw.includes("any");
    const hasHer =
      raw.includes("her") ||
      raw.includes("female") ||
      raw.includes("women") ||
      raw.includes("for-her") ||
      raw.includes("unisex") ||
      raw.includes("all") ||
      raw.includes("any");

    // Show a single audience crumb only if exactly one side is selected
    if (hasHim && !hasHer) audienceProp = "him";
    if (hasHer && !hasHim) audienceProp = "her";
  }

  // Start with the segments we want to show
  let filteredSegments = [...displaySegments];

  // If browsing audience-only (not product) and this is jewelry, hide the path crumbs so we show Home > Jewelry > For X
  const isAudienceContext = !!audienceProp && !isWatchesPath;
  if (isAudienceContext) {
    filteredSegments = isProductPage ? displaySegments.slice(-1) : [];
  }

  const formatLabel = (segment: string) => {
    const raw =
      customLabels[segment] ??
      segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    // Normalize watch labels
    if (segment === "watch" || segment === "watches") return "Watches";
    return raw;
  };

  // Build hrefs that point to the correct pages, even though we hid "subcategory"
  const buildHref = (index: number) => {
    const seg = filteredSegments[index];

    // 0) Developer-specified override wins
    if (seg && customPaths[seg]) return customPaths[seg];

    // 1) If the segment is a known top-level category, use its canonical page
    if (seg && CATEGORY_CANONICAL[seg]) {
      if (isProductPage && index === 0) return CATEGORY_CANONICAL[seg];
      if (isCategoryRoute && index === 0) return CATEGORY_CANONICAL[seg];
    }

    // 2) Category collection routes (jewelry): second visible segment is the subcategory
    // Build: /category/{category}/subcategory/{subcategory}
    if (!isWatchesPath && isCategoryRoute && index === 1) {
      const categorySeg = filteredSegments[0];
      return `/category/${encodeURIComponent(
        categorySeg
      )}/subcategory/${encodeURIComponent(seg!)}`;
    }

    // 3) Fallback: join the *display* segments we’re showing
    return "/" + filteredSegments.slice(0, index + 1).join("/");
  };

  return (
    <nav className="text-sm text-gray-400 mb-4 px-2">
      <ol className="flex flex-wrap items-center space-x-2">
        {/* Home */}
        {!(isAudienceContext && !isProductPage) && (
          <li>
            <Link href="/" className="hover:text-white text-white/80">
              Home
            </Link>
          </li>
        )}

        {/* Inject "Jewelry" ONLY for jewelry category routes (never for watches) */}
        {isCategoryRoute && !isWatchesPath && (
          <li className="flex items-center">
            <span className="mx-1">›</span>
            <Link href="/jewelry" className="hover:text-white text-white/70">
              Jewelry
            </Link>
          </li>
        )}

        {/* Watches as top-level (when applicable) */}
        {isWatchesPath && (
          <li className="flex items-center">
            <span className="mx-1">›</span>
            <Link href="/watches" className="hover:text-white text-white/70">
              Watches
            </Link>
          </li>
        )}

        {/* Audience crumb (only for jewelry context; link to dedicated landing pages) */}
        {!isWatchesPath && audienceProp && (
          <li className="flex items-center">
            <span className="mx-1">›</span>
            <Link
              href={audienceProp === "him" ? "/for-him" : "/for-her"}
              className="hover:text-white text-white/70 capitalize"
            >
              {audienceProp === "him" ? "For Him" : "For Her"}
            </Link>
          </li>
        )}

        {/* Category / Subcategory / Product label crumbs */}
        {filteredSegments.map((seg, i) => {
          // For watches, don't duplicate "watches" after we've already injected it above
          if (
            isWatchesPath &&
            (seg === "watch" || seg === "watches") &&
            i === 0
          ) {
            return null;
          }

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
