import type { Cuisine } from "@/lib/places/cuisine";
import { CUISINES } from "@/lib/places/cuisine";
import { cuisineLabel } from "@/lib/seo/slugs";
import {
  normalizeVenueType,
  VENUE_META,
  type VenueType,
} from "@/lib/ratings/scoring";

export interface CriticPortfolioRating {
  id: string;
  place_id: string;
  venue_name: string;
  venue_address: string;
  venue_type: string;
  cuisine: string | null;
  city: string | null;
  weighted_score: number;
  notes: string | null;
  meal_photo_url: string | null;
  criteria_scores: Record<string, number> | null;
  visit_date: string;
  created_at: string;
}

export interface CriticPick {
  ratingId: string;
  placeId: string;
  venueName: string;
  weightedScore: number;
  mealPhotoUrl: string | null;
  city: string | null;
  cuisine: Cuisine | null;
}

export interface CriticSpecialty {
  cuisine: Cuisine;
  label: string;
  count: number;
}

export interface CriticPortfolio {
  ratingCount: number;
  uniquePlaceCount: number;
  avgScore: number;
  totalLikes: number;
  tagline: string;
  topVenueType: VenueType | null;
  topCity: string | null;
  specialties: CriticSpecialty[];
  topPicks: CriticPick[];
  photoHighlights: CriticPick[];
}

function parseCuisine(value: string | null | undefined): Cuisine | null {
  const key = (value ?? "").trim().toLowerCase();
  if (!key || !(CUISINES as readonly string[]).includes(key)) return null;
  return key as Cuisine;
}

function dedupeBestPerPlace(ratings: CriticPortfolioRating[]): CriticPortfolioRating[] {
  const byPlace = new Map<string, CriticPortfolioRating>();
  for (const row of ratings) {
    if (!row.place_id?.trim()) continue;
    const existing = byPlace.get(row.place_id);
    if (!existing || row.weighted_score > existing.weighted_score) {
      byPlace.set(row.place_id, row);
    }
  }
  return Array.from(byPlace.values()).sort(
    (a, b) => b.weighted_score - a.weighted_score,
  );
}

function toPick(row: CriticPortfolioRating): CriticPick {
  return {
    ratingId: row.id,
    placeId: row.place_id,
    venueName: row.venue_name,
    weightedScore: row.weighted_score,
    mealPhotoUrl: row.meal_photo_url,
    city: row.city,
    cuisine: parseCuisine(row.cuisine),
  };
}

function buildTagline(
  ratingCount: number,
  avgScore: number,
  topCuisine: Cuisine | null,
  topCity: string | null,
  topVenueType: VenueType | null,
): string {
  if (ratingCount === 0) {
    return "Building a food critic portfolio — every rating adds to the story.";
  }

  const parts: string[] = [];

  if (topCuisine && topCuisine !== "other") {
    parts.push(`${cuisineLabel(topCuisine)} critic`);
  } else {
    parts.push("Trusted local food critic");
  }

  if (avgScore >= 8.5) parts.push("high standards");
  else if (avgScore >= 7.5) parts.push("value-focused");
  else if (avgScore >= 6.5) parts.push("honest takes");

  if (topVenueType) {
    parts.push(`${VENUE_META[topVenueType].label.toLowerCase()} explorer`);
  }

  if (topCity) {
    parts.push(topCity);
  }

  return parts.join(" · ");
}

export function buildCriticPortfolio(
  ratings: CriticPortfolioRating[],
  totalLikes = 0,
): CriticPortfolio {
  if (ratings.length === 0) {
    return {
      ratingCount: 0,
      uniquePlaceCount: 0,
      avgScore: 0,
      totalLikes,
      tagline: buildTagline(0, 0, null, null, null),
      topVenueType: null,
      topCity: null,
      specialties: [],
      topPicks: [],
      photoHighlights: [],
    };
  }

  const avgScore =
    ratings.reduce((sum, row) => sum + row.weighted_score, 0) / ratings.length;

  const places = new Set(ratings.map((row) => row.place_id).filter(Boolean));
  const deduped = dedupeBestPerPlace(ratings);

  const cuisineCounts = new Map<Cuisine, number>();
  const venueCounts = new Map<VenueType, number>();
  const cityCounts = new Map<string, number>();

  for (const row of ratings) {
    const cuisine = parseCuisine(row.cuisine);
    if (cuisine) {
      cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) ?? 0) + 1);
    }
    const venueType = normalizeVenueType(row.venue_type);
    venueCounts.set(venueType, (venueCounts.get(venueType) ?? 0) + 1);
    if (row.city?.trim()) {
      const city = row.city.trim();
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    }
  }

  const specialties: CriticSpecialty[] = [...cuisineCounts.entries()]
    .filter(([cuisine]) => cuisine !== "other")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cuisine, count]) => ({
      cuisine,
      label: cuisineLabel(cuisine),
      count,
    }));

  const topCuisine = specialties[0]?.cuisine ?? null;
  const topVenueType =
    [...venueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topCity =
    [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const topPicks = deduped.slice(0, 6).map(toPick);
  const photoHighlights = [...ratings]
    .filter((row) => row.meal_photo_url?.trim())
    .sort((a, b) => b.weighted_score - a.weighted_score)
    .slice(0, 9)
    .map(toPick);

  return {
    ratingCount: ratings.length,
    uniquePlaceCount: places.size,
    avgScore,
    totalLikes,
    tagline: buildTagline(
      ratings.length,
      avgScore,
      topCuisine,
      topCity,
      topVenueType,
    ),
    topVenueType,
    topCity,
    specialties,
    topPicks,
    photoHighlights,
  };
}
