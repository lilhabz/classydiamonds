// types/product.ts
export type Audience = "women" | "men" | "unisex" | "kids";
export type Department = "jewelry" | "watch";

/** spec fields vary by department/category/subCategory */
export type SpecValue = string | number | boolean;
export type Specs = Record<string, SpecValue>;

export interface Product {
  _id?: string;

  // naming
  title: string;
  slug?: string;

  // taxonomy
  department: Department;       // ← Jewelry or Watch (top-level tab)
  category?: string;            // ← rings, bracelets, pendants, watch straps, etc.
  subCategory?: string;         // ← e.g., engagement, tennis, link, etc.

  audience?: Audience[];        // default ["unisex"]

  // pricing (legacy tolerant)
  price?: number | string;
  originalPrice?: number | string;
  salePrice?: number | string;
  discountedPrice?: number | string;
  unitPrice?: number | string;

  // media
  images?: string[];

  // details
  description?: string;
  tags?: string[];

  // structured filters (category/subCategory-specific)
  specs?: Specs;

  // system
  createdAt?: string;
  updatedAt?: string;
}
