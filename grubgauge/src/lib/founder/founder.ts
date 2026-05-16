import type { SupabaseClient } from "@supabase/supabase-js";

export const FOUNDING_MEMBERS_TABLE = "founding_members";
export const APP_CONFIG_TABLE = "app_config";

/**
 * The app founder's user_id, set at deploy time via env var. Surfaces a
 * distinct, singular badge (`THE_FOUNDER`) separate from the numbered
 * Founding Member slots. Empty / unset → no app founder is recognized;
 * the badge simply never renders.
 *
 * Why `NEXT_PUBLIC_`: the badge renders in client components on profile
 * + rating cards + follower lists, so the constant must be available at
 * the browser. Exposing the founder's user_id publicly is fine — it's
 * effectively the same information as their handle (which is already
 * public) and grants no privileges.
 */
export const APP_FOUNDER_USER_ID =
  process.env.NEXT_PUBLIC_APP_FOUNDER_USER_ID?.trim() ?? "";

/**
 * Distinct kinds of founder-tier badge. Exposed as a union so render
 * code can switch on `kind` without juggling a boolean + a nullable
 * slot number.
 *
 * - `the-founder` → singular, ungated, env-assigned. No slot number.
 * - `founding-member` → one of slots 1-100, server-awarded by trigger.
 */
export type FounderKind = "the-founder" | "founding-member";

export interface FounderBadgeInfo {
  kind: FounderKind;
  slotNumber: number | null;
}

export function isAppFounder(userId: string | null | undefined): boolean {
  return !!userId && !!APP_FOUNDER_USER_ID && userId === APP_FOUNDER_USER_ID;
}

/**
 * Public-read founder badge state for a single user. Returns:
 *   - `{ kind: "the-founder", slotNumber: null }` when the user_id matches
 *     the env-pinned app founder.
 *   - `{ kind: "founding-member", slotNumber: N }` when the user has a
 *     row in `public.founding_members`.
 *   - `null` for every other user.
 *
 * The Founder check short-circuits before the DB round-trip, so guests
 * viewing the Founder's profile do not pay for a query.
 */
export async function getFounderBadge(
  supabase: SupabaseClient,
  userId: string,
): Promise<FounderBadgeInfo | null> {
  if (isAppFounder(userId)) {
    return { kind: "the-founder", slotNumber: null };
  }

  const { data, error } = await supabase
    .from(FOUNDING_MEMBERS_TABLE)
    .select("slot_number")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return { kind: "founding-member", slotNumber: data.slot_number as number };
}

/**
 * Batched founder badge lookup for a list of user ids. Companion to
 * `getRatersByUserIds` — one round-trip hydrates badge state for a whole
 * feed instead of N per-card fetches.
 *
 *   - The app founder is resolved in-process (no query), then merged on top.
 *   - Failures resolve to an empty Map rather than throwing; badges are
 *     non-critical UI and the feed should still render without them.
 */
export async function getFounderBadgesByUserIds(
  supabase: SupabaseClient,
  userIds: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, FounderBadgeInfo>> {
  const map = new Map<string, FounderBadgeInfo>();
  const unique = Array.from(
    new Set(userIds.filter((id): id is string => typeof id === "string" && id.length > 0)),
  );
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from(FOUNDING_MEMBERS_TABLE)
    .select("user_id, slot_number")
    .in("user_id", unique);
  if (!error && data) {
    for (const row of data) {
      map.set(row.user_id as string, {
        kind: "founding-member",
        slotNumber: row.slot_number as number,
      });
    }
  }
  // The Founder overrides any FM row (shouldn't coexist, but be defensive).
  if (APP_FOUNDER_USER_ID && unique.includes(APP_FOUNDER_USER_ID)) {
    map.set(APP_FOUNDER_USER_ID, { kind: "the-founder", slotNumber: null });
  }
  return map;
}

/**
 * Live counter for the onboarding / dashboard / FollowGateSheet copy
 * (e.g., "47 founding member spots left"). Calls the SECURITY DEFINER RPC so
 * any visitor — including guests — can read the number without
 * needing direct table access.
 *
 * Returns 100 on error so the UI shows a safe, non-alarmist value
 * (matches the "no founders yet" pre-launch state).
 */
export async function getAvailableFounderSlots(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase.rpc("available_founder_slots");
  if (error || typeof data !== "number") return 100;
  return data;
}

/**
 * Per-user qualification snapshot for the progress card on the dashboard.
 * Mirrors the trigger's qualifying-day math so the UI can show "2 of 3
 * ratings done" and "Next eligible tomorrow."
 *
 *   - `qualifyingDays`: number of distinct UTC days the user has posted a
 *     first-time, photographed rating on or after launch (0-3+).
 *   - `lastQualifyingDayUtc`: the most recent UTC date string that counted,
 *     or null if none. Used to compute when the next rating could count.
 *
 * Returns `{ qualifyingDays: 0, lastQualifyingDayUtc: null }` for guests
 * or on any error — the progress card hides on those branches anyway.
 */
export interface FounderProgress {
  qualifyingDays: number;
  lastQualifyingDayUtc: string | null;
}

export async function getFounderProgress(
  supabase: SupabaseClient,
  userId: string,
): Promise<FounderProgress> {
  const empty: FounderProgress = { qualifyingDays: 0, lastQualifyingDayUtc: null };

  const launchAt = await getProgramLaunchAt(supabase);
  if (!launchAt) return empty;

  // Pull every photographed, place-attached rating the user has made on or
  // after launch. We only need place_id + created_at to reproduce the
  // trigger's first-per-place + distinct-UTC-day count.
  const { data, error } = await supabase
    .from("ratings")
    .select("place_id, created_at")
    .eq("user_id", userId)
    .not("meal_photo_url", "is", null)
    .not("place_id", "is", null)
    .gte("created_at", launchAt);
  if (error || !data) return empty;

  // Earliest created_at per distinct place_id, then count distinct UTC
  // dates from that set.
  const earliestByPlace = new Map<string, string>();
  for (const row of data) {
    const place = row.place_id as string;
    const at = row.created_at as string;
    const prior = earliestByPlace.get(place);
    if (!prior || at < prior) earliestByPlace.set(place, at);
  }
  const days = new Set<string>();
  let lastDay: string | null = null;
  for (const at of earliestByPlace.values()) {
    const day = at.slice(0, 10);
    days.add(day);
    if (!lastDay || day > lastDay) lastDay = day;
  }
  return { qualifyingDays: days.size, lastQualifyingDayUtc: lastDay };
}

// ── internals ────────────────────────────────────────────────────────────

async function getProgramLaunchAt(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await supabase
    .from(APP_CONFIG_TABLE)
    .select("founder_program_starts_at")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  return (data.founder_program_starts_at as string) ?? null;
}
