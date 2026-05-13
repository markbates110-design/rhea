import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILES_TABLE = "profiles";

/**
 * Window event dispatched after a successful `upsertProfile` so any active
 * `useProfile()` consumers in the same tab can refetch and update without
 * waiting for a navigation remount. Cross-tab consistency is out of scope
 * (would require Supabase Realtime or a BroadcastChannel).
 */
export const PROFILE_UPDATED_EVENT = "profile:updated";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilePatch {
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export type UpsertProfileResult =
  | { ok: true }
  | { ok: false; code: "unauthenticated" }
  | { ok: false; code: "failed"; message: string };

/**
 * Writes the current user's profile row. Only keys present on `patch` are
 * sent — undefined keys are skipped so callers can update one field at a
 * time without clobbering others (the row already exists thanks to the
 * `handle_new_user` trigger, so this is effectively an UPDATE that uses
 * upsert semantics defensively).
 *
 * Returns a discriminated union (no throw on unauth) for the same reason
 * `toggleLike` does — the unauthenticated path is a routine UI branch.
 */
export async function upsertProfile(
  supabase: SupabaseClient,
  patch: ProfilePatch,
): Promise<UpsertProfileResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, code: "unauthenticated" };
  }

  const row: Record<string, unknown> = {
    id: authData.user.id,
    // `updated_at` has a DEFAULT but the default only fires on INSERT. The
    // trigger pre-created the row, so every call here is an UPDATE — we
    // set updated_at explicitly to keep it current.
    updated_at: new Date().toISOString(),
  };
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.display_name !== undefined) row.display_name = patch.display_name;
  if (patch.avatar_url !== undefined) row.avatar_url = patch.avatar_url;

  const { error } = await supabase.from(PROFILES_TABLE).upsert(row);
  if (error) {
    return { ok: false, code: "failed", message: error.message };
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
  }
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
    .select("id, username, display_name, avatar_url, created_at, updated_at")
    .eq("username", trimmed)
    .maybeSingle();
  if (error) {
    console.error("getProfileByUsername:", error.code, error.message);
    return null;
  }
  return data as Profile | null;
}
