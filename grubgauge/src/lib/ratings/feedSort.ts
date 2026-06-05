import { hasLegitimateDisplayName } from "@/lib/profile/names";
import type { RaterFields } from "@/lib/profile/raters";

export type FeedSortPrimary = "recent" | "score";

export interface FeedSortableRating {
  place_id?: string;
  weighted_score: number;
  visit_date: string;
  created_at?: string;
  user_id: string | null;
  meal_photo_url?: string | null;
  rater?: RaterFields | null;
}

function recencyKey(row: FeedSortableRating): string {
  return row.created_at ?? row.visit_date;
}

/** Named member ratings surface first; guests and username-only profiles sink. */
export function raterQualifiesForFeedPromotion(
  row: FeedSortableRating,
): boolean {
  if (!row.user_id || !row.rater) return false;
  return hasLegitimateDisplayName(row.rater);
}

export function compareFeedRatings(
  a: FeedSortableRating,
  b: FeedSortableRating,
  primary: FeedSortPrimary = "recent",
): number {
  const aPromoted = raterQualifiesForFeedPromotion(a);
  const bPromoted = raterQualifiesForFeedPromotion(b);
  if (aPromoted !== bPromoted) return aPromoted ? -1 : 1;

  if (primary === "score") {
    const scoreDiff = b.weighted_score - a.weighted_score;
    if (Math.abs(scoreDiff) > 0.001) return scoreDiff > 0 ? 1 : -1;
  }

  const timeDiff = recencyKey(b).localeCompare(recencyKey(a));
  if (timeDiff !== 0) return timeDiff;

  return b.weighted_score - a.weighted_score;
}

export function sortFeedRatings<T extends FeedSortableRating>(
  rows: T[],
  primary: FeedSortPrimary = "recent",
): T[] {
  return [...rows].sort((a, b) => compareFeedRatings(a, b, primary));
}

/** One card per place — keep the newest rating for that spot. */
export function pickNewestRatingPerPlace<
  T extends FeedSortableRating & { place_id: string },
>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    const existing = map.get(row.place_id);
    if (!existing) {
      map.set(row.place_id, row);
      continue;
    }
    const rowKey = recencyKey(row);
    const existingKey = recencyKey(existing);
    if (rowKey > existingKey) {
      map.set(row.place_id, row);
    } else if (
      rowKey === existingKey &&
      row.meal_photo_url?.trim() &&
      !existing.meal_photo_url?.trim()
    ) {
      map.set(row.place_id, row);
    }
  }
  return Array.from(map.values());
}
