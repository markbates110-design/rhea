import type { VenueType } from "@/lib/ratings/scoring";

/**
 * Google Places `types[]` that *legitimately* signal a venue's dining
 * format. The previous version of this file lumped cuisine-shaped tags
 * (`pizza_restaurant`, `taco_restaurant`, `hamburger_restaurant`,
 * `coffee_shop`, etc.) into `fast-food`, which mis-classified every
 * sit-down pizza joint, casual taquería, craft burger pub, and table-
 * service café as fast-food. Those tags describe *what the food is*,
 * not *how the venue serves it* — they belong in `lib/places/cuisine.ts`
 * (and they live there now). This file is format-only.
 *
 * The four buckets here each map to genuinely format-revealing tags
 * Google attaches to a place. Anything not matching falls through to
 * `casual`, which is the right default for "a restaurant about which we
 * have no specific format signal."
 */
const TYPES_BY_VENUE: Record<VenueType, readonly string[]> = {
  "fast-food": ["fast_food_restaurant"],
  "food-truck": ["food_truck", "food_stall", "street_food"],
  fine: ["fine_dining_restaurant"],
  casual: ["casual_dining_restaurant", "restaurant"],
};

/**
 * Priority order: most-specific format tag wins. `fine` and `food-truck`
 * are mutually exclusive in practice, so the relative ordering between
 * them doesn't matter — both come before `fast-food` and `casual` because
 * they're the rarest, highest-signal tags. `fast-food` ahead of `casual`
 * so an explicit `fast_food_restaurant` tag beats a generic `restaurant`.
 */
const VENUE_PRIORITY: readonly VenueType[] = ["fine", "food-truck", "fast-food", "casual"];

/**
 * Infer the dining-format bucket for a Google Place. Optional `priceLevel`
 * is the Place's `price_level` (0-4 enum from Google) when known — used
 * as a tie-breaker only when no explicit format tag matches, to nudge
 * obviously-upscale spots (price tier $$$+) toward `fine` even when
 * Google didn't tag them with `fine_dining_restaurant` explicitly.
 *
 * Explicit format tags always win — `priceLevel` cannot demote a fine-
 * dining-tagged place to casual, only promote an unspecified one. This
 * keeps the function monotonic with respect to Google's authoritative
 * signals; it only intervenes in the genuinely-ambiguous default case.
 */
export function inferVenueType(
  types: readonly string[],
  priceLevel?: number | null,
): VenueType {
  const set = new Set(types);
  for (const venue of VENUE_PRIORITY) {
    if (TYPES_BY_VENUE[venue].some((t) => set.has(t))) {
      // The default-bucket case ("matched only `restaurant` or
      // `casual_dining_restaurant`") is the only one where price_level
      // gets to override — a place tagged `restaurant` with no other
      // signal AND price_level >= 3 is almost certainly upscale enough
      // to belong in `fine` rather than the generic casual bucket.
      if (venue === "casual" && typeof priceLevel === "number" && priceLevel >= 3) {
        return "fine";
      }
      return venue;
    }
  }
  // No format tag matched at all (rare — Google almost always returns at
  // least `restaurant`). Fall back to the price-tier heuristic, then to
  // `casual` as a final safety net.
  if (typeof priceLevel === "number" && priceLevel >= 3) return "fine";
  return "casual";
}
