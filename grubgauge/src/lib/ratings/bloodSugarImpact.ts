import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/profile/profile";
import { hasLegitimateDisplayName } from "@/lib/profile/names";

export const BLOOD_SUGAR_IMPACT_TABLE = "rating_personal_health";

export type BloodSugarImpact = "low" | "medium" | "high";

export type BloodSugarHealthRecord = {
  impact: BloodSugarImpact | null;
  notes: string | null;
};

export const BLOOD_SUGAR_IMPACT_OPTIONS: ReadonlyArray<{
  value: BloodSugarImpact;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const BLOOD_SUGAR_DISCLAIMER =
  "Personal observation only — not medical advice. How a meal affects your blood sugar can differ from person to person and from visit to visit. This is private to you — others cannot see it.";

export const BLOOD_SUGAR_RATE_REMINDER =
  "Your response may differ from others eating the same meal. Only you can see this.";

export function bloodSugarImpactLabel(impact: BloodSugarImpact): string {
  return BLOOD_SUGAR_IMPACT_OPTIONS.find((o) => o.value === impact)?.label ?? impact;
}

export function normalizeBloodSugarNotes(notes: string | null | undefined): string | null {
  const trimmed = notes?.trim();
  return trimmed ? trimmed : null;
}

export function hasBloodSugarHealthContent(
  record: BloodSugarHealthRecord | null | undefined,
): boolean {
  if (!record) return false;
  return Boolean(record.impact || normalizeBloodSugarNotes(record.notes));
}

export function canTrackBloodSugarImpact(
  profile:
    | Pick<Profile, "display_name" | "track_blood_sugar_impact" | "username">
    | null
    | undefined,
): boolean {
  return Boolean(profile && hasLegitimateDisplayName(profile) && profile.track_blood_sugar_impact);
}

export function isBloodSugarImpact(value: string | null | undefined): value is BloodSugarImpact {
  return value === "low" || value === "medium" || value === "high";
}

function parseHealthRow(row: {
  rating_id: string;
  impact: string | null;
  notes: string | null;
}): BloodSugarHealthRecord | null {
  const impact = isBloodSugarImpact(row.impact) ? row.impact : null;
  const notes = normalizeBloodSugarNotes(row.notes);
  const record = { impact, notes };
  return hasBloodSugarHealthContent(record) ? record : null;
}

export async function upsertBloodSugarHealth(
  supabase: SupabaseClient,
  ratingId: string,
  userId: string,
  record: BloodSugarHealthRecord,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const notes = normalizeBloodSugarNotes(record.notes);
  if (!record.impact && !notes) {
    await deleteBloodSugarHealth(supabase, ratingId);
    return { ok: true };
  }

  const { error } = await supabase.from(BLOOD_SUGAR_IMPACT_TABLE).upsert(
    {
      rating_id: ratingId,
      user_id: userId,
      impact: record.impact,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rating_id" },
  );
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function deleteBloodSugarHealth(
  supabase: SupabaseClient,
  ratingId: string,
): Promise<void> {
  await supabase.from(BLOOD_SUGAR_IMPACT_TABLE).delete().eq("rating_id", ratingId);
}

/** @deprecated Use deleteBloodSugarHealth */
export async function deleteBloodSugarImpact(
  supabase: SupabaseClient,
  ratingId: string,
): Promise<void> {
  return deleteBloodSugarHealth(supabase, ratingId);
}

export async function getBloodSugarHealthByRatingIds(
  supabase: SupabaseClient,
  ratingIds: ReadonlyArray<string>,
): Promise<Map<string, BloodSugarHealthRecord>> {
  const map = new Map<string, BloodSugarHealthRecord>();
  const unique = [...new Set(ratingIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from(BLOOD_SUGAR_IMPACT_TABLE)
    .select("rating_id, impact, notes")
    .in("rating_id", unique);
  if (error || !data) return map;

  for (const row of data) {
    const parsed = parseHealthRow({
      rating_id: row.rating_id as string,
      impact: row.impact as string | null,
      notes: row.notes as string | null,
    });
    if (parsed) {
      map.set(row.rating_id as string, parsed);
    }
  }
  return map;
}

/**
 * Most recent private blood sugar record the viewer logged at this place.
 */
export async function getLastBloodSugarHealthForPlace(
  supabase: SupabaseClient,
  placeId: string,
  userId: string,
): Promise<BloodSugarHealthRecord | null> {
  const { data: ratings, error: ratingsErr } = await supabase
    .from("ratings")
    .select("id")
    .eq("place_id", placeId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (ratingsErr || !ratings?.length) return null;

  const ratingIds = ratings.map((r) => r.id as string);
  const { data, error } = await supabase
    .from(BLOOD_SUGAR_IMPACT_TABLE)
    .select("rating_id, impact, notes")
    .in("rating_id", ratingIds);
  if (error || !data?.length) return null;

  const healthByRating = new Map<string, BloodSugarHealthRecord>();
  for (const row of data) {
    const parsed = parseHealthRow({
      rating_id: row.rating_id as string,
      impact: row.impact as string | null,
      notes: row.notes as string | null,
    });
    if (parsed) {
      healthByRating.set(row.rating_id as string, parsed);
    }
  }

  for (const id of ratingIds) {
    const hit = healthByRating.get(id);
    if (hit) return hit;
  }
  return null;
}
