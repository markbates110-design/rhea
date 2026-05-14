import type { VenueType } from "@/lib/ratings/scoring";
import type { Coords } from "@/lib/places/geolocation";
import { loadGoogleMaps } from "@/lib/places/maps";
import { inferVenueType } from "@/lib/places/venueType";

const RESULTS_KEY_PREFIX = "gg.nearby.results.";
const RESULTS_TTL_MS = 30 * 60 * 1000;
const PHOTO_MAX_WIDTH = 300;

// Radius ladder (m): 1mi → 3mi → 10mi. We climb when a tighter radius
// returns zero results so users in low-density areas still get a row.
const RADIUS_LADDER_M: readonly number[] = [1600, 4800, 16000];

export interface NearbyVenue {
  placeId: string;
  name: string;
  cuisineType: VenueType;
  /**
   * Google Place Photo URL (already includes API key + maxwidth=300).
   * Null when the venue has no photo — caller renders the swatch
   * fallback. Each photo URL the browser actually fetches is a separate
   * Google billable event (Place Details Photos SKU); render with
   * `loading="lazy"` so off-screen carousel cards don't pre-spend it.
   */
  photoUrl: string | null;
  distanceMeters: number;
  /** Google's user rating, 0–5, when known. */
  googleRating: number | null;
  googleRatingCount: number | null;
}

/**
 * 3-decimal-place lat/lng grid (~100m buckets) used as the cache key.
 * Same neighbourhood across multiple page loads (and even across
 * different users at MVP scale) hits the same key, sparing the Nearby
 * Search budget.
 */
function gridKey(coords: Coords): string {
  return `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}`;
}

interface CachedResults {
  venues: NearbyVenue[];
  ts: number;
}

export function readCachedNearbyVenues(coords: Coords): NearbyVenue[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RESULTS_KEY_PREFIX + gridKey(coords));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedResults;
    if (!parsed || !Array.isArray(parsed.venues) || typeof parsed.ts !== "number") {
      return null;
    }
    if (Date.now() - parsed.ts > RESULTS_TTL_MS) return null;
    return parsed.venues;
  } catch {
    return null;
  }
}

function writeCachedNearbyVenues(coords: Coords, venues: NearbyVenue[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      RESULTS_KEY_PREFIX + gridKey(coords),
      JSON.stringify({ venues, ts: Date.now() } satisfies CachedResults),
    );
  } catch {
    // Quota — silently degrade. Worst case: extra Nearby Search call on
    // the next mount.
  }
}

/** Haversine distance in metres. Self-contained so we don't need the geometry library. */
function haversineMeters(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface GetNearbyOptions {
  /** Max number of venues to return after sorting by distance. Defaults to 8. */
  limit?: number;
  /** Internal — radius ladder index for recursive expansion on zero results. */
  ladderIndex?: number;
}

/**
 * Calls Google Places Nearby Search at the given coords for restaurants.
 * Walks a radius ladder (1mi → 3mi → 10mi) when a tighter search returns
 * zero results so users in low-density areas still get a row.
 *
 * Caches in sessionStorage by 3-decimal lat/lng grid for 30 min. Cache
 * hit avoids the Nearby Search call entirely; cache miss costs one
 * Nearby Search call (Pro SKU, $32 / 1000, 5000 free / month).
 *
 * Photo URLs are resolved at maxwidth=300 (sufficient for the 152px
 * card at 2× DPR). Each photo URL the browser actually fetches is a
 * separate billable Place Details Photos event ($7 / 1000, 1000 free /
 * month) — the carousel uses `loading="lazy"` to keep this proportional
 * to what the user actually sees on screen.
 */
export async function getNearbyVenues(
  coords: Coords,
  options: GetNearbyOptions = {},
): Promise<NearbyVenue[]> {
  await loadGoogleMaps();

  // Cache check only on the top-level call (ladderIndex == 0 / undefined),
  // not on recursive radius-expansion calls — recursion shares no cache
  // entry until we've decided which ladder rung wins.
  const ladderIndex = options.ladderIndex ?? 0;
  if (ladderIndex === 0) {
    const cached = readCachedNearbyVenues(coords);
    if (cached !== null) return cached.slice(0, options.limit ?? cached.length);
  }

  const limit = options.limit ?? 8;
  const radius = RADIUS_LADDER_M[ladderIndex] ?? RADIUS_LADDER_M[0];

  // PlacesService needs a DOM node; a throwaway detached div works
  // (nothing renders into it).
  const div = document.createElement("div");
  const service = new google.maps.places.PlacesService(div);

  const results = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
    service.nearbySearch(
      {
        location: { lat: coords.lat, lng: coords.lng },
        radius,
        type: "restaurant",
      },
      (data, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && data) {
          resolve(data);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`places-status:${status}`));
        }
      },
    );
  });

  // Empty result → climb the ladder before giving up.
  if (results.length === 0 && ladderIndex < RADIUS_LADDER_M.length - 1) {
    return getNearbyVenues(coords, { ...options, ladderIndex: ladderIndex + 1 });
  }

  const venues: NearbyVenue[] = results
    .filter(
      (
        p,
      ): p is google.maps.places.PlaceResult & {
        place_id: string;
        geometry: google.maps.places.PlaceGeometry;
      } => Boolean(p.place_id && p.geometry?.location),
    )
    .map((p) => {
      const loc = p.geometry.location!;
      const lat = typeof loc.lat === "function" ? loc.lat() : (loc as unknown as { lat: number }).lat;
      const lng = typeof loc.lng === "function" ? loc.lng() : (loc as unknown as { lng: number }).lng;
      const photoUrl = p.photos?.[0]?.getUrl({ maxWidth: PHOTO_MAX_WIDTH }) ?? null;
      return {
        placeId: p.place_id,
        name: p.name ?? "Unknown",
        cuisineType: inferVenueType(p.types ?? []),
        photoUrl,
        distanceMeters: haversineMeters(coords, { lat, lng }),
        googleRating: typeof p.rating === "number" ? p.rating : null,
        googleRatingCount: typeof p.user_ratings_total === "number" ? p.user_ratings_total : null,
      } satisfies NearbyVenue;
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, limit);

  writeCachedNearbyVenues(coords, venues);
  return venues;
}
