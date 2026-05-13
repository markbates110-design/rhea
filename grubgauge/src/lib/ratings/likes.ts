import type { SupabaseClient } from "@supabase/supabase-js";

export const RATING_LIKES_TABLE = "rating_likes";

/**
 * Outcome of a `toggleLike` call. The UI branches on `code` (not a thrown
 * exception) so an unauthenticated tap can route to the sign-in flow
 * without a try/catch boundary.
 *
 *  - `ok: true`  → mutation succeeded; `liked` is the new state.
 *  - `code: "unauthenticated"` → no Supabase session; show sign-in upsell.
 *  - `code: "failed"`          → DB error; show generic retry copy.
 */
export type ToggleLikeResult =
  | { ok: true; liked: boolean; count: number }
  | { ok: false; code: "unauthenticated" }
  | { ok: false; code: "failed"; message: string };

/**
 * Toggles the current user's like on a rating.
 *
 * Reads the existing row, then either deletes or inserts. The unique
 * constraint `(rating_id, user_id)` on the table is the race-condition
 * safety net — a second tab's stale "insert" lands as a 23505 (unique
 * violation), which we treat as success because the post-state matches
 * the user's intent (still liked). Symmetric logic for deletes (no row
 * affected is fine).
 */
export async function toggleLike(
  supabase: SupabaseClient,
  ratingId: string,
): Promise<ToggleLikeResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, code: "unauthenticated" };
  }
  const userId = authData.user.id;

  const { data: existing, error: readError } = await supabase
    .from(RATING_LIKES_TABLE)
    .select("id")
    .eq("rating_id", ratingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    return { ok: false, code: "failed", message: readError.message };
  }

  if (existing) {
    const { error: deleteError } = await supabase
      .from(RATING_LIKES_TABLE)
      .delete()
      .eq("rating_id", ratingId)
      .eq("user_id", userId);
    if (deleteError) {
      return { ok: false, code: "failed", message: deleteError.message };
    }
  } else {
    const { error: insertError } = await supabase
      .from(RATING_LIKES_TABLE)
      .insert({ rating_id: ratingId, user_id: userId });
    // 23505 = unique_violation: another tab raced ahead with an insert.
    // Post-state still matches intent (liked), so don't surface as error.
    if (insertError && !isUniqueViolation(insertError)) {
      return { ok: false, code: "failed", message: insertError.message };
    }
  }

  const count = await getLikeCount(supabase, ratingId);
  return { ok: true, liked: !existing, count };
}

/**
 * Total likes on a rating. Works unauthenticated (public-read RLS policy).
 * Returns 0 on any failure rather than surfacing — like counts are
 * non-critical UI; better to show 0 than a broken state.
 */
export async function getLikeCount(
  supabase: SupabaseClient,
  ratingId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(RATING_LIKES_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("rating_id", ratingId);
  if (error || count === null) return 0;
  return count;
}

/**
 * For a list of rating ids, returns the subset the current user has liked
 * (as a Set for O(1) membership checks at render time). Designed for
 * batch-hydrating like state on a list of ratings: fetch the list, then
 * one round-trip to compute "which of these did I like?"
 *
 * Empty Set when unauthenticated or when the input list is empty.
 */
export async function getUserLikedRatings(
  supabase: SupabaseClient,
  ratingIds: string[],
): Promise<Set<string>> {
  if (ratingIds.length === 0) return new Set();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return new Set();

  const { data, error } = await supabase
    .from(RATING_LIKES_TABLE)
    .select("rating_id")
    .eq("user_id", authData.user.id)
    .in("rating_id", ratingIds);
  if (error || !data) return new Set();

  return new Set(data.map((row) => row.rating_id as string));
}

/**
 * Batched like counts for a list of ratings. Companion to
 * `getUserLikedRatings` — both let a feed parent hydrate per-card state in
 * a single round-trip rather than N round-trips. Every input id is present
 * as a key in the returned Map (0 if the rating has no likes) so the
 * caller can read counts without nullish handling per render.
 *
 * Public-read RLS on `rating_likes` means this works unauthenticated.
 *
 * Scale note: this pulls one row per existing like across the input set.
 * Fine for small feeds (~hundreds of likes total). For larger feeds,
 * replace with a `rpc()` aggregate (`select rating_id, count(*) … group by`).
 */
export async function getRatingsLikeCounts(
  supabase: SupabaseClient,
  ratingIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ratingIds.length === 0) return counts;

  for (const id of ratingIds) counts.set(id, 0);

  const { data, error } = await supabase
    .from(RATING_LIKES_TABLE)
    .select("rating_id")
    .in("rating_id", ratingIds);
  if (error || !data) return counts;

  for (const row of data) {
    const id = row.rating_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

// ── internals ────────────────────────────────────────────────────────────

function isUniqueViolation(err: { code?: string } | null | undefined): boolean {
  return err?.code === "23505";
}
