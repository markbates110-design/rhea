import type { GeoCoords } from "@/lib/places/geolocation";
import { haversineMiles } from "@/lib/places/distance";

export interface RatedPlaceRow {
  place_id: string;
  venue_name: string;
  venue_address: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  weighted_score: number;
  meal_photo_url: string | null;
  created_at: string;
}

export interface FollowedRatedPlaceRow extends RatedPlaceRow {
  user_id: string;
}

export interface NearbyRatedPlace {
  placeId: string;
  venueName: string;
  venueAddress: string;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string;
  photoUrls: string[];
  ratingCount: number;
  avgScore: number;
  distanceMiles: number | null;
  /** Set when aggregating ratings from people the viewer follows. */
  followedRaterCount?: number;
  followedRaterUsername?: string | null;
}

const DEFAULT_MAX_MILES = 50;

function normalizePlaceKey(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function coordsFromRow(row: RatedPlaceRow): GeoCoords | null {
  if (
    typeof row.latitude === "number" &&
    typeof row.longitude === "number" &&
    Number.isFinite(row.latitude) &&
    Number.isFinite(row.longitude)
  ) {
    return { latitude: row.latitude, longitude: row.longitude };
  }
  return null;
}

function pickPlaceCoords(group: RatedPlaceRow[]): GeoCoords | null {
  const sorted = [...group].sort(
    (a, b) =>
      b.weighted_score - a.weighted_score ||
      Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  for (const row of sorted) {
    const coords = coordsFromRow(row);
    if (coords) return coords;
  }
  return null;
}

function buildNearbyPlaceFromGroup(
  placeId: string,
  group: RatedPlaceRow[],
  extras?: Pick<NearbyRatedPlace, "followedRaterCount">,
): NearbyRatedPlace {
  const sorted = [...group].sort(
    (a, b) =>
      b.weighted_score - a.weighted_score ||
      Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const lead = sorted[0];
  const coords = pickPlaceCoords(sorted);
  const photoUrls = sorted
    .map((row) => row.meal_photo_url)
    .filter((url): url is string => Boolean(url?.trim()));
  const avgScore =
    sorted.reduce((sum, row) => sum + row.weighted_score, 0) / sorted.length;

  return {
    placeId,
    venueName: lead.venue_name,
    venueAddress: lead.venue_address,
    city: lead.city,
    state: lead.state,
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    photoUrl: photoUrls[0],
    photoUrls,
    ratingCount: sorted.length,
    avgScore,
    distanceMiles: null,
    followedRaterCount: extras?.followedRaterCount,
    followedRaterUsername: null,
  };
}

/**
 * Group followee ratings by place. Tracks how many people you follow
 * rated each spot (distinct user_ids in the group).
 */
export function aggregateFollowedRatedPlaces(
  rows: FollowedRatedPlaceRow[],
): Array<NearbyRatedPlace & { leadRaterUserId: string | null }> {
  const byPlace = new Map<string, FollowedRatedPlaceRow[]>();

  for (const row of rows) {
    if (!row.place_id?.trim() || !row.meal_photo_url?.trim() || !row.user_id) {
      continue;
    }
    const bucket = byPlace.get(row.place_id) ?? [];
    bucket.push(row);
    byPlace.set(row.place_id, bucket);
  }

  const places: Array<NearbyRatedPlace & { leadRaterUserId: string | null }> =
    [];

  for (const [placeId, group] of byPlace) {
    const sorted = [...group].sort(
      (a, b) =>
        b.weighted_score - a.weighted_score ||
        Date.parse(b.created_at) - Date.parse(a.created_at),
    );
    const followedRaterCount = new Set(sorted.map((row) => row.user_id)).size;
    const leadRaterUserId = sorted[0]?.user_id ?? null;

    places.push({
      ...buildNearbyPlaceFromGroup(placeId, sorted, { followedRaterCount }),
      leadRaterUserId,
    });
  }

  return places.sort(
    (a, b) =>
      (b.followedRaterCount ?? 0) - (a.followedRaterCount ?? 0) ||
      b.avgScore - a.avgScore ||
      (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity) ||
      a.venueName.localeCompare(b.venueName),
  );
}

export function aggregateRatedPlaces(rows: RatedPlaceRow[]): NearbyRatedPlace[] {
  const byPlace = new Map<string, RatedPlaceRow[]>();

  for (const row of rows) {
    if (!row.place_id?.trim() || !row.meal_photo_url?.trim()) continue;
    const bucket = byPlace.get(row.place_id) ?? [];
    bucket.push(row);
    byPlace.set(row.place_id, bucket);
  }

  const places: NearbyRatedPlace[] = [];

  for (const [placeId, group] of byPlace) {
    places.push(buildNearbyPlaceFromGroup(placeId, group));
  }

  return places.sort(
    (a, b) =>
      b.ratingCount - a.ratingCount ||
      b.avgScore - a.avgScore ||
      a.venueName.localeCompare(b.venueName),
  );
}

function filterPlacesByCityState(
  places: NearbyRatedPlace[],
  viewer: { city: string | null; state: string | null },
): NearbyRatedPlace[] {
  const viewerCity = normalizePlaceKey(viewer.city);
  const viewerState = normalizePlaceKey(viewer.state);

  if (viewerCity) {
    const cityMatches = places.filter(
      (place) => normalizePlaceKey(place.city) === viewerCity,
    );
    if (cityMatches.length > 0) return cityMatches;
  }

  if (viewerState) {
    const stateMatches = places.filter(
      (place) => normalizePlaceKey(place.state) === viewerState,
    );
    if (stateMatches.length > 0) return stateMatches;
  }

  return places;
}

/**
 * Sort and filter community-rated places relative to the viewer. Uses
 * haversine distance when coords exist; falls back to city/state match
 * for legacy rows without lat/lng.
 */
export function sortPlacesNearViewer(
  places: NearbyRatedPlace[],
  viewerCoords: GeoCoords | null,
  viewerLocation: { city: string | null; state: string | null } | null,
  maxMiles = DEFAULT_MAX_MILES,
): NearbyRatedPlace[] {
  if (viewerCoords) {
    const withDistance = places
      .filter((place) => place.latitude != null && place.longitude != null)
      .map((place) => ({
        ...place,
        distanceMiles: haversineMiles(viewerCoords, {
          latitude: place.latitude!,
          longitude: place.longitude!,
        }),
      }))
      .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));

    const withinRadius = withDistance.filter(
      (place) => (place.distanceMiles ?? Infinity) <= maxMiles,
    );
    if (withinRadius.length > 0) return withinRadius;

    if (withDistance.length > 0) return withDistance;
  }

  if (viewerLocation) {
    return filterPlacesByCityState(places, viewerLocation);
  }

  return places;
}
