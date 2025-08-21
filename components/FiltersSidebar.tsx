// components/FiltersSidebar.tsx
"use client";

import { useRouter } from "next/router";
import { useMemo } from "react";
import { SUBCATEGORY_MAP, CATEGORY_LABELS, Category } from "@/data/taxonomy";

type FacetKey = "metal" | "stone" | "shape";
type RangeKey = "priceMin" | "priceMax" | "caratMin" | "caratMax";

const METALS = ["yellow-gold", "white-gold", "rose-gold", "platinum"];
const STONES = ["diamond", "lab-grown", "moissanite", "gemstone"];
const SHAPES = ["round", "oval", "princess", "emerald", "cushion", "pear"];

// Some routes may use "necklaces" but DB/taxonomy uses "necklaces-pendants".
const CATEGORY_ALIAS_TO_TAXONOMY: Record<string, Category> = {
  necklaces: "necklaces-pendants",
  "necklaces-pendants": "necklaces-pendants",
  rings: "rings",
  earrings: "earrings",
  bracelets: "bracelets",
  watches: "watches",
};

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function setParam(q: Record<string, any>, key: string, value?: any) {
  const next = { ...q };
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  ) {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
}

// "engagement-rings" -> "Engagement Rings"
const pretty = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function FiltersSidebar({ className }: { className?: string }) {
  const router = useRouter();
  const q = router.query;

  // read arrays
  const metals = toArray(q.metal);
  const stones = toArray(q.stone);
  const shapes = toArray(q.shape);

  // read ranges
  const priceMin = q.priceMin ? Number(q.priceMin) : undefined;
  const priceMax = q.priceMax ? Number(q.priceMax) : undefined;
  const caratMin = q.caratMin ? Number(q.caratMin) : undefined;
  const caratMax = q.caratMax ? Number(q.caratMax) : undefined;

  // current category from route params
  const currentCategorySlugRaw =
    (router.query.category as string) || (q.category as string) || "";
  const currentCategory: Category | undefined =
    CATEGORY_ALIAS_TO_TAXONOMY[currentCategorySlugRaw?.toLowerCase?.() || ""];

  // Subcategory support (drives ?sub=)
  const subSelected = typeof q.sub === "string" ? q.sub : undefined;
  const subOptions = useMemo(() => {
    if (!currentCategory) return [];
    // pull from taxonomy
    const list = SUBCATEGORY_MAP[currentCategory] || [];
    return list;
  }, [currentCategory]);

  const push = (nextQuery: Record<string, any>) => {
    router.push({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true,
    });
  };

  const toggleFacet = (key: FacetKey, value: string) => {
    const curr = toArray(q[key]);
    const exists = curr.includes(value);
    const nextArr = exists ? curr.filter((x) => x !== value) : [...curr, value];
    const next = setParam(q, key, nextArr);
    push(next);
  };

  const setRange = (key: RangeKey, value: number | undefined) => {
    const next = setParam(
      q,
      key,
      value && !Number.isNaN(value) ? String(value) : undefined
    );
    push(next);
  };

  const setSubcategory = (value: string) => {
    // "" or "all" clears the filter
    const v = value === "" || value === "all" ? undefined : value;
    const next = setParam(q, "sub", v);
    push(next);
  };

  const clearAll = () => {
    const next = { ...q };
    [
      "metal",
      "stone",
      "shape",
      "priceMin",
      "priceMax",
      "caratMin",
      "caratMax",
      "sub",
    ].forEach((k) => delete (next as any)[k]);
    push(next);
  };

  return (
    <aside className={className}>
      <div className="sticky top-24 p-4 rounded-xl bg-[#1b2440] border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold tracking-wide">Filters</h3>
          <button
            onClick={clearAll}
            className="text-sm text-white/70 hover:text-white underline"
          >
            Clear
          </button>
        </div>

        {/* Subcategory (only when the current category has defined subcategories) */}
        {currentCategory && subOptions.length > 0 && (
          <details open className="mb-3">
            <summary className="cursor-pointer select-none py-2 font-medium">
              Subcategory
            </summary>
            <div className="mt-2">
              <select
                value={subSelected ?? "all"}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#0f1530] border border-white/10 text-sm"
              >
                <option value="all">
                  All {CATEGORY_LABELS[currentCategory]}
                </option>
                {subOptions.map((s) => (
                  <option key={s} value={s}>
                    {pretty(s)}
                  </option>
                ))}
              </select>
            </div>
          </details>
        )}

        {/* Metal */}
        <details open className="mb-3">
          <summary className="cursor-pointer select-none py-2 font-medium">
            Metal
          </summary>
          <div className="mt-2 space-y-2">
            {METALS.map((m) => {
              const checked = metals.includes(m);
              return (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-white"
                    checked={checked}
                    onChange={() => toggleFacet("metal", m)}
                  />
                  <span className="capitalize">{m.replace("-", " ")}</span>
                </label>
              );
            })}
          </div>
        </details>

        {/* Stone */}
        <details open className="mb-3">
          <summary className="cursor-pointer select-none py-2 font-medium">
            Stone
          </summary>
          <div className="mt-2 space-y-2">
            {STONES.map((s) => {
              const checked = stones.includes(s);
              return (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-white"
                    checked={checked}
                    onChange={() => toggleFacet("stone", s)}
                  />
                  <span className="capitalize">{s.replace("-", " ")}</span>
                </label>
              );
            })}
          </div>
        </details>

        {/* Shape */}
        <details open className="mb-3">
          <summary className="cursor-pointer select-none py-2 font-medium">
            Shape
          </summary>
          <div className="mt-2 space-y-2">
            {SHAPES.map((s) => {
              const checked = shapes.includes(s);
              return (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-white"
                    checked={checked}
                    onChange={() => toggleFacet("shape", s)}
                  />
                  <span className="capitalize">{s}</span>
                </label>
              );
            })}
          </div>
        </details>

        {/* Price */}
        <details open className="mb-3">
          <summary className="cursor-pointer select-none py-2 font-medium">
            Price
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              inputMode="numeric"
              placeholder="Min"
              defaultValue={priceMin ?? ""}
              onBlur={(e) =>
                setRange(
                  "priceMin",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="px-3 py-2 rounded-md bg-[#0f1530] border border-white/10 text-sm"
            />
            <input
              inputMode="numeric"
              placeholder="Max"
              defaultValue={priceMax ?? ""}
              onBlur={(e) =>
                setRange(
                  "priceMax",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="px-3 py-2 rounded-md bg-[#0f1530] border border-white/10 text-sm"
            />
          </div>
        </details>

        {/* Carat */}
        <details>
          <summary className="cursor-pointer select-none py-2 font-medium">
            Carat
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              inputMode="decimal"
              placeholder="Min"
              defaultValue={caratMin ?? ""}
              onBlur={(e) =>
                setRange(
                  "caratMin",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="px-3 py-2 rounded-md bg-[#0f1530] border border-white/10 text-sm"
            />
            <input
              inputMode="decimal"
              placeholder="Max"
              defaultValue={caratMax ?? ""}
              onBlur={(e) =>
                setRange(
                  "caratMax",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="px-3 py-2 rounded-md bg-[#0f1530] border border-white/10 text-sm"
            />
          </div>
        </details>
      </div>
    </aside>
  );
}
