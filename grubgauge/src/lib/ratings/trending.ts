import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Trending ratings = the most-liked ratings from the last N days, capped.
 * Used by the FollowingFeed's guest variant ("Trending from raters you'll
 * want to follow") so a visitor lands on a populated feed before they have
 * any follow graph of their own.
 *
 * Implementation notes:
 *   - We pull a generous candidate window (200 recent ratings from the last
 *     N days), batch-fetch their like counts via the existing `rating_likes`
 *     join, sort client-side, and trim to `limit`. This avoids a custom RPC
 *     while staying within a single round-trip per resource.
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

  // Window: the last N days. The candidate set is filtered by recency
  // first, then re-sorted by like count below.
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates, error: candErr } = await supabase
    .from("ratings")
    .select(
      "id, place_id, venue_name, venue_address, venue_type, visit_date, weighted_score, notes, meal_photo_url, created_at, user_id",
    )
    .gte("created_at", since)
    .not("user_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(candidateLimit);
  if (candErr || !candidates || candidates.length === 0) return [];

  const ids = candidates.map((r) => r.id as string);

  const { data: likeRows, error: likeErr } = await supabase
    .from("rating_likes")
    .select("rating_id")
    .in("rating_id", ids);
  if (likeErr) {
    // No likes data → fall back to recency ordering (already in order).
    return (candidates as TrendingRatingRow[]).slice(0, limit);
  }
  const counts = new Map<string, number>();
  for (const row of likeRows ?? []) {
    const rid = row.rating_id as string;
    counts.set(rid, (counts.get(rid) ?? 0) + 1);
  }

  const sorted = [...(candidates as TrendingRatingRow[])].sort((a, b) => {
    const ca = counts.get(a.id) ?? 0;
    const cb = counts.get(b.id) ?? 0;
    if (cb !== ca) return cb - ca;
    // Tie-break: newer wins. ISO strings compare lexically as timestamps.
    return b.created_at.localeCompare(a.created_at);
  });
  return sorted.slice(0, limit);
}
