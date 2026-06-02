import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cuisine } from "@/lib/places/cuisine";
import { cuisineLabel } from "@/lib/seo/slugs";
import type {
  CriticPortfolio,
  CriticPortfolioRating,
} from "@/lib/profile/criticPortfolio";
import { buildCriticPortfolio } from "@/lib/profile/criticPortfolio";
import { getRatingsLikeCounts } from "@/lib/ratings/likes";

export type CriticBadgeId =
  | "first-review"
  | "spots-10"
  | "spots-25"
  | "spots-50"
  | "likes-5"
  | "likes-25"
  | "likes-50"
  | "high-standards"
  | "honest-takes"
  | "city-guide"
  | "cuisine-specialist"
  | "photo-critic"
  | "standout-picks";

export interface CriticBadgeDefinition {
  id: CriticBadgeId;
  label: string;
  description: string;
  icon: string;
  /** Higher = more prestigious when picking a single badge to highlight. */
  priority: number;
}

export interface CriticBadge extends CriticBadgeDefinition {
  /** Overrides `label` for city/cuisine badges. */
  displayLabel?: string;
}

export interface CriticBadgeProgress {
  badge: CriticBadgeDefinition;
  current: number;
  target: number;
  label: string;
}

const BADGE_DEFINITIONS: Record<CriticBadgeId, CriticBadgeDefinition> = {
  "first-review": {
    id: "first-review",
    label: "First take",
    description: "Posted your first review.",
    icon: "edit_note",
    priority: 10,
  },
  "spots-10": {
    id: "spots-10",
    label: "10 spots rated",
    description: "Rated 10 different places.",
    icon: "pin_drop",
    priority: 30,
  },
  "spots-25": {
    id: "spots-25",
    label: "Seasoned critic",
    description: "Rated 25 different places.",
    icon: "travel_explore",
    priority: 50,
  },
  "spots-50": {
    id: "spots-50",
    label: "Veteran critic",
    description: "Rated 50 different places.",
    icon: "military_tech",
    priority: 70,
  },
  "likes-5": {
    id: "likes-5",
    label: "Getting noticed",
    description: "Earned 5 likes on your reviews.",
    icon: "thumb_up",
    priority: 25,
  },
  "likes-25": {
    id: "likes-25",
    label: "Community voice",
    description: "Earned 25 likes on your reviews.",
    icon: "campaign",
    priority: 55,
  },
  "likes-50": {
    id: "likes-50",
    label: "Trusted critic",
    description: "Earned 50 likes — people trust your takes.",
    icon: "verified",
    priority: 75,
  },
  "high-standards": {
    id: "high-standards",
    label: "High standards",
    description: "Average score 8.5+ across 10+ reviews.",
    icon: "grade",
    priority: 45,
  },
  "honest-takes": {
    id: "honest-takes",
    label: "Honest critic",
    description: "Average score under 7.0 across 10+ reviews — no grade inflation.",
    icon: "gavel",
    priority: 45,
  },
  "city-guide": {
    id: "city-guide",
    label: "City guide",
    description: "15+ reviews in your top city.",
    icon: "location_city",
    priority: 40,
  },
  "cuisine-specialist": {
    id: "cuisine-specialist",
    label: "Cuisine specialist",
    description: "10+ reviews in one cuisine.",
    icon: "restaurant_menu",
    priority: 40,
  },
  "photo-critic": {
    id: "photo-critic",
    label: "Visual critic",
    description: "15+ reviews with meal photos.",
    icon: "photo_camera",
    priority: 35,
  },
  "standout-picks": {
    id: "standout-picks",
    label: "Standout picks",
    description: "Three or more 9.5+ scores at different spots.",
    icon: "stars",
    priority: 60,
  },
};

const MILESTONE_BADGES: CriticBadgeId[] = [
  "spots-10",
  "spots-25",
  "spots-50",
  "likes-5",
  "likes-25",
  "likes-50",
  "photo-critic",
  "standout-picks",
];

function badge(id: CriticBadgeId, displayLabel?: string): CriticBadge {
  const def = BADGE_DEFINITIONS[id];
  return displayLabel ? { ...def, displayLabel } : def;
}

function labelFor(b: CriticBadge): string {
  return b.displayLabel ?? b.label;
}

function countPhotos(ratings: CriticPortfolioRating[]): number {
  return ratings.filter((row) => row.meal_photo_url?.trim()).length;
}

function countStandoutPlaces(ratings: CriticPortfolioRating[]): number {
  const places = new Set<string>();
  for (const row of ratings) {
    if (row.weighted_score >= 9.5 && row.place_id?.trim()) {
      places.add(row.place_id);
    }
  }
  return places.size;
}

function topCityCount(ratings: CriticPortfolioRating[]): {
  city: string | null;
  count: number;
} {
  const counts = new Map<string, number>();
  for (const row of ratings) {
    const city = row.city?.trim();
    if (!city) continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { city: top[0], count: top[1] } : { city: null, count: 0 };
}

function topCuisineCount(ratings: CriticPortfolioRating[]): {
  cuisine: Cuisine | null;
  count: number;
} {
  const counts = new Map<string, number>();
  for (const row of ratings) {
    const key = (row.cuisine ?? "").trim().toLowerCase();
    if (!key || key === "other") continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top
    ? { cuisine: top[0] as Cuisine, count: top[1] }
    : { cuisine: null, count: 0 };
}

export function computeCriticBadges(
  ratings: CriticPortfolioRating[],
  portfolio: CriticPortfolio,
  totalLikes: number,
): CriticBadge[] {
  if (ratings.length === 0) return [];

  const earned: CriticBadge[] = [];

  earned.push(badge("first-review"));

  if (portfolio.uniquePlaceCount >= 10) earned.push(badge("spots-10"));
  if (portfolio.uniquePlaceCount >= 25) earned.push(badge("spots-25"));
  if (portfolio.uniquePlaceCount >= 50) earned.push(badge("spots-50"));

  if (totalLikes >= 5) earned.push(badge("likes-5"));
  if (totalLikes >= 25) earned.push(badge("likes-25"));
  if (totalLikes >= 50) earned.push(badge("likes-50"));

  if (portfolio.ratingCount >= 10 && portfolio.avgScore >= 8.5) {
    earned.push(badge("high-standards"));
  }
  if (portfolio.ratingCount >= 10 && portfolio.avgScore < 7.0) {
    earned.push(badge("honest-takes"));
  }

  const city = topCityCount(ratings);
  if (city.city && city.count >= 15) {
    earned.push(badge("city-guide", `${city.city} guide`));
  }

  const cuisine = topCuisineCount(ratings);
  if (cuisine.cuisine && cuisine.count >= 10) {
    earned.push(
      badge(
        "cuisine-specialist",
        `${cuisineLabel(cuisine.cuisine)} specialist`,
      ),
    );
  }

  if (countPhotos(ratings) >= 15) earned.push(badge("photo-critic"));
  if (countStandoutPlaces(ratings) >= 3) earned.push(badge("standout-picks"));

  return earned.sort((a, b) => b.priority - a.priority);
}

export function getTopCriticBadge(badges: CriticBadge[]): CriticBadge | null {
  return badges[0] ?? null;
}

/** Likes on reviews — the only source for public “critic” / trust copy. */
const COMMUNITY_BADGE_IDS = new Set<CriticBadgeId>([
  "likes-5",
  "likes-25",
  "likes-50",
]);

/**
 * Eyebrow above the display name on `/u/[username]`.
 * Neutral by default; community badge labels only when earned via likes.
 */
export function getPublicProfileRoleLabel(
  badges: CriticBadge[],
  ratingCount: number,
): string {
  const topCommunity = badges
    .filter((b) => COMMUNITY_BADGE_IDS.has(b.id))
    .sort((a, b) => b.priority - a.priority)[0];
  if (topCommunity) return labelFor(topCommunity);
  if (ratingCount === 0) return "New on GrubGauge";
  return "Reviewer";
}

export function getNextCriticBadgeProgress(
  ratings: CriticPortfolioRating[],
  portfolio: CriticPortfolio,
  totalLikes: number,
  earned: CriticBadge[],
): CriticBadgeProgress | null {
  const earnedIds = new Set(earned.map((b) => b.id));

  for (const id of MILESTONE_BADGES) {
    if (earnedIds.has(id)) continue;

    const def = BADGE_DEFINITIONS[id];
    switch (id) {
      case "spots-10":
        return {
          badge: def,
          current: portfolio.uniquePlaceCount,
          target: 10,
          label: "unique spots rated",
        };
      case "spots-25":
        return {
          badge: def,
          current: portfolio.uniquePlaceCount,
          target: 25,
          label: "unique spots rated",
        };
      case "spots-50":
        return {
          badge: def,
          current: portfolio.uniquePlaceCount,
          target: 50,
          label: "unique spots rated",
        };
      case "likes-5":
        return {
          badge: def,
          current: totalLikes,
          target: 5,
          label: "likes on your reviews",
        };
      case "likes-25":
        return {
          badge: def,
          current: totalLikes,
          target: 25,
          label: "likes on your reviews",
        };
      case "likes-50":
        return {
          badge: def,
          current: totalLikes,
          target: 50,
          label: "likes on your reviews",
        };
      case "photo-critic":
        return {
          badge: def,
          current: countPhotos(ratings),
          target: 15,
          label: "reviews with photos",
        };
      case "standout-picks":
        return {
          badge: def,
          current: countStandoutPlaces(ratings),
          target: 3,
          label: "9.5+ scores at different spots",
        };
    }
  }

  if (!earnedIds.has("high-standards") && portfolio.ratingCount < 10) {
    return {
      badge: BADGE_DEFINITIONS["high-standards"],
      current: portfolio.ratingCount,
      target: 10,
      label: "reviews to unlock High standards",
    };
  }

  if (!earnedIds.has("city-guide")) {
    const city = topCityCount(ratings);
    if (city.count < 15) {
      return {
        badge: BADGE_DEFINITIONS["city-guide"],
        current: city.count,
        target: 15,
        label: city.city ? `reviews in ${city.city}` : "reviews in one city",
      };
    }
  }

  if (!earnedIds.has("cuisine-specialist")) {
    const cuisine = topCuisineCount(ratings);
    if (cuisine.count < 10) {
      return {
        badge: BADGE_DEFINITIONS["cuisine-specialist"],
        current: cuisine.count,
        target: 10,
        label: cuisine.cuisine
          ? `${cuisineLabel(cuisine.cuisine)} reviews`
          : "reviews in one cuisine",
      };
    }
  }

  return null;
}

export { labelFor as criticBadgeLabel };

type BadgeRatingRow = Pick<
  CriticPortfolioRating,
  | "id"
  | "place_id"
  | "venue_name"
  | "venue_address"
  | "venue_type"
  | "cuisine"
  | "city"
  | "weighted_score"
  | "notes"
  | "meal_photo_url"
  | "criteria_scores"
  | "visit_date"
  | "created_at"
>;

/**
 * Batched top-badge lookup for feed surfaces. Pulls each user's rating
 * history (minimal columns) and like totals, then returns their most
 * prestigious earned badge — if any.
 */
export async function getTopCriticBadgesByUserIds(
  supabase: SupabaseClient,
  userIds: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, CriticBadge>> {
  const map = new Map<string, CriticBadge>();
  const unique = Array.from(
    new Set(userIds.filter((id): id is string => typeof id === "string" && id.length > 0)),
  );
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("ratings")
    .select(
      "id, user_id, place_id, venue_name, venue_address, venue_type, cuisine, city, visit_date, weighted_score, notes, meal_photo_url, criteria_scores, created_at",
    )
    .in("user_id", unique);
  if (error || !data) return map;

  const byUser = new Map<string, BadgeRatingRow[]>();
  const ratingIds: string[] = [];
  for (const row of data) {
    const userId = row.user_id as string;
    ratingIds.push(row.id as string);
    const list = byUser.get(userId) ?? [];
    list.push(row as BadgeRatingRow);
    byUser.set(userId, list);
  }

  const likeCounts = await getRatingsLikeCounts(supabase, ratingIds);
  const likesByUser = new Map<string, number>();
  for (const row of data) {
    const userId = row.user_id as string;
    const likes = likeCounts.get(row.id as string) ?? 0;
    likesByUser.set(userId, (likesByUser.get(userId) ?? 0) + likes);
  }

  for (const userId of unique) {
    const rows = byUser.get(userId) ?? [];
    if (rows.length === 0) continue;
    const portfolio = buildCriticPortfolio(rows, likesByUser.get(userId) ?? 0);
    const badges = computeCriticBadges(rows, portfolio, likesByUser.get(userId) ?? 0);
    const top = getTopCriticBadge(badges);
    if (top) map.set(userId, top);
  }

  return map;
}
