/**
 * Single-cuisine-per-rating taxonomy used for SEO slicing
 * ("best [cuisine] in [city]"). Multi-cuisine is more complexity than the
 * v1 query patterns need; if data later shows a meaningful share of
 * places that genuinely span two cuisines (e.g. Korean-Mexican fusion
 * that should appear in both `mexican` and `korean` posts), revisit as
 * `text[]` on the row.
 *
 * Add new entries here when DFW data demands them — keep the list small
 * and stable so SEO URL slugs (`/city/carrollton/value-mexican`) don't
 * churn.
 */
export const CUISINES = [
  "mexican",
  "tex-mex",
  "italian",
  "chinese",
  "japanese",
  "korean",
  "thai",
  "vietnamese",
  "indian",
  "american",
  "bbq",
  "pizza",
  "burger",
  "sushi",
  "seafood",
  "mediterranean",
  "breakfast",
  "cafe",
  "bar",
  "dessert",
  "other",
] as const;

export type Cuisine = (typeof CUISINES)[number];

/**
 * Priority list — first matching entry wins. Specific cuisines come
 * before generic ones because Google often returns the more generic type
 * (e.g. `american_restaurant`, `restaurant`) alongside a specific one,
 * and we want the specific bucket. Tex-Mex sits above mexican because a
 * taco/burrito-tagged place in TX is almost always tex-mex; same call as
 * inferVenueType's priority discipline in `venueType.ts`.
 */
const TYPE_TO_CUISINE: ReadonlyArray<{
  readonly types: readonly string[];
  readonly cuisine: Cuisine;
}> = [
  { types: ["taco_restaurant", "burrito_restaurant"], cuisine: "tex-mex" },
  { types: ["barbecue_restaurant"], cuisine: "bbq" },
  { types: ["mexican_restaurant"], cuisine: "mexican" },
  { types: ["italian_restaurant"], cuisine: "italian" },
  { types: ["chinese_restaurant"], cuisine: "chinese" },
  { types: ["sushi_restaurant"], cuisine: "sushi" },
  { types: ["ramen_restaurant", "japanese_restaurant"], cuisine: "japanese" },
  { types: ["korean_restaurant"], cuisine: "korean" },
  { types: ["thai_restaurant"], cuisine: "thai" },
  { types: ["vietnamese_restaurant"], cuisine: "vietnamese" },
  { types: ["indian_restaurant"], cuisine: "indian" },
  {
    types: [
      "mediterranean_restaurant",
      "greek_restaurant",
      "middle_eastern_restaurant",
      "lebanese_restaurant",
      "turkish_restaurant",
    ],
    cuisine: "mediterranean",
  },
  { types: ["seafood_restaurant"], cuisine: "seafood" },
  { types: ["pizza_restaurant"], cuisine: "pizza" },
  { types: ["hamburger_restaurant"], cuisine: "burger" },
  { types: ["breakfast_restaurant", "brunch_restaurant"], cuisine: "breakfast" },
  { types: ["bakery", "donut_shop", "ice_cream_shop"], cuisine: "dessert" },
  { types: ["coffee_shop", "cafe"], cuisine: "cafe" },
  { types: ["bar", "pub", "wine_bar", "brewery"], cuisine: "bar" },
  {
    types: [
      "american_restaurant",
      "steak_house",
      "fast_food_restaurant",
      "sandwich_shop",
      "chicken_restaurant",
      "fried_chicken_restaurant",
    ],
    cuisine: "american",
  },
];

/**
 * Resolve a single normalized cuisine from a Google Place's `types[]`
 * array. Returns `"other"` when nothing matches — better than null
 * because every SEO slice and every UI render can rely on having a
 * value, even if it's the catch-all.
 */
export function googleTypesToCuisine(
  types: readonly string[] | undefined | null,
): Cuisine {
  if (!types || types.length === 0) return "other";
  const set = new Set(types);
  for (const entry of TYPE_TO_CUISINE) {
    if (entry.types.some((t) => set.has(t))) return entry.cuisine;
  }
  return "other";
}
