// components/ProductGrid.tsx – responsive grid for ProductCard
"use client";

import ProductCard, { ProductCardProps } from "./ProductCard";

type GridProps = {
  items: (Omit<ProductCardProps, "onAddToCart"> & {
    // explicitly no Add to Cart here
    stockLabel?: string;
    subtitle?: string;
  })[];
  className?: string;
};

export default function ProductGrid({ items, className = "" }: GridProps) {
  return (
    <div
      className={`
        grid gap-x-6 gap-y-10
        grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        ${className}
      `}
    >
      {items.map((p) => (
        <ProductCard key={p.slug} {...p} />
      ))}
    </div>
  );
}
