import type { User } from "@supabase/supabase-js";

export interface OwnerScope {
  user: User | null;
  deviceId: string;
}

/**
 * Canonical "this row belongs to me" filter for the `ratings` table.
 *
 * - Signed-in: rows whose `user_id` matches the current Supabase user.
 *   Cross-device by design — a user's history follows their account.
 * - Guest: rows whose `device_id` matches and have NO `user_id` set, so
 *   signed-in rows can never leak into guest mode on a shared device.
 *
 * Apply to `.select()`, `.update()`, and `.delete()` builders so reads
 * and writes share identical ownership semantics. Single source of truth
 * for personal-data scoping in this codebase — no component should
 * compose these filters by hand.
 */
export function applyRatingsOwnerScope<
  T extends {
    eq: (col: string, val: string) => T;
    is: (col: string, val: null) => T;
  }
>(query: T, { user, deviceId }: OwnerScope): T {
  if (user) return query.eq("user_id", user.id);
  return query.eq("device_id", deviceId).is("user_id", null);
}
