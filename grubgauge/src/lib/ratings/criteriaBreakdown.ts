import {
  DEFAULT_SCORE,
  normalizeVenueType,
  VENUE_CRITERIA,
} from "./scoring";

export interface CriteriaHighlight {
  key: string;
  label: string;
  score: number;
}

/**
 * Top weighted criteria for a venue type, with scores from the stored
 * `criteria_scores` blob. Used on Explore + profile cards to show why
 * a rating landed where it did (e.g. "9.2 taste · 6.8 value").
 */
export function getCriteriaHighlights(
  venueType: string,
  criteriaScores: Record<string, number> | null | undefined,
  count = 2,
): CriteriaHighlight[] {
  if (!criteriaScores || typeof criteriaScores !== "object") return [];
  if (Object.keys(criteriaScores).length === 0) return [];

  const vt = normalizeVenueType(venueType);
  const criteria = VENUE_CRITERIA[vt];

  return [...criteria]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count)
    .map((criterion) => ({
      key: criterion.key,
      label: criterion.key,
      score: criteriaScores[criterion.key] ?? DEFAULT_SCORE,
    }));
}

export function formatCriteriaBreakdown(highlights: CriteriaHighlight[]): string {
  return highlights
    .map((item) => `${item.score.toFixed(1)} ${item.label}`)
    .join(" · ");
}
