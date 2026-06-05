import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recent community ratings from the last N days — candidate pool for the
 * dashboard guest feed. Used by FollowingFeed so a visitor lands on a
 * populated feed before they have any follow graph of their own.
 *
 * Implementation notes:
 *   - Pulls a generous candidate window (recent ratings from the last N
 *     days). FollowingFeed re-sorts after rater hydration (named profiles
 *     first, then newest) and trims to the visible limit.
 *   - Ratings with `user_id is null` (legacy guest posts) are excluded — the
 *     feed is meant to surface rater identities for the conversion hook,
 *     and an anonymous rating has no rater chip to follow.
 *   - Failures resolve to an empty array; the feed renders an empty state
 *     rather than surfacing a query error.
 *
 * Selecting the same columns as `RatingCardRating` so the caller can pass
 * the result straight to `attachRaters` + `RatingCard`/`FeedRatingCard`.
 */
export interface TrendingRatingRow {
  id: string;
  place_id: string;
  venue_name: string;
  venue_address: string;
  venue_type: string;
  visit_date: string;
  weighted_score: number;
  notes: string | null;
  meal_photo_url: string | null;
  criteria_scores: Record<string, number> | null;
  created_at: string;
  user_id: string | null;
}

export async function getTrendingRatings(
  supabase: SupabaseClient,
  options: { sinceDays?: number; limit?: number } = {},
): Promise<TrendingRatingRow[]> {
  const sinceDays = options.sinceDays ?? 30;
  const limit = options.limit ?? 10;
  const candidateLimit = Math.max(limit * 4, 50);

  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error: candErr } = await supabase
    .from("ratings")
    .select(
      "id, place_id, venue_name, venue_address, venue_type, visit_date, weighted_score, notes, meal_photo_url, criteria_scores, created_at, user_id",
    )
    .gte("created_at", since)
    .not("user_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(candidateLimit);
  if (candErr || !candidates || candidates.length === 0) return [];

  return candidates as TrendingRatingRow[];
}
