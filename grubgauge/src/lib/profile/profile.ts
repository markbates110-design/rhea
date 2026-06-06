import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILES_TABLE = "profiles";

/**
 * Window event dispatched after a successful `updateProfile` or
 * `upsertProfile` so any active `useProfile()` consumers in the same tab can
 * refetch and update without waiting for a navigation remount. Cross-tab
 * consistency is out of scope (would require Supabase Realtime or a
 * BroadcastChannel).
 */
export const PROFILE_UPDATED_EVENT = "profile:updated";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  track_blood_sugar_impact: boolean;
  blood_sugar_disclaimer_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilePatch {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  track_blood_sugar_impact?: boolean;
  blood_sugar_disclaimer_accepted_at?: string | null;
}

export type UpsertProfileResult =
  | { ok: true }
  | { ok: false; code: "unauthenticated" }
  | { ok: false; code: "failed"; message: string };

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: "profile_not_found" }
  | { ok: false; code: "unauthenticated" }
  | { ok: false; code: "failed"; message: string };

/**
 * Onboarding / first-write path: upserts `public.profiles` for the current
 * user. `username` is required at the type level so a missing profile row
 * never INSERTs without a NOT NULL `username`.
 *
 * Returns a discriminated union (no throw on unauth) for the same reason
 * `toggleLike` does — the unauthenticated path is a routine UI branch.
 */
export type UpsertProfilePatch = Omit<ProfilePatch, "username"> & {
  username: string;
};

function dispatchProfileUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
  }
}

/**
 * Updates an existing `public.profiles` row for the current user only.
 * Partial patches are supported; undefined keys are omitted. If no row
 * matches (0 rows updated), returns `profile_not_found` so callers can
 * surface support messaging instead of treating the write as success.
 */
export async function updateProfile(
  supabase: SupabaseClient,
  patch: ProfilePatch,
): Promise<UpdateProfileResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, code: "unauthenticated" };
  }

  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.display_name !== undefined) row.display_name = patch.display_name;
  if (patch.avatar_url !== undefined) row.avatar_url = patch.avatar_url;
  if (patch.track_blood_sugar_impact !== undefined) {
    row.track_blood_sugar_impact = patch.track_blood_sugar_impact;
  }
  if (patch.blood_sugar_disclaimer_accepted_at !== undefined) {
    row.blood_sugar_disclaimer_accepted_at = patch.blood_sugar_disclaimer_accepted_at;
  }

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .update(row)
    .eq("id", authData.user.id)
    .select("id");
  if (error) {
    return { ok: false, code: "failed", message: error.message };
  }
  if (!data?.length) {
    return { ok: false, error: "profile_not_found" };
  }

  dispatchProfileUpdated();
  return { ok: true };
}

export async function upsertProfile(
  supabase: SupabaseClient,
  patch: UpsertProfilePatch,
): Promise<UpsertProfileResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, code: "unauthenticated" };
  }

  const row: Record<string, unknown> = {
    id: authData.user.id,
    username: patch.username,
    // `updated_at` has a DEFAULT but the default only fires on INSERT. We
    // set it explicitly on every write so it stays current.
    updated_at: new Date().toISOString(),
  };
  if (patch.display_name !== undefined) row.display_name = patch.display_name;
  if (patch.avatar_url !== undefined) row.avatar_url = patch.avatar_url;
  if (patch.track_blood_sugar_impact !== undefined) {
    row.track_blood_sugar_impact = patch.track_blood_sugar_impact;
  }
  if (patch.blood_sugar_disclaimer_accepted_at !== undefined) {
    row.blood_sugar_disclaimer_accepted_at = patch.blood_sugar_disclaimer_accepted_at;
  }

  const { error } = await supabase.from(PROFILES_TABLE).upsert(row);
  if (error) {
    return { ok: false, code: "failed", message: error.message };
  }

  dispatchProfileUpdated();
  return { ok: true };
}

/**
 * Fetch a single profile row by username (the public route key for
 * `/u/[username]`). Returns `null` on miss so callers can branch into a
 * `notFound()` / 404 view without distinguishing "no row" from "query
 * error" — both are non-recoverable for a route that's keyed off the
 * lookup. (DB errors are logged for diagnostic value, then collapsed.)
 *
 * Username uniqueness is enforced at the DB layer (`profiles_username_key`
 * unique constraint), so `maybeSingle()` is correct — there can be at
 * most one row.
 *
 * Auth-agnostic: works for both signed-in viewers and guests via the
 * public-read RLS policy on `public.profiles`.
 */
export async function getProfileByUsername(
  supabase: SupabaseClient,
  username: string,
): Promise<Profile | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select(
      "id, username, display_name, avatar_url, track_blood_sugar_impact, blood_sugar_disclaimer_accepted_at, created_at, updated_at",
    )
    .eq("username", trimmed)
    .maybeSingle();
  if (error) {
    console.error("getProfileByUsername:", error.code, error.message);
    return null;
  }
  return data as Profile | null;
}
