import type { VenueType } from "@/lib/ratings/scoring";

/**
 * Google Places `types[]` strings grouped by our `VenueType` bucket.
 *
 * Inference uses priority order (fast-food > food-truck > fine > casual)
 * because Google sometimes returns the generic `restaurant` type *before*
 * `fast_food_restaurant` — a first-match scan would mis-classify chains
 * like McDonald's as Casual Dining. Priority match guarantees the most
 * specific bucket wins.
 *
 * Single source of truth for the Google → GrubGauge venue-type mapping;
 * imported by `/rate`'s SpotSearch (autocomplete picks) and by the
 * dashboard `NearbyVenuesRow` (Nearby Search results) so both surfaces
 * agree on what a given Google place "is."
 */
const TYPES_BY_VENUE: Record<VenueType, readonly string[]> = {
  "fast-food": [
    "fast_food_restaurant",
    "hamburger_restaurant",
    "sandwich_shop",
    "pizza_restaurant",
    "meal_takeaway",
    "meal_delivery",
    "donut_shop",
    "bagel_shop",
    "ice_cream_shop",
    "coffee_shop",
    "cafe",
    "chicken_restaurant",
    "fried_chicken_restaurant",
    "taco_restaurant",
    "burrito_restaurant",
  ],
  "food-truck": ["food_truck", "food_stall", "street_food"],
  fine: ["fine_dining_restaurant"],
  casual: [
    "casual_dining_restaurant",
    "restaurant",
    "american_restaurant",
    "italian_restaurant",
    "mexican_restaurant",
    "chinese_restaurant",
    "japanese_restaurant",
    "thai_restaurant",
    "indian_restaurant",
    "korean_restaurant",
    "vietnamese_restaurant",
    "french_restaurant",
    "mediterranean_restaurant",
    "greek_restaurant",
    "spanish_restaurant",
    "middle_eastern_restaurant",
    "steak_house",
    "seafood_restaurant",
    "vegetarian_restaurant",
    "vegan_restaurant",
    "barbecue_restaurant",
    "ramen_restaurant",
    "sushi_restaurant",
    "bar",
    "pub",
    "wine_bar",
    "brewery",
  ],
};

const VENUE_PRIORITY: readonly VenueType[] = ["fast-food", "food-truck", "fine", "casual"];

export function inferVenueType(types: readonly string[]): VenueType {
  const set = new Set(types);
  for (const venue of VENUE_PRIORITY) {
    if (TYPES_BY_VENUE[venue].some((t) => set.has(t))) return venue;
  }
  return "casual";
}
