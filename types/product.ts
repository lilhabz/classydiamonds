// types/product.ts
export type Audience = "women" | "men" | "unisex" | "kids";

export interface Product {
  _id?: string;

  // basics
  title: string;
  slug?: string;

  // taxonomy
  category: "jewelry" | "watch";
  subCategory?: string;

  // replaces gender
  audience?: Audience[]; // default ["unisex"]

  // pricing (tolerant to legacy)
  price?: number | string;
  originalPrice?: number | string;
  salePrice?: number | string;
  discountedPrice?: number | string;
  unitPrice?: number | string;

  // media
  images?: string[];

  // misc
  description?: string;
  tags?: string[];

  // system
  createdAt?: string;
  updatedAt?: string;
}
