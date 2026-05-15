import type { SupabaseClient } from "@supabase/supabase-js";

export const FOLLOWS_TABLE = "follows";

/**
 * Window event dispatched after a successful `followUser` / `unfollowUser`
 * so any active `useFollowState()` consumers in the same tab can refetch
 * the relationship + counts without waiting for a navigation remount.
 *
 * Detail carries `targetUserId` so consumers can decide whether the change
 * is relevant to them — a card showing user X doesn't need to refetch when
 * the change concerned user Y.
 */
export const FOLLOW_CHANGED_EVENT = "follow:changed";

export interface FollowChangedDetail {
  targetUserId: string;
}

export type FollowMutationResult =
  | { ok: true }
  | { ok: false; code: "unauthenticated" }
  | { ok: false; code: "self_follow" }
  | { ok: false; code: "failed"; message: string };

function dispatchFollowChanged(targetUserId: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<FollowChangedDetail>(FOLLOW_CHANGED_EVENT, {
        detail: { targetUserId },
      }),
    );
  }
}

/**
 * Inserts a follow row from the current user to `targetUserId`. Idempotent:
 * a 23505 (unique violation) means another tab raced ahead with the same
 * insert, which leaves the post-state matching the user's intent (still
 * following), so we collapse it to success. The DB-side CHECK rejects
 * self-follows, but we short-circuit the round-trip when we can detect it
 * client-side.
 */
export async function followUser(
  supabase: SupabaseClient,
  targetUserId: string,
): Promise<FollowMutationResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, code: "unauthenticated" };
  }
  if (authData.user.id === targetUserId) {
    return { ok: false, code: "self_follow" };
  }

  const { error } = await supabase
    .from(FOLLOWS_TABLE)
    .insert({ follower_id: authData.user.id, followee_id: targetUserId });
  if (error && !isUniqueViolation(error)) {
    return { ok: false, code: "failed", message: error.message };
  }

  dispatchFollowChanged(targetUserId);
  return { ok: true };
}

/**
 * Deletes the follow row from the current user to `targetUserId`. A
 * 0-affected delete (already gone) is treated as success — the post-state
 * matches the user's intent (not following).
 */
export async function unfollowUser(
  supabase: SupabaseClient,
  targetUserId: string,
): Promise<FollowMutationResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, code: "unauthenticated" };
  }

  const { error } = await supabase
    .from(FOLLOWS_TABLE)
    .delete()
    .eq("follower_id", authData.user.id)
    .eq("followee_id", targetUserId);
  if (error) {
    return { ok: false, code: "failed", message: error.message };
  }

  dispatchFollowChanged(targetUserId);
  return { ok: true };
}

/**
 * Returns whether the current user follows `targetUserId`. False when
 * unauthenticated or on any read error — both states render the same way
 * (a "Follow" affordance), so collapsing them keeps the UI simple.
 */
export async function isFollowing(
  supabase: SupabaseClient,
  targetUserId: string,
): Promise<boolean> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return false;
  if (authData.user.id === targetUserId) return false;

  const { data, error } = await supabase
    .from(FOLLOWS_TABLE)
    .select("follower_id")
    .eq("follower_id", authData.user.id)
    .eq("followee_id", targetUserId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

/**
 * Public follower / following counts for `userId`. Works unauthenticated
 * (public-read RLS). Returns zeros on error rather than throwing — counts
 * are non-critical UI; better to render 0 than a broken state.
 *
 * Scale note: two `head: true, count: exact` round-trips. Fine for v1; if
 * profile renders show up in profiling, batch into a single `rpc()` that
 * returns both counts in one query.
 */
export async function getFollowCounts(
  supabase: SupabaseClient,
  userId: string,
): Promise<FollowCounts> {
  const followersQ = supabase
    .from(FOLLOWS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("followee_id", userId);
  const followingQ = supabase
    .from(FOLLOWS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  const [followersRes, followingRes] = await Promise.all([followersQ, followingQ]);

  return {
    followers: followersRes.error || followersRes.count === null ? 0 : followersRes.count,
    following: followingRes.error || followingRes.count === null ? 0 : followingRes.count,
  };
}

export interface FollowEdge {
  follower_id: string;
  followee_id: string;
  created_at: string;
}

/**
 * People who follow `userId`, newest follow first. Uses the
 * `follows_followee_id_idx` access path. Caller joins to `public.profiles`
 * for display fields (avatar, username, display_name).
 */
export async function getFollowers(
  supabase: SupabaseClient,
  userId: string,
): Promise<FollowEdge[]> {
  const { data, error } = await supabase
    .from(FOLLOWS_TABLE)
    .select("follower_id, followee_id, created_at")
    .eq("followee_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as FollowEdge[];
}

/**
 * People `userId` follows, newest follow first. Uses the
 * `follows_follower_id_created_at_idx` covering index.
 */
export async function getFollowing(
  supabase: SupabaseClient,
  userId: string,
): Promise<FollowEdge[]> {
  const { data, error } = await supabase
    .from(FOLLOWS_TABLE)
    .select("follower_id, followee_id, created_at")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as FollowEdge[];
}

// ── internals ────────────────────────────────────────────────────────────

function isUniqueViolation(err: { code?: string } | null | undefined): boolean {
  return err?.code === "23505";
}
