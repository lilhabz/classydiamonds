// types/product.ts

export type Audience = "women" | "men" | "unisex" | "kids";
export type Department = "jewelry" | "watch";

/** Spec fields vary by department/category/subCategory. */
export type SpecValue = string | number | boolean;
export type Specs = Record<string, SpecValue>;

export interface Product {
  _id?: string;

  // naming
  /** Primary display title; legacy systems may also set `name` */
  title: string;
  /** Legacy/compat: some admin/data paths may still read/write `name` */
  name?: string;
  slug?: string;

  // taxonomy
  department: Department;        // "jewelry" | "watch"
  category?: string;             // e.g., "rings", "bracelets", "watches"
  subCategory?: string;          // e.g., "engagement", "tennis", etc.

  audience?: Audience[];         // default ["unisex"]
  gender?: "unisex" | "him" | "her"; // used by admin pages

  // pricing (legacy tolerant)
  price?: number | string;
  originalPrice?: number | string;
  salePrice?: number | string;
  discountedPrice?: number | string;
  unitPrice?: number | string;

  // media
  imageUrl?: string;             // convenience/legacy primary image
  images?: string[];             // gallery (first will mirror imageUrl)

  // details
  description?: string;

  // structured filters (category/subCategory-specific)
  specs?: Specs;

  // admin/meta (optional, used by some admin pages)
  featured?: boolean;
  skuNumber?: number;

  // system
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
