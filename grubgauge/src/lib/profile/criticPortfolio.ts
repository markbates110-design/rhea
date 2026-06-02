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

/** Mirrors `criticBadges` like milestones — tagline trust copy only when earned. */
const LIKES_TRUSTED = 50;
const LIKES_COMMUNITY = 25;
const LIKES_NOTICED = 5;
const CUISINE_SPECIALIST_MIN = 10;
const SCORE_CLAIM_MIN_REVIEWS = 10;

function buildTagline(
  ratingCount: number,
  avgScore: number,
  totalLikes: number,
  topCuisine: Cuisine | null,
  topCuisineCount: number,
  topCity: string | null,
  topVenueType: VenueType | null,
): string {
  if (ratingCount === 0) {
    return "Building your taste profile — every rating adds to the story.";
  }

  const parts: string[] = [];

  if (totalLikes >= LIKES_TRUSTED) {
    parts.push("Trusted by the community");
  } else if (totalLikes >= LIKES_COMMUNITY) {
    parts.push("Community-backed reviews");
  } else if (totalLikes >= LIKES_NOTICED) {
    parts.push("Getting noticed by fellow eaters");
  }

  if (topCuisine && topCuisine !== "other") {
    if (topCuisineCount >= CUISINE_SPECIALIST_MIN) {
      parts.push(`${cuisineLabel(topCuisine)} specialist`);
    } else {
      parts.push(`Often rates ${cuisineLabel(topCuisine).toLowerCase()}`);
    }
  }

  if (ratingCount >= SCORE_CLAIM_MIN_REVIEWS && avgScore >= 8.5) {
    parts.push("high standards");
  } else if (ratingCount >= SCORE_CLAIM_MIN_REVIEWS && avgScore < 7.0) {
    parts.push("honest takes");
  }

  if (topVenueType) {
    parts.push(`mostly ${VENUE_META[topVenueType].label.toLowerCase()}`);
  }

  if (topCity) {
    parts.push(topCity);
  }

  if (parts.length === 0) {
    const noun = ratingCount === 1 ? "review" : "reviews";
    return `${ratingCount} ${noun} on GrubGauge`;
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
      tagline: buildTagline(0, 0, 0, null, 0, null, null),
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
  const topCuisineCount = topCuisine
    ? (cuisineCounts.get(topCuisine) ?? 0)
    : 0;
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
      totalLikes,
      topCuisine,
      topCuisineCount,
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
