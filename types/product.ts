// types/product.ts

/** Supported audiences */
export type Audience = "him" | "her";

/** Department taxonomy */
export type Department = "jewelry" | "watch";

/** Spec fields vary by department/category/subCategory */
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
  department: Department;
  category?: string;
  subCategory?: string;

  /** ✅ Unified audience array schema */
  audience?: Audience[]; // e.g., ["him"], ["her"], or ["him","her"]

  /** ⚠️ Legacy only — will be normalized into `audience` */
  gender?: string;

  // pricing (legacy tolerant)
  price?: number | string;
  originalPrice?: number | string;
  salePrice?: number | string;
  discountedPrice?: number | string;
  unitPrice?: number | string;

  // media
  imageUrl?: string; // convenience/legacy primary image
  images?: string[]; // gallery (first will mirror imageUrl)

  // details
  description?: string;

  // structured filters (category/subCategory-specific)
  specs?: Specs;

  // admin/meta
  featured?: boolean;
  skuNumber?: number;

  /** 🆕 Stock flag (default true if missing) */
  inStock?: boolean;

  // system
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
