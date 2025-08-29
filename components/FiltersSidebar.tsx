// components/FiltersSidebar.tsx
"use client";

import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { SUBCATEGORY_MAP, CATEGORY_LABELS, Category } from "@/data/taxonomy";

type FacetKey = "metal" | "stone" | "shape";
type RangeKey = "priceMin" | "priceMax" | "caratMin" | "caratMax";

const FALLBACK_METALS = ["yellow-gold", "white-gold", "rose-gold", "platinum"];
const FALLBACK_STONES = ["diamond", "lab-grown", "moissanite", "gemstone"];
const FALLBACK_SHAPES = [
  "round",
  "oval",
  "princess",
  "emerald",
  "cushion",
  "pear",
];

// Alias map (kept from your original)
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
    delete (next as any)[key];
  } else {
    next[key] = value;
  }
  return next;
}

// "engagement-rings" -> "Engagement Rings"
const pretty = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type DynamicFacets = {
  metals?: string[];
  stones?: string[];
  shapes?: string[];
  priceBounds?: { min: number; max: number };
  caratBounds?: { min: number; max: number };
  extras?: Record<string, string[]>;
};

export default function FiltersSidebar({
  className,
  mode = "desktop",
  open = false,
  onClose,
}: {
  /** "desktop" renders sticky sidebar only; "drawer" renders mobile drawer only */
  mode?: "desktop" | "drawer";
  /** For drawer mode: whether it is open */
  open?: boolean;
  /** For drawer mode: close handler */
  onClose?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const q = router.query;

  // Current category derived from route/query
  const currentCategorySlugRaw =
    (router.query.category as string) || (q.category as string) || "";
  const currentCategory: Category | undefined =
    CATEGORY_ALIAS_TO_TAXONOMY[currentCategorySlugRaw?.toLowerCase?.() || ""];

  // Subcategory selection & list
  const subSelected = typeof q.sub === "string" ? q.sub : undefined;
  const subOptions = useMemo(() => {
    if (!currentCategory) return [];
    return SUBCATEGORY_MAP[currentCategory] || [];
  }, [currentCategory]);

  // Arrays from URL
  const metals = toArray(q.metal);
  const stones = toArray(q.stone);
  const shapes = toArray(q.shape);

  // Range values from URL
  const priceMinQ = q.priceMin ? Number(q.priceMin) : undefined;
  const priceMaxQ = q.priceMax ? Number(q.priceMax) : undefined;
  const caratMinQ = q.caratMin ? Number(q.caratMin) : undefined;
  const caratMaxQ = q.caratMax ? Number(q.caratMax) : undefined;

  // Dynamic facets from API (fallback-safe)
  const [dyn, setDyn] = useState<DynamicFacets>({
    metals: FALLBACK_METALS,
    stones: FALLBACK_STONES,
    shapes: FALLBACK_SHAPES,
    priceBounds: { min: 0, max: 50000 },
    caratBounds: { min: 0, max: 10 },
    extras: {},
  });

  useEffect(() => {
    let cancelled = false;
    const fetchFacets = async () => {
      try {
        const params = new URLSearchParams();
        if (currentCategory) params.set("category", currentCategory);
        if (typeof subSelected === "string" && subSelected !== "all") {
          params.set("subcategory", subSelected);
        }
        const res = await fetch(`/api/facets?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          setDyn({
            metals: data.metals?.length ? data.metals : FALLBACK_METALS,
            stones: data.stones?.length ? data.stones : FALLBACK_STONES,
            shapes: data.shapes?.length ? data.shapes : FALLBACK_SHAPES,
            priceBounds: data.priceBounds || { min: 0, max: 50000 },
            caratBounds: data.caratBounds || { min: 0, max: 10 },
            extras: data.extras || {},
          });
        }
      } catch {
        if (!cancelled) {
          setDyn((d) => ({
            ...d,
            metals: FALLBACK_METALS,
            stones: FALLBACK_STONES,
            shapes: FALLBACK_SHAPES,
            priceBounds: { min: 0, max: 50000 },
            caratBounds: { min: 0, max: 10 },
            extras: {},
          }));
        }
      }
    };
    fetchFacets();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory, subSelected]);

  // Local slider state mirrors URL/range
  const [priceMin, setPriceMin] = useState<number>(
    priceMinQ ?? dyn.priceBounds!.min
  );
  const [priceMax, setPriceMax] = useState<number>(
    priceMaxQ ?? dyn.priceBounds!.max
  );
  const [caratMin, setCaratMin] = useState<number>(
    caratMinQ ?? dyn.caratBounds!.min
  );
  const [caratMax, setCaratMax] = useState<number>(
    caratMaxQ ?? dyn.caratBounds!.max
  );

  // Normalize when bounds change (category/subcategory switch)
  useEffect(() => {
    setPriceMin(priceMinQ ?? dyn.priceBounds!.min);
    setPriceMax(priceMaxQ ?? dyn.priceBounds!.max);
    setCaratMin(caratMinQ ?? dyn.caratBounds!.min);
    setCaratMax(caratMaxQ ?? dyn.caratBounds!.max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dyn.priceBounds?.min,
    dyn.priceBounds?.max,
    dyn.caratBounds?.min,
    dyn.caratBounds?.max,
  ]);

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
      value !== undefined && !Number.isNaN(value) ? String(value) : undefined
    );
    push(next);
  };

  const commitPrice = () => {
    const lo = Math.min(priceMin, priceMax);
    const hi = Math.max(priceMin, priceMax);
    const next = setParam(
      q,
      "priceMin",
      lo === dyn.priceBounds!.min ? undefined : lo
    );
    const finalQ = setParam(
      next,
      "priceMax",
      hi === dyn.priceBounds!.max ? undefined : hi
    );
    push(finalQ);
  };

  const commitCarat = () => {
    const lo = Math.min(caratMin, caratMax);
    const hi = Math.max(caratMin, caratMax);
    const next = setParam(
      q,
      "caratMin",
      lo === dyn.caratBounds!.min ? undefined : lo
    );
    const finalQ = setParam(
      next,
      "caratMax",
      hi === dyn.caratBounds!.max ? undefined : hi
    );
    push(finalQ);
  };

  const setSubcategory = (value: string) => {
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
      // clear any extras if present
      "style",
      "color",
      "clarity",
      "cut",
    ].forEach((k) => delete (next as any)[k]);
    push(next);
  };

  const percent = (value: number, min: number, max: number) =>
    ((value - min) * 100) / (max - min);

  const priceLeft = percent(
    Math.min(priceMin, priceMax),
    dyn.priceBounds!.min,
    dyn.priceBounds!.max
  );
  const priceRight = percent(
    Math.max(priceMin, priceMax),
    dyn.priceBounds!.min,
    dyn.priceBounds!.max
  );
  const caratLeft = percent(
    Math.min(caratMin, caratMax),
    dyn.caratBounds!.min,
    dyn.caratBounds!.max
  );
  const caratRight = percent(
    Math.max(caratMin, caratMax),
    dyn.caratBounds!.min,
    dyn.caratBounds!.max
  );

  // --- UI content (shared between desktop + drawer) ---
  const Content = (
    <div className="p-4 rounded-xl bg-[#1b2440] border border-white/10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold tracking-wide">Filters</h3>
        <button
          onClick={clearAll}
          className="text-sm text-white/70 hover:text-white underline"
        >
          Clear
        </button>
      </div>

      {/* Subcategory (only when a category is selected) */}
      {currentCategory && subOptions.length > 0 && (
        <details className="mb-3">
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
      <details className="mb-3">
        <summary className="cursor-pointer select-none py-2 font-medium">
          Metal
        </summary>
        <div className="mt-2 space-y-2">
          {(dyn.metals || FALLBACK_METALS).map((m) => {
            const checked = metals.includes(m);
            return (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-white"
                  checked={checked}
                  onChange={() => toggleFacet("metal", m)}
                />
                <span className="capitalize">{m.replace(/-/g, " ")}</span>
              </label>
            );
          })}
        </div>
      </details>

      {/* Stone */}
      <details className="mb-3">
        <summary className="cursor-pointer select-none py-2 font-medium">
          Stone
        </summary>
        <div className="mt-2 space-y-2">
          {(dyn.stones || FALLBACK_STONES).map((s) => {
            const checked = stones.includes(s);
            return (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-white"
                  checked={checked}
                  onChange={() => toggleFacet("stone", s)}
                />
                <span className="capitalize">{s.replace(/-/g, " ")}</span>
              </label>
            );
          })}
        </div>
      </details>

      {/* Shape */}
      <details className="mb-3">
        <summary className="cursor-pointer select-none py-2 font-medium">
          Shape
        </summary>
        <div className="mt-2 space-y-2">
          {(dyn.shapes || FALLBACK_SHAPES).map((s) => {
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

      {/* Extra facets from admin (style, color, clarity, cut, etc.) */}
      {dyn.extras &&
        Object.entries(dyn.extras).map(([key, values]) => {
          const selected = toArray(q[key as any]);
          if (!values?.length) return null;
          return (
            <details key={key} className="mb-3">
              <summary className="cursor-pointer select-none py-2 font-medium">
                {pretty(key)}
              </summary>
              <div className="mt-2 space-y-2">
                {values.map((v) => {
                  const checked = selected.includes(v);
                  return (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-white"
                        checked={checked}
                        onChange={() => {
                          const curr = toArray(q[key as any]);
                          const exists = curr.includes(v);
                          const nextArr = exists
                            ? curr.filter((x) => x !== v)
                            : [...curr, v];
                          const next = setParam(q, key, nextArr);
                          push(next);
                        }}
                      />
                      <span className="capitalize">{v.replace(/-/g, " ")}</span>
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}

      {/* Price (Dual Slider) */}
      <details className="mb-3">
        <summary className="cursor-pointer select-none py-2 font-medium">
          Price
        </summary>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-white/70 mb-2">
            <span>${Math.min(priceMin, priceMax).toLocaleString()}</span>
            <span>${Math.max(priceMin, priceMax).toLocaleString()}</span>
          </div>

          <div className="relative h-8">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/15 rounded" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 bg-white rounded"
              style={{
                left: `${priceLeft}%`,
                right: `${100 - priceRight}%`,
              }}
            />
            <input
              type="range"
              min={dyn.priceBounds!.min}
              max={dyn.priceBounds!.max}
              step={50}
              value={Math.min(priceMin, priceMax)}
              onChange={(e) => setPriceMin(Number(e.target.value))}
              onMouseUp={commitPrice}
              onTouchEnd={commitPrice}
              aria-label="Minimum price"
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto"
            />
            <input
              type="range"
              min={dyn.priceBounds!.min}
              max={dyn.priceBounds!.max}
              step={50}
              value={Math.max(priceMin, priceMax)}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              onMouseUp={commitPrice}
              onTouchEnd={commitPrice}
              aria-label="Maximum price"
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              inputMode="numeric"
              placeholder="Min"
              value={Math.min(priceMin, priceMax)}
              onChange={(e) =>
                setPriceMin(Number(e.target.value || dyn.priceBounds!.min))
              }
              onBlur={commitPrice}
              className="px-3 py-2 rounded-md bg-[#0f1530] border border-white/10 text-sm"
            />
            <input
              inputMode="numeric"
              placeholder="Max"
              value={Math.max(priceMin, priceMax)}
              onChange={(e) =>
                setPriceMax(Number(e.target.value || dyn.priceBounds!.max))
              }
              onBlur={commitPrice}
              className="px-3 py-2 rounded-md bg-[#0f1530] border border-white/10 text-sm"
            />
          </div>
        </div>
      </details>

      {/* Carat (Dual Slider) */}
      <details>
        <summary className="cursor-pointer select-none py-2 font-medium">
          Carat
        </summary>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-white/70 mb-2">
            <span>{Math.min(caratMin, caratMax).toFixed(2)} ct</span>
            <span>{Math.max(caratMin, caratMax).toFixed(2)} ct</span>
          </div>

          <div className="relative h-8">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-white/15 rounded" />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 bg-white rounded"
              style={{
                left: `${caratLeft}%`,
                right: `${100 - caratRight}%`,
              }}
            />
            <input
              type="range"
              min={dyn.caratBounds!.min}
              max={dyn.caratBounds!.max}
              step={0.01}
              value={Math.min(caratMin, caratMax)}
              onChange={(e) => setCaratMin(Number(e.target.value))}
              onMouseUp={commitCarat}
              onTouchEnd={commitCarat}
              aria-label="Minimum carat"
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto"
            />
            <input
              type="range"
              min={dyn.caratBounds!.min}
              max={dyn.caratBounds!.max}
              step={0.01}
              value={Math.max(caratMin, caratMax)}
              onChange={(e) => setCaratMax(Number(e.target.value))}
              onMouseUp={commitCarat}
              onTouchEnd={commitCarat}
              aria-label="Maximum carat"
              className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <input
              inputMode="decimal"
              placeholder="Min"
              value={Math.min(caratMin, caratMax)}
              onChange={(e) =>
                setCaratMin(Number(e.target.value || dyn.caratBounds!.min))
              }
              onBlur={commitCarat}
              className="px-3 py-2 rounded-md bg-[#0f1530] border border-white/10 text-sm"
            />
            <input
              inputMode="decimal"
              placeholder="Max"
              value={Math.max(caratMin, caratMax)}
              onChange={(e) =>
                setCaratMax(Number(e.target.value || dyn.caratBounds!.max))
              }
              onBlur={commitCarat}
              className="px-3 py-2 rounded-md bg-[#0f1530] border border-white/10 text-sm"
            />
          </div>
        </div>
      </details>
    </div>
  );

  // --- RENDER based on mode ---
  if (mode === "desktop") {
    // Sticky sidebar only; parent can control visibility via Tailwind (e.g., hidden lg:block)
    return (
      <aside className={className}>
        <div className="sticky top-24">{Content}</div>
      </aside>
    );
  }

  // Drawer mode (mobile). Only render if open === true. Hidden on lg+.
  if (mode === "drawer") {
    if (!open) return null;
    return (
      <div
        className="lg:hidden fixed inset-0 z-50"
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
      >
        {/* Backdrop */}
        <button
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
          aria-label="Close filters"
        />
        {/* Panel */}
        <div className="absolute right-0 top-0 h-full w-[90%] max-w-sm bg-[var(--bg-page)] shadow-2xl overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[var(--bg-page)]">
            <h2 className="text-base font-semibold">Filters</h2>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm"
              aria-label="Close"
            >
              Close
            </button>
          </div>
          <div className="p-4">{Content}</div>
        </div>
      </div>
    );
  }

  return null;
}
