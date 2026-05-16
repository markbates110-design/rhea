import type { Cuisine } from "./cuisine";

/**
 * One curated spot rendered in the dashboard's FeaturedSpotsRow. The
 * row replaced the previous Google-Discovery-backed NearbyVenuesRow,
 * which was deleted to eliminate ongoing Google Places Nearby + Photos
 * API spend. Featured spots are hand-curated by the operator (you),
 * with photos shot personally and committed to `public/featured/`.
 *
 * `placeId` must be a real Google Place ID so taps deep-link to
 * `/rate?placeId=...` and `/rate`'s SpotSearch auto-selects the venue,
 * pre-filling all the metadata (name, address, types, address_components,
 * price_level) the existing rate flow needs. Look it up once via the
 * Google Maps URL share dialog or via Place Autocomplete on /rate.
 *
 * `photoSrc` is a public-folder path served by Next.js as a static CDN
 * asset — no bucket, no upload pipeline, no per-load API call.
 */
export interface FeaturedSpot {
  /** Google Place ID — the same value /rate's SpotSearch will receive
   *  via `?placeId=` and feed to PlacesService.getDetails. */
  placeId: string;
  /** Display name. Should match Google's `name` for the place so the
   *  /rate auto-select doesn't show a mismatch when it loads details. */
  name: string;
  /** Human-readable address line (city/neighborhood context). Not used
   *  by /rate's auto-select (Place Details overrides it). */
  address: string;
  /** Normalized cuisine for the card chip. */
  cuisine: Cuisine;
  /** Path under `public/` — e.g. `/featured/whataburger-bowie.jpg`. */
  photoSrc: string;
  /** Optional one-line editorial blurb shown on the card. */
  blurb?: string;
  /** City for filtering / regional rotation later. */
  city: string;
}

/**
 * Live curated list. Seed with real spots from your DFW footprint
 * (hometown + Carrollton + Mansfield + Lower Greenville) once photos
 * are shot and uploaded to `public/featured/`. Keep this list small
 * (15-25 entries) and rotate seasonally so the row stays fresh
 * without becoming maintenance-heavy.
 *
 * Empty array → `FeaturedSpotsRow` renders nothing (component
 * self-hides). Safe to ship empty while you accumulate photos.
 */
export const FEATURED_SPOTS: ReadonlyArray<FeaturedSpot> = [];
