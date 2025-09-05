// lib/audience.ts
export type Audience = "women" | "men" | "unisex" | "kids";

/**
 * Normalize loose audience inputs into canonical Audience[].
 * Accepts values like "him"/"her", "male"/"female", "for-him"/"for-her",
 * "men"/"women", "unisex", "kids", "all"/"any".
 * Defaults to ["unisex"] if nothing matches.
 */
export function normalizeAudience(input: unknown): Audience[] {
  const vals: string[] = Array.isArray(input)
    ? (input as any[]).map(String)
    : input
    ? [String(input)]
    : [];

  const set = new Set<Audience>();

  for (const raw of vals) {
    const v = String(raw).toLowerCase().trim();

    // map him/her -> men/women
    if (["him", "male", "men", "for-him"].includes(v)) set.add("men");
    if (["her", "female", "women", "for-her"].includes(v)) set.add("women");

    // canonical direct values
    if (["men", "women", "unisex", "kids"].includes(v)) {
      set.add(v as Audience);
    }

    // wildcards
    if (["all", "any"].includes(v)) {
      set.add("men");
      set.add("women");
    }
  }

  if (set.size === 0) set.add("unisex");
  return Array.from(set);
}
