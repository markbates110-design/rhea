import type { SupabaseClient } from "@supabase/supabase-js";
import { PROFILES_TABLE } from "./profile";

/**
 * Username validation rules — must agree with the seeds the
 * `handle_new_user` trigger expects. The trigger itself enforces only
 * uniqueness (via the `profiles.username` unique constraint) and supplies
 * a fallback (`user_<id_prefix>`) when the seed is null/empty, so app-side
 * validation is the only line of defense against ugly handles ("a", "!!",
 * 60-char strings, etc.). Keep these rules conservative: it's much easier
 * to relax them later than to migrate a database full of bad handles.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
const USERNAME_RE = /^[A-Za-z0-9_]+$/;

export type UsernameValidation =
  | { ok: true }
  | { ok: false; reason: "too_short" | "too_long" | "invalid_chars" };

export function validateUsername(candidate: string): UsernameValidation {
  const trimmed = candidate.trim();
  if (trimmed.length < USERNAME_MIN) return { ok: false, reason: "too_short" };
  if (trimmed.length > USERNAME_MAX) return { ok: false, reason: "too_long" };
  if (!USERNAME_RE.test(trimmed)) return { ok: false, reason: "invalid_chars" };
  return { ok: true };
}

/**
 * Public-read availability check. Uses ilike for case-insensitive
 * comparison so a user typing "Mark" can't claim a handle when "mark"
 * already exists — the DB's unique constraint is case-sensitive (a
 * future schema tightening could use citext or a `lower(username)` index
 * to enforce this at the DB level, but app-level CI matches user
 * expectations even on a case-sensitive column).
 *
 * Returns true when available, false when taken. On any DB error we
 * treat the handle as available — better to false-positive (let them
 * pick a handle that turns out to be taken at write time, getting a
 * unique-violation error they can react to) than to false-negative
 * (mark a name as taken when it isn't, and block onboarding on a
 * transient query failure).
 */
export async function isUsernameAvailable(
  supabase: SupabaseClient,
  candidate: string,
): Promise<boolean> {
  const trimmed = candidate.trim();
  if (trimmed.length === 0) return false;

  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select("id")
    .ilike("username", trimmed)
    .maybeSingle();
  if (error) return true;
  return !data;
}
