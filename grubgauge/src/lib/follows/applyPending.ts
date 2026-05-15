import type { SupabaseClient } from "@supabase/supabase-js";
import { followUser } from "./follows";
import { consumePendingFollow } from "./pendingFollow";

/**
 * Resolve a guest's pending follow intent right after auth lands.
 *
 * - Reads + clears the pending intent atomically (consumePendingFollow).
 * - If present, runs `followUser(targetId)` against the now-authenticated
 *   session.
 * - Returns the path the caller should redirect to:
 *     - the intent's `returnTo` when an intent existed (success or
 *       silent-fail; we don't block onboarding on a follow miss),
 *     - `null` when there was no pending intent (caller falls back to
 *       its own default redirect).
 *
 * Designed to be called from every post-auth landing surface (sign-in
 * success, sign-up immediate-session, onboarding/profile completion, and
 * the email-confirmation useEffect that reacts to the user becoming
 * available). Each call site collapses to:
 *
 *   const next = await applyPendingFollow(supabase);
 *   router.push(next ?? "/profile");
 *
 * which keeps the auto-follow logic centralized.
 */
export async function applyPendingFollow(
  supabase: SupabaseClient,
): Promise<string | null> {
  const intent = consumePendingFollow();
  if (!intent) return null;

  // Best-effort: a follow failure here (network blip, deleted target,
  // self-follow due to bizarre edge case) shouldn't block onboarding.
  // The user still lands on the intended page; they can retap Follow if
  // it didn't take.
  try {
    await followUser(supabase, intent.targetUserId);
  } catch {
    // Swallow — the redirect still proceeds with the user's intent.
  }

  return intent.returnTo;
}
