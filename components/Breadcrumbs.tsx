// 📂 components/Breadcrumbs.tsx

import Link from "next/link";
import { useRouter } from "next/router";
import slugify from "slugify";

export default function Breadcrumbs({
  customLabels = {},
}: {
  customLabels?: Record<string, string>;
}) {
  const router = useRouter();
  const segments = router.asPath.split("?")[0].split("/").filter(Boolean);

  const buildHref = (index: number) =>
    "/" + segments.slice(0, index + 1).join("/");

  return (
    <nav className="text-sm text-gray-400 mb-4 px-2">
      <ol className="flex flex-wrap items-center space-x-2">
        <li>
          <Link href="/" className="hover:text-white text-white/80">
            Home
          </Link>
        </li>
        {segments.map((seg, i) => {
          const href = buildHref(i);
          const label =
            customLabels[seg] ??
            seg.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
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
