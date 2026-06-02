import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCriteriaHighlights,
  type CriteriaHighlight,
} from "./criteriaBreakdown";
import type { OwnerScope } from "./scope";
import { applyRatingsOwnerScope } from "./scope";

export interface RatingStatsRow {
  place_id: string;
  weighted_score: number;
  criteria_scores: Record<string, number> | null;
  user_id: string | null;
  device_id?: string | null;
}

export interface CommunityPlaceStats {
  placeId: string;
  ratingCount: number;
  avgScore: number;
  avgCriteria: Record<string, number>;
}

export interface PriorRatingSnapshot {
  id: string;
  weighted_score: number;
  visit_date: string;
  created_at: string;
  criteria_scores: Record<string, number> | null;
  venue_type: string;
}

export interface ScoreComparison {
  viewerScore: number;
  communityScore: number;
  delta: number;
  ratingCount: number;
}

export interface CriteriaComparison {
  highlight: CriteriaHighlight;
  communityScore: number;
  delta: number;
}

function isOwnerRow(
  row: Pick<RatingStatsRow, "user_id" | "device_id">,
  owner: OwnerScope,
): boolean {
  if (owner.user) return row.user_id === owner.user.id;
  return row.user_id === null && row.device_id === owner.deviceId;
}

export function buildCommunityStatsByPlace(
  rows: RatingStatsRow[],
  excludeOwner: OwnerScope,
): Map<string, CommunityPlaceStats> {
  const byPlace = new Map<string, RatingStatsRow[]>();

  for (const row of rows) {
    if (!row.place_id?.trim()) continue;
    if (isOwnerRow(row, excludeOwner)) continue;
    const bucket = byPlace.get(row.place_id) ?? [];
    bucket.push(row);
    byPlace.set(row.place_id, bucket);
  }

  const stats = new Map<string, CommunityPlaceStats>();

  for (const [placeId, group] of byPlace) {
    if (group.length === 0) continue;
    const avgScore =
      group.reduce((sum, row) => sum + row.weighted_score, 0) / group.length;

    const criteriaTotals = new Map<string, { sum: number; count: number }>();
    for (const row of group) {
      if (!row.criteria_scores || typeof row.criteria_scores !== "object") {
        continue;
      }
      for (const [key, value] of Object.entries(row.criteria_scores)) {
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        const bucket = criteriaTotals.get(key) ?? { sum: 0, count: 0 };
        bucket.sum += value;
        bucket.count += 1;
        criteriaTotals.set(key, bucket);
      }
    }

    const avgCriteria: Record<string, number> = {};
    for (const [key, { sum, count }] of criteriaTotals) {
      if (count > 0) avgCriteria[key] = sum / count;
    }

    stats.set(placeId, {
      placeId,
      ratingCount: group.length,
      avgScore,
      avgCriteria,
    });
  }

  return stats;
}

export async function fetchCommunityStatsForPlace(
  supabase: SupabaseClient,
  placeId: string,
  excludeOwner: OwnerScope,
): Promise<CommunityPlaceStats | null> {
  const { data, error } = await supabase
    .from("ratings")
    .select("place_id, weighted_score, criteria_scores, user_id, device_id")
    .eq("place_id", placeId);
  if (error || !data) return null;
  return (
    buildCommunityStatsByPlace(data as RatingStatsRow[], excludeOwner).get(
      placeId,
    ) ?? null
  );
}

export async function fetchCommunityStatsForPlaces(
  supabase: SupabaseClient,
  placeIds: string[],
  excludeOwner: OwnerScope,
): Promise<Map<string, CommunityPlaceStats>> {
  if (placeIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("ratings")
    .select("place_id, weighted_score, criteria_scores, user_id, device_id")
    .in("place_id", placeIds);
  if (error || !data) return new Map();
  return buildCommunityStatsByPlace(data as RatingStatsRow[], excludeOwner);
}

export async function fetchViewerPriorRatingsForPlace(
  supabase: SupabaseClient,
  placeId: string,
  owner: OwnerScope,
): Promise<PriorRatingSnapshot[]> {
  const base = supabase
    .from("ratings")
    .select(
      "id, weighted_score, visit_date, created_at, criteria_scores, venue_type",
    )
    .eq("place_id", placeId);
  const { data, error } = await applyRatingsOwnerScope(base, owner).order(
    "created_at",
    { ascending: false },
  );
  if (error || !data) return [];
  return data as PriorRatingSnapshot[];
}

export function compareScoreToCommunity(
  viewerScore: number,
  community: CommunityPlaceStats | null | undefined,
): ScoreComparison | null {
  if (!community || community.ratingCount === 0) return null;
  const delta = viewerScore - community.avgScore;
  return {
    viewerScore,
    communityScore: community.avgScore,
    delta,
    ratingCount: community.ratingCount,
  };
}

export function compareCriteriaToCommunity(
  venueType: string,
  viewerCriteria: Record<string, number> | null | undefined,
  community: CommunityPlaceStats | null | undefined,
): CriteriaComparison | null {
  if (!community || !viewerCriteria) return null;

  const highlights = getCriteriaHighlights(venueType, viewerCriteria, 3);
  let best: CriteriaComparison | null = null;

  for (const highlight of highlights) {
    const communityScore = community.avgCriteria[highlight.key];
    if (typeof communityScore !== "number") continue;
    const delta = highlight.score - communityScore;
    if (
      !best ||
      Math.abs(delta) > Math.abs(best.delta)
    ) {
      best = { highlight, communityScore, delta };
    }
  }

  return best;
}

export function formatVisitDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatScoreDelta(delta: number): string {
  const rounded = delta.toFixed(1);
  if (delta > 0) return `+${rounded}`;
  if (delta < 0) return rounded;
  return "±0.0";
}
