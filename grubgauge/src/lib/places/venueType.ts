import type { VenueType } from "@/lib/ratings/scoring";

/**
 * Google Places `types[]` that *legitimately* signal a venue's dining
 * format on their own. There are two flavors of food-kind Google tag
 * and they sort differently:
 *
 *   - Format-ambiguous (live in `FAST_FOOD_CUISINE_TAGS` below, used
 *     ONLY as a composite-tie-breaker signal alongside price_level —
 *     never as a sole format indicator):
 *     `pizza_restaurant`, `taco_restaurant`, `burrito_restaurant`,
 *     `hamburger_restaurant`, `chicken_restaurant`, `fried_chicken_restaurant`,
 *     `sandwich_shop`. These genuinely span all four venue_types —
 *     sit-down Italian pizza joints AND Domino's both get pizza_restaurant.
 *     The classifier uses these tags together with `price_level <= 1`
 *     (and absence of `casual_dining_restaurant`) to catch national fast-
 *     food chains that Google inconsistently fails to tag with the
 *     explicit `fast_food_restaurant` signal (Whataburger, McDonald's,
 *     Sonic, Taco Bell, Subway, etc.).
 *
 *   - Format-correlated (included in `fast-food` below because the tag
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
 * specific format signal about" — unless price_level + a fast-food
 * cuisine tag composite kicks in (chains) or price_level promotes to
 * fine (upscale unspecified).
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
 * Cuisine-shaped tags that — combined with `price_level <= 1` and
 * absence of `casual_dining_restaurant` — reliably indicate a fast-food
 * chain. Used by the composite tie-breaker below.
 *
 * Don't add tags like `mexican_restaurant` / `italian_restaurant` / etc.
 * here — those are higher-tier cuisine markers that frequently apply to
 * sit-down casual restaurants at price_level 1 (mom-and-pop spots,
 * family-owned places). The tags listed here all describe a *specific
 * food shape* (a single dish category) that's overwhelmingly served via
 * counter / drive-through at price_level 1.
 */
const FAST_FOOD_CUISINE_TAGS: readonly string[] = [
  "hamburger_restaurant",
  "sandwich_shop",
  "taco_restaurant",
  "burrito_restaurant",
  "chicken_restaurant",
  "fried_chicken_restaurant",
  "pizza_restaurant",
];

/**
 * Infer the dining-format bucket for a Google Place. Optional `priceLevel`
 * is the Place's `price_level` (0-4 enum from Google) when known — used
 * as a tie-breaker via two composite rules:
 *
 *   1. Cheap + fast-food-shaped cuisine + no casual signal → fast-food.
 *      Catches national fast-food chains (Whataburger, McDonald's, Sonic,
 *      Taco Bell, Subway, Little Caesars, KFC, etc.) that Google tags
 *      with only a cuisine-shaped tag (`hamburger_restaurant`, etc.) plus
 *      generic `restaurant` and `price_level=1`, omitting the explicit
 *      `fast_food_restaurant` tag we'd otherwise rely on.
 *   2. Upscale + no fine signal → fine. Promotes obviously-upscale spots
 *      (price tier $$$+) toward `fine` when Google didn't tag them
 *      `fine_dining_restaurant` explicitly.
 *
 * Explicit format tags always win — `priceLevel` cannot demote a fine-
 * dining-tagged place to casual or a casual-dining-tagged place to fast-
 * food, only promote an unspecified one in either direction. This keeps
 * the function monotonic with respect to Google's authoritative signals;
 * composites only intervene in the genuinely-ambiguous default case.
 *
 * The /rate page exposes a user override that supersedes this entire
 * function for the rare edge cases the heuristics miss — a sit-down
 * family taquería at price_level=1 with only `taco_restaurant` tag would
 * be misclassified here as fast-food, and that's the right place to fix
 * it (manual override on a per-rating basis is cheaper than maintaining
 * a list of casual-but-cheap exceptions in the classifier).
 */
export function inferVenueType(
  types: readonly string[],
  priceLevel?: number | null,
): VenueType {
  const set = new Set(types);

  // 1. Explicit fine. Highest signal.
  if (set.has("fine_dining_restaurant")) return "fine";

  // 2. Explicit food-truck. Mutually exclusive with the others.
  if (TYPES_BY_VENUE["food-truck"].some((t) => set.has(t))) return "food-truck";

  // 3. Explicit fast-food OR format-correlated cluster (donut shops etc.).
  if (TYPES_BY_VENUE["fast-food"].some((t) => set.has(t))) return "fast-food";

  // 4. Explicit casual. We check this *before* the composite fast-food rule
  //    so Google's explicit casual signal always wins — a casual_dining
  //    restaurant at price_level=1 stays casual, never demotes to fast-food.
  const hasExplicitCasual = set.has("casual_dining_restaurant");
  if (hasExplicitCasual) return "casual";

  // 5. Composite fast-food: no casual signal + cheap + fast-food-shaped
  //    cuisine tag → fast-food. Catches the common chain misclassification
  //    (Whataburger, McDonald's, etc.) that Google undertags.
  if (
    typeof priceLevel === "number" &&
    priceLevel <= 1 &&
    FAST_FOOD_CUISINE_TAGS.some((t) => set.has(t))
  ) {
    return "fast-food";
  }

  // 6. Composite fine: high price tier with no explicit fine tag.
  if (typeof priceLevel === "number" && priceLevel >= 3) return "fine";

  // 7. Default: casual. Covers the generic-`restaurant`-tagged places at
  //    price_level 2 (the bulk of typical sit-down restaurants) and the
  //    rare no-format-tag-at-all case.
  return "casual";
}
