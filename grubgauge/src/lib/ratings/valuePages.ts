import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cuisine } from "@/lib/places/cuisine";
import { CUISINES } from "@/lib/places/cuisine";
import { cityToSlug } from "@/lib/seo/slugs";

export interface ValuePageRatingRow {
  place_id: string;
  venue_name: string;
  venue_address: string;
  city: string | null;
  cuisine: string | null;
  weighted_score: number;
  meal_photo_url: string | null;
  price_level: number | null;
}

export interface ValuePageSpot {
  placeId: string;
  venueName: string;
  venueAddress: string;
  weightedScore: number;
  ratingCount: number;
  mealPhotoUrl: string | null;
  priceLevel: number | null;
}

export interface CityIndexEntry {
  city: string;
  citySlug: string;
  ratingCount: number;
  placeCount: number;
}

export interface CityCuisineLink {
  cuisine: Cuisine;
  cuisineSegment: string;
  label: string;
  placeCount: number;
}

const VALUE_PAGE_SELECT =
  "place_id, venue_name, venue_address, city, cuisine, weighted_score, meal_photo_url, price_level";

export async function fetchValuePageRatings(
  supabase: SupabaseClient,
): Promise<ValuePageRatingRow[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select(VALUE_PAGE_SELECT)
    .not("city", "is", null)
    .not("place_id", "is", null);
  if (error || !data) return [];
  return data as ValuePageRatingRow[];
}

export function buildCitySlugMap(
  rows: ValuePageRatingRow[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row.city?.trim()) continue;
    const city = row.city.trim();
    map.set(cityToSlug(city), city);
  }
  return map;
}

export function resolveCityFromSlug(
  citySlug: string,
  slugMap: Map<string, string>,
): string | null {
  return slugMap.get(citySlug.trim().toLowerCase()) ?? null;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function rowsForCity(rows: ValuePageRatingRow[], city: string): ValuePageRatingRow[] {
  const key = normalizeKey(city);
  return rows.filter((row) => normalizeKey(row.city ?? "") === key);
}

export function rankSpotsFromRows(
  rows: ValuePageRatingRow[],
  options?: { cuisine?: Cuisine; maxPriceLevel?: number },
): ValuePageSpot[] {
  let filtered = rows;
  if (options?.cuisine) {
    filtered = filtered.filter(
      (row) => normalizeKey(row.cuisine ?? "") === options.cuisine,
    );
  }
  if (typeof options?.maxPriceLevel === "number") {
    filtered = filtered.filter(
      (row) =>
        row.price_level === null ||
        row.price_level <= options.maxPriceLevel!,
    );
  }

  const byPlace = new Map<string, ValuePageRatingRow[]>();
  for (const row of filtered) {
    if (!row.place_id?.trim()) continue;
    const bucket = byPlace.get(row.place_id) ?? [];
    bucket.push(row);
    byPlace.set(row.place_id, bucket);
  }

  const spots: ValuePageSpot[] = [];
  for (const [placeId, group] of byPlace) {
    const sorted = [...group].sort(
      (a, b) => b.weighted_score - a.weighted_score,
    );
    const lead = sorted[0];
    spots.push({
      placeId,
      venueName: lead.venue_name,
      venueAddress: lead.venue_address,
      weightedScore: lead.weighted_score,
      ratingCount: group.length,
      mealPhotoUrl: lead.meal_photo_url,
      priceLevel: lead.price_level,
    });
  }

  return spots.sort(
    (a, b) =>
      b.weightedScore - a.weightedScore ||
      b.ratingCount - a.ratingCount ||
      a.venueName.localeCompare(b.venueName),
  );
}

export function buildCityIndex(rows: ValuePageRatingRow[]): CityIndexEntry[] {
  const byCity = new Map<string, ValuePageRatingRow[]>();
  for (const row of rows) {
    if (!row.city?.trim()) continue;
    const city = row.city.trim();
    const bucket = byCity.get(city) ?? [];
    bucket.push(row);
    byCity.set(city, bucket);
  }

  const entries: CityIndexEntry[] = [];
  for (const [city, group] of byCity) {
    const places = new Set(group.map((row) => row.place_id));
    entries.push({
      city,
      citySlug: cityToSlug(city),
      ratingCount: group.length,
      placeCount: places.size,
    });
  }

  return entries.sort(
    (a, b) =>
      b.placeCount - a.placeCount ||
      b.ratingCount - a.ratingCount ||
      a.city.localeCompare(b.city),
  );
}

export function buildCuisineLinksForCity(
  rows: ValuePageRatingRow[],
  city: string,
  cuisineSegmentFor: (cuisine: Cuisine) => string,
  cuisineLabelFor: (cuisine: Cuisine) => string,
): CityCuisineLink[] {
  const cityRows = rowsForCity(rows, city);
  const counts = new Map<Cuisine, Set<string>>();

  for (const row of cityRows) {
    const raw = row.cuisine?.trim().toLowerCase();
    if (!raw) continue;
    if (!(CUISINES as readonly string[]).includes(raw)) continue;
    const cuisine = raw as Cuisine;
    const places = counts.get(cuisine) ?? new Set<string>();
    places.add(row.place_id);
    counts.set(cuisine, places);
  }

  const links: CityCuisineLink[] = [];
  for (const [cuisine, places] of counts) {
    if (places.size === 0) continue;
    links.push({
      cuisine,
      cuisineSegment: cuisineSegmentFor(cuisine),
      label: cuisineLabelFor(cuisine),
      placeCount: places.size,
    });
  }

  return links.sort(
    (a, b) => b.placeCount - a.placeCount || a.label.localeCompare(b.label),
  );
}
