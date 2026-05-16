import type { VenueType } from "@/lib/ratings/scoring";

/**
 * Google Places `types[]` that *legitimately* signal a venue's dining
 * format. There are two flavors of food-kind Google tag and only one is
 * format-ambiguous:
 *
 *   - Format-ambiguous (excluded from venue_type entirely, captured as
 *     cuisine instead in `lib/places/cuisine.ts`):
 *     `pizza_restaurant`, `taco_restaurant`, `burrito_restaurant`,
 *     `hamburger_restaurant`, `chicken_restaurant`, `sandwich_shop`.
 *     These genuinely span all four venue_types — sit-down Italian
 *     pizza joints, casual taquerías, craft burger pubs, fast-casual
 *     chicken spots. The earlier classifier mis-tagged all of them as
 *     fast-food because that's where these tags lived.
 *
 *   - Format-correlated (included in `fast-food` because the tag
 *     reliably implies counter-service / grab-and-go regardless of
 *     specific food kind): `donut_shop`, `bagel_shop`, `ice_cream_shop`,
 *     `coffee_shop`, `cafe`, `bakery`. Sit-down patisseries / ice cream
 *     parlors / coffee houses exist but are the minority; the dominant
 *     experience is counter-order + quick transaction, which matches the
 *     fast-food rating-criteria calibration. User override on /rate
 *     catches the sit-down exceptions.
 *
 * Each bucket therefore lists genuinely format-revealing tags only —
 * either explicit format tags (`fast_food_restaurant`) or food-kind
 * tags whose format is reliably correlated. Anything not matching falls
 * through to `casual`, the right default for "a restaurant we have no
 * specific format signal about."
 */
const TYPES_BY_VENUE: Record<VenueType, readonly string[]> = {
  "fast-food": [
    "fast_food_restaurant",
    "donut_shop",
    "bagel_shop",
    "ice_cream_shop",
    "coffee_shop",
    "cafe",
    "bakery",
  ],
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
