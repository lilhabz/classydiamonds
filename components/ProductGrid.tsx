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
        // ✅ Use shared CSS grid sizing without forcing fixed column counts
        `product-grid grid gap-x-6 gap-y-10 ${className}`
      }
    >
      {items.map((p) => (
        <ProductCard key={p.slug} {...p} />
      ))}
    </div>
  );
}
