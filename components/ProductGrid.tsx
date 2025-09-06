// components/ProductGrid.tsx — responsive grid for ProductCard (uniform sizing)
"use client";

import ProductCard, { ProductCardProps } from "./ProductCard";

type GridItem = Omit<ProductCardProps, "style" | "className"> & {
  className?: string;
};
type GridProps = {
  items: GridItem[];
  className?: string;
};

export default function ProductGrid({ items, className = "" }: GridProps) {
  return (
    <div
      className={
        // ✅ Use shared CSS grid + keep Tailwind as a harmless fallback
        `product-grid grid gap-x-6 gap-y-10 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${className}`
      }
    >
      {items.map((p) => (
        <ProductCard key={p.slug} {...p} />
      ))}
    </div>
  );
}
