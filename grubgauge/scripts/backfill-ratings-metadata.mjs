/**
 * One-shot backfill: populate cuisine / city / neighborhood / state /
 * postal_code / price_level on existing rows in public.ratings by
 * re-querying Google Place Details for each unique place_id.
 *
 * Usage:
 *   1. Apply the migration `20260515220000_ratings_cuisine_location_price.sql`
 *      first (it adds the columns; this script populates them).
 *   2. Set env vars (export, .env, or inline):
 *        NEXT_PUBLIC_SUPABASE_URL          (already set if `npm run dev` works)
 *        SUPABASE_SERVICE_ROLE_KEY         (Supabase Dashboard → Settings →
 *                                            API → service_role secret)
 *        GOOGLE_PLACES_API_KEY             (a key with the "Places API" web
 *                                            service enabled; the existing
 *                                            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *                                            may work if it isn't HTTP-referrer
 *                                            restricted — check GCP console)
 *   3. Run from the grubgauge/ directory:
 *        node scripts/backfill-ratings-metadata.mjs
 *      Add `--dry-run` to log what would be updated without writing.
 *      Add `--reinfer-cuisine` to re-fetch Google types and refresh cuisine
 *      on every row (fixes mis-inferred snack tags like dessert on diners).
 *
 * Cost: Place Details Basic Data + Atmosphere Data per unique place_id,
 * roughly $22 per 1,000 unique places. At MVP scale this is well under
 * $1; for larger backfills, batch or rate-limit as desired.
 *
 * Idempotent: only touches rows where `cuisine is null`. Re-running picks
 * up new unpopulated rows without re-querying already-backfilled ones.
 *
 * Source of truth for the helper logic is `src/lib/places/cuisine.ts` and
 * `src/lib/places/address.ts`. We intentionally duplicate the small
 * mapping functions here (rather than import the .ts files) so the script
 * runs as plain Node without a build step or `tsx` dev dependency. Keep
 * the two pairs in sync — see "DUPLICATED HELPERS" block below.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const DRY_RUN = process.argv.includes("--dry-run");
const REINFER_CUISINE = process.argv.includes("--reinfer-cuisine");

function assertEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!GOOGLE_PLACES_API_KEY) missing.push("GOOGLE_PLACES_API_KEY");
  if (missing.length) {
    console.error("Missing env vars:", missing.join(", "));
    process.exit(1);
  }
}

// ── DUPLICATED HELPERS (keep in sync with src/lib/places/*) ──────────────

const TYPE_TO_CUISINE = [
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
  { types: ["bakery", "donut_shop", "ice_cream_shop"], cuisine: "dessert" },
  { types: ["coffee_shop", "cafe"], cuisine: "cafe" },
  { types: ["bar", "pub", "wine_bar", "brewery"], cuisine: "bar" },
];

function googleTypesToCuisine(types) {
  if (!types || types.length === 0) return "other";
  const set = new Set(types);
  for (const entry of TYPE_TO_CUISINE) {
    if (entry.types.some((t) => set.has(t))) return entry.cuisine;
  }
  return "other";
}

function extractAddressComponents(components) {
  const out = { city: null, neighborhood: null, state: null, postal_code: null };
  if (!components || components.length === 0) return out;
  for (const c of components) {
    const types = c.types ?? [];
    if (out.city === null && types.includes("locality")) out.city = c.long_name ?? null;
    if (out.neighborhood === null && types.includes("neighborhood")) {
      out.neighborhood = c.long_name ?? null;
    }
    if (out.state === null && types.includes("administrative_area_level_1")) {
      out.state = c.short_name ?? null;
    }
    if (out.postal_code === null && types.includes("postal_code")) {
      out.postal_code = c.long_name ?? null;
    }
  }
  if (out.neighborhood === null) {
    for (const c of components) {
      const types = c.types ?? [];
      if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
        out.neighborhood = c.long_name ?? null;
        break;
      }
    }
  }
  return out;
}

// ── Place Details fetch ──────────────────────────────────────────────────

async function fetchPlaceDetails(placeId) {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "place_id,name,formatted_address,types,address_components,price_level",
    key: GOOGLE_PLACES_API_KEY,
  });
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Place Details HTTP ${res.status} for ${placeId}`);
  }
  const json = await res.json();
  if (json.status !== "OK") {
    throw new Error(`Place Details ${json.status} for ${placeId}: ${json.error_message ?? ""}`);
  }
  return json.result;
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  assertEnv();
  const modeLabel = REINFER_CUISINE ? "reinfer-cuisine" : "null-cuisine";
  console.log(
    `Backfill starting (${modeLabel})${DRY_RUN ? " (dry-run)" : ""}.`,
  );

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from("ratings")
    .select("id, place_id, cuisine")
    .not("place_id", "is", null);
  if (!REINFER_CUISINE) {
    query = query.is("cuisine", null);
  }
  const { data: rows, error: readErr } = await query;
  if (readErr) {
    console.error("Read error:", readErr);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log(
      REINFER_CUISINE
        ? "Nothing to reinfer — no ratings with place_id."
        : "Nothing to backfill — all rows already have cuisine set.",
    );
    return;
  }

  // Group rating ids by place_id so we hit Google once per unique place.
  const byPlace = new Map();
  for (const r of rows) {
    if (!byPlace.has(r.place_id)) byPlace.set(r.place_id, []);
    byPlace.get(r.place_id).push(r.id);
  }
  console.log(`Rows to update: ${rows.length} across ${byPlace.size} unique places.`);

  let processed = 0;
  let failed = 0;
  for (const [placeId, ratingIds] of byPlace) {
    try {
      const place = await fetchPlaceDetails(placeId);
      const address = extractAddressComponents(place.address_components);
      const cuisine = googleTypesToCuisine(place.types);
      const rawPriceLevel = place.price_level;
      const price_level =
        typeof rawPriceLevel === "number" && rawPriceLevel >= 0 && rawPriceLevel <= 4
          ? rawPriceLevel
          : null;

      const patch = {
        cuisine,
        city: address.city,
        neighborhood: address.neighborhood,
        state: address.state,
        postal_code: address.postal_code,
        price_level,
      };

      if (DRY_RUN) {
        const prev = rows
          .filter((r) => r.place_id === placeId)
          .map((r) => r.cuisine)
          .filter((v, i, a) => a.indexOf(v) === i);
        console.log(
          `  [dry-run] ${placeId} (${ratingIds.length} row${ratingIds.length === 1 ? "" : "s"}) was [${prev.join(", ")}] → ${JSON.stringify(patch)}`,
        );
      } else {
        const { error: updErr } = await supabase
          .from("ratings")
          .update(patch)
          .in("id", ratingIds);
        if (updErr) throw updErr;
      }
      processed += ratingIds.length;
    } catch (err) {
      failed += ratingIds.length;
      console.error(`  failed ${placeId}: ${err instanceof Error ? err.message : err}`);
    }
    // Be polite to Google's rate limit. 100ms between calls = max 10/sec.
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`Done. Updated ${processed}, failed ${failed}.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
