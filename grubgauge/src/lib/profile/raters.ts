import type { SupabaseClient } from "@supabase/supabase-js";
import { PROFILES_TABLE } from "@/lib/profile/profile";
import {
  type FounderBadgeInfo,
  getFounderBadgesByUserIds,
} from "@/lib/founder/founder";

/**
 * Public-facing slice of a `public.profiles` row plus optional founder
 * status, all the fields needed to render an attribution badge + the
 * far-right founder pill on a rating card — no `created_at` / `updated_at`.
 *
 * The narrower type keeps this decoupled from the `Profile` shape used by
 * `useProfile` (current user's full row), so a future change to that shape
 * doesn't ripple through every rating card. Founder is included here
 * because it travels with the same batched lookup; a second hydration
 * pass would double the round-trips on every feed render.
 */
export interface RaterFields {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  founder: FounderBadgeInfo | null;
}

/**
 * Batched profile lookup for a list of user ids — companion to
 * `getRatingsLikeCounts` / `getUserLikedRatings`. One round-trip hydrates
 * rater attribution for an entire feed instead of N per-card fetches.
 *
 *   - Dedupes input ids; null / undefined / empty are dropped.
 *   - Returns a Map keyed by user id; missing entries (orphaned ratings
 *     after a profile delete, or a backfill miss) are absent from the Map
 *     so callers can branch on `Map.get(id) ?? null`.
 *   - Failures resolve to an empty Map rather than throwing — rater info
 *     is non-critical UI, the feed should still render without it.
 *
 * Why two queries instead of a PostgREST embedded select:
 *   `ratings.user_id` FK targets `auth.users(id)`, not `public.profiles(id)`.
 *   PostgREST chains an embed through a direct FK only; adding a parallel
 *   FK to `profiles(id)` would work but is a schema change we don't need.
 *   The codebase's prevailing pattern is flat selects + a batched hydrator
 *   anyway (see likes.ts) — staying consistent reads better than introducing
 *   a one-off embedded-select shape.
 */
export async function getRatersByUserIds(
  supabase: SupabaseClient,
  userIds: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, RaterFields>> {
  const map = new Map<string, RaterFields>();
  const unique = Array.from(
    new Set(userIds.filter((id): id is string => typeof id === "string" && id.length > 0)),
  );
  if (unique.length === 0) return map;

  // Parallel: profile fields + founder badges (FM rows + The Founder env
  // resolution). Both queries are public-read and hit independent indexes,
  // so launching them together adds no contention.
  const [profileRes, founderMap] = await Promise.all([
    supabase
      .from(PROFILES_TABLE)
      .select("id, username, display_name, avatar_url")
      .in("id", unique),
    getFounderBadgesByUserIds(supabase, unique),
  ]);
  if (profileRes.error || !profileRes.data) return map;

  for (const row of profileRes.data) {
    const id = row.id as string;
    map.set(id, {
      username: row.username as string,
      display_name: (row.display_name as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      founder: founderMap.get(id) ?? null,
    });
  }
  return map;
}

/**
 * Attaches a `rater` field to each row in `rows`, computed from a single
 * batched profile lookup. Rows whose `user_id` is null OR whose profile
 * isn't found get `rater: null` (the card renders the deleted-user
 * fallback for both cases — indistinguishable from the UI's perspective).
 *
 * Generic on the row type so callers don't have to widen their local
 * Rating type to satisfy the helper.
 */
export async function attachRaters<R extends { user_id: string | null }>(
  supabase: SupabaseClient,
  rows: R[],
): Promise<Array<R & { rater: RaterFields | null }>> {
  if (rows.length === 0) return [];
  const raters = await getRatersByUserIds(
    supabase,
    rows.map((r) => r.user_id),
  );
  return rows.map((r) => ({
    ...r,
    rater: r.user_id ? raters.get(r.user_id) ?? null : null,
  }));
}
