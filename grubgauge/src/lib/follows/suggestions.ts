import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/profile/profile";
import { PROFILES_TABLE } from "@/lib/profile/profile";
import {
  type FounderBadgeInfo,
  getFounderBadgesByUserIds,
} from "@/lib/founder/founder";
import { FOLLOWS_TABLE } from "./follows";

/**
 * One suggested-user card payload. `reason` is a short string the UI
 * renders verbatim under the handle ("Rated 4 of your spots", "Active
 * this month") so the card explains itself instead of looking arbitrary.
 *
 * `founder` is included here for one-shot hydration — the row component
 * uses it to render the founder pill inline without a second round-trip.
 */
export interface SuggestedUser {
  profile: Profile;
  reason: string;
  founder: FounderBadgeInfo | null;
}

interface Options {
  /**
   * The viewer's user_id, or `null` for guests. Members get the
   * co-rated → active fallback ladder; guests skip directly to active
   * (they have no rating history of their own to overlap against).
   */
  viewerId: string | null;
  limit?: number;
}

/**
 * Tiered suggested-users query, designed to be useful from day one
 * regardless of social-graph density.
 *
 *   Tier 1 — co-rated places (members with >= 3 own ratings only):
 *     Other users who have rated places the viewer has also rated.
 *     Ranked by overlap count. Most personalized.
 *
 *   Tier 2 — most active (everyone else, and the co-rated fallback):
 *     Users with the most ratings in the last 30 days. Cold-start safe
 *     because it requires no graph density or viewer history.
 *
 *   Always excluded: the viewer, anyone the viewer already follows,
 *   ratings with `user_id is null` (no profile to suggest).
 *
 * Returns up to `limit` cards; can return fewer (or zero) when the
 * candidate pool is small. The caller renders the row's empty state by
 * checking `result.length === 0`.
 */
export async function getSuggestedUsers(
  supabase: SupabaseClient,
  options: Options,
): Promise<SuggestedUser[]> {
  const limit = options.limit ?? 6;
  const viewerId = options.viewerId;

  const excludeIds = new Set<string>();
  if (viewerId) excludeIds.add(viewerId);

  if (viewerId) {
    const { data: followedRows } = await supabase
      .from(FOLLOWS_TABLE)
      .select("followee_id")
      .eq("follower_id", viewerId);
    for (const row of followedRows ?? []) {
      excludeIds.add(row.followee_id as string);
    }
  }

  // Tier 1: co-rated places. Only attempt when the viewer has a non-trivial
  // rating history; otherwise the overlap set is too small to matter and we
  // skip straight to tier 2.
  let ranked: Array<{ userId: string; score: number; reason: string }> = [];
  if (viewerId) {
    const { data: viewerRatings } = await supabase
      .from("ratings")
      .select("place_id")
      .eq("user_id", viewerId)
      .not("place_id", "is", null);
    const viewerPlaceIds = Array.from(
      new Set((viewerRatings ?? []).map((r) => r.place_id as string).filter(Boolean)),
    );

    if (viewerPlaceIds.length >= 3) {
      const { data: overlapRows } = await supabase
        .from("ratings")
        .select("user_id, place_id")
        .in("place_id", viewerPlaceIds)
        .not("user_id", "is", null);
      const overlapByUser = new Map<string, Set<string>>();
      for (const row of overlapRows ?? []) {
        const uid = row.user_id as string;
        if (excludeIds.has(uid)) continue;
        if (!overlapByUser.has(uid)) overlapByUser.set(uid, new Set());
        overlapByUser.get(uid)!.add(row.place_id as string);
      }
      ranked = Array.from(overlapByUser.entries())
        .map(([userId, places]) => ({
          userId,
          score: places.size,
          reason: `Rated ${places.size} of your spots`,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit * 2);
    }
  }

  // Tier 2: most active in the last 30 days. Runs when tier 1 produced
  // too few results to fill the row OR the viewer doesn't qualify.
  if (ranked.length < limit) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeRows } = await supabase
      .from("ratings")
      .select("user_id, id")
      .gte("created_at", since)
      .not("user_id", "is", null);
    const counts = new Map<string, number>();
    for (const row of activeRows ?? []) {
      const uid = row.user_id as string;
      if (excludeIds.has(uid)) continue;
      counts.set(uid, (counts.get(uid) ?? 0) + 1);
    }
    const existingRanked = new Set(ranked.map((r) => r.userId));
    const activeRanked = Array.from(counts.entries())
      .filter(([uid]) => !existingRanked.has(uid))
      .map(([userId, score]) => ({
        userId,
        score,
        reason: "Active this month",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2);
    ranked = [...ranked, ...activeRanked];
  }

  if (ranked.length === 0) return [];

  // Cap before the hydration round-trips so we don't fetch profiles we
  // won't render.
  const topIds = ranked.slice(0, limit).map((r) => r.userId);
  const reasonByUser = new Map(ranked.map((r) => [r.userId, r.reason]));

  const [profilesRes, founderMap] = await Promise.all([
    supabase
      .from(PROFILES_TABLE)
      .select("id, username, display_name, avatar_url, created_at, updated_at")
      .in("id", topIds),
    getFounderBadgesByUserIds(supabase, topIds),
  ]);

  const profilesById = new Map<string, Profile>();
  for (const row of (profilesRes.data as Profile[] | null) ?? []) {
    profilesById.set(row.id, row);
  }

  // Preserve the ranked ordering; drop ids whose profile didn't resolve
  // (deleted accounts) so the row never shows ghost cards.
  const cards: SuggestedUser[] = [];
  for (const id of topIds) {
    const profile = profilesById.get(id);
    if (!profile) continue;
    cards.push({
      profile,
      reason: reasonByUser.get(id) ?? "Active this month",
      founder: founderMap.get(id) ?? null,
    });
  }
  return cards;
}
