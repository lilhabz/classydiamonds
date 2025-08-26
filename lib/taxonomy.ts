// lib/taxonomy.ts
import type { Department } from "@/types/product";

/**
 * Authoritative taxonomy & filter configuration.
 * Add/rename here only — UI & API read from this file.
 */

export const DEPARTMENTS: Department[] = ["jewelry", "watch"];

/** Map department -> categories */
export const CATEGORIES: Record<Department, string[]> = {
  jewelry: ["ring", "bracelet", "necklace", "earring", "pendant", "anklet", "grillz"],
  watch: ["watch", "strap", "accessory"],
};

/** Map department.category -> subcategories */
export const SUBCATEGORIES: Record<string, string[]> = {
  "jewelry:ring": ["engagement", "wedding band", "fashion", "signet", "promise"],
  "jewelry:bracelet": ["tennis", "bangle", "link", "cuff"],
  "jewelry:necklace": ["chain", "tennis", "charm"],
  "jewelry:earring": ["stud", "hoop", "drop", "huggie"],
  "jewelry:pendant": ["initial", "religious", "custom photo", "stone"],
  "jewelry:anklet": ["chain", "tennis"],
  "jewelry:grillz": ["single", "set", "custom"],

  "watch:watch": ["dress", "sport", "diver", "chronograph", "luxury"],
  "watch:strap": ["leather", "metal", "rubber", "nylon"],
  "watch:accessory": ["links", "winders", "tools"],
};

/**
 * Filter specs by (department, category, subCategory).
 * Keys are field names; value is one of:
 *  - { type: "select", options: string[] }
 *  - { type: "number", unit?: string, step?: number }
 *  - { type: "text" }
 *  - { type: "boolean", label?: string }
 */
type SpecField =
  | { type: "select"; options: string[] }
  | { type: "number"; unit?: string; step?: number }
  | { type: "text" }
  | { type: "boolean"; label?: string };

export const BASE_SPECS: Record<string, SpecField> = {
  metal: { type: "select", options: ["gold", "white gold", "rose gold", "platinum", "silver", "stainless steel", "titanium"] },
  karat: { type: "select", options: ["10k", "14k", "18k", "22k", "24k"] },
  gemstone: { type: "select", options: ["diamond", "moissanite", "lab diamond", "emerald", "ruby", "sapphire", "none"] },
  carat: { type: "number", unit: "ct", step: 0.01 },
  size: { type: "text" },        // ring size, chain length, etc.
  length: { type: "number", unit: "in", step: 0.5 },
  width: { type: "number", unit: "mm", step: 0.1 },
  color: { type: "text" },
  clarity: { type: "select", options: ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3"] },
  cut: { type: "select", options: ["Round", "Princess", "Emerald", "Asscher", "Cushion", "Marquise", "Oval", "Radiant", "Pear", "Heart"] },
  custom: { type: "boolean", label: "Custom work" },
};

/** Map department.category(.subCategory)? -> spec subset to show */
export const SPEC_CONFIG: Record<string, (keyof typeof BASE_SPECS)[]> = {
  // Jewelry
  "jewelry:ring": ["metal", "karat", "gemstone", "carat", "clarity", "cut", "size", "custom"],
  "jewelry:bracelet": ["metal", "karat", "gemstone", "carat", "length", "width", "custom"],
  "jewelry:necklace": ["metal", "karat", "gemstone", "carat", "length", "custom"],
  "jewelry:earring": ["metal", "karat", "gemstone", "carat", "custom"],
  "jewelry:pendant": ["metal", "karat", "gemstone", "carat", "custom"],
  "jewelry:anklet": ["metal", "karat", "length", "custom"],
  "jewelry:grillz": ["metal", "karat", "custom"],

  // Watch
  "watch:watch": ["metal", "color", "custom"],
  "watch:strap": ["metal", "color", "length", "width"],
  "watch:accessory": ["color"],
};

export function keyFor(dept?: string, cat?: string, sub?: string) {
  const d = (dept || "").toLowerCase();
  const c = (cat || "").toLowerCase();
  const s = (sub || "").toLowerCase();
  return s ? `${d}:${c}:${s}` : `${d}:${c}`;
}

export function getCategories(dept?: string): string[] {
  if (!dept) return [];
  return CATEGORIES[dept as Department] || [];
}

export function getSubCategories(dept?: string, cat?: string): string[] {
  if (!dept || !cat) return [];
  return SUBCATEGORIES[`${dept}:${cat}`] || [];
}

export function getSpecFields(dept?: string, cat?: string, sub?: string): [string, SpecField][] {
  if (!dept || !cat) return [];
  const baseKey = `${dept}:${cat}`;
  const subKey = `${dept}:${cat}:${sub || ""}`; // optional override
  const keys =
    SPEC_CONFIG[subKey] ||
    SPEC_CONFIG[baseKey] ||
    [];

  return keys.map((k) => [k, BASE_SPECS[k]]);
}
