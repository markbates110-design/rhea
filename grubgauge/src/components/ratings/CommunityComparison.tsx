import {
  compareCriteriaToCommunity,
  compareScoreToCommunity,
  formatScoreDelta,
  type CommunityPlaceStats,
} from "@/lib/ratings/placeStats";

interface CommunityComparisonProps {
  viewerScore: number;
  venueType: string;
  criteriaScores: Record<string, number> | null | undefined;
  community: CommunityPlaceStats | null | undefined;
  compact?: boolean;
}

/**
 * Compact "you vs community" line for history cards and success states.
 */
export function CommunityComparison({
  viewerScore,
  venueType,
  criteriaScores,
  community,
  compact = false,
}: CommunityComparisonProps) {
  const scoreComparison = compareScoreToCommunity(viewerScore, community);
  if (!scoreComparison) return null;

  const criteriaComparison = compareCriteriaToCommunity(
    venueType,
    criteriaScores,
    community,
  );

  if (compact) {
    return (
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        Community avg{" "}
        <span className="tabular-nums font-semibold text-on-surface">
          {scoreComparison.communityScore.toFixed(1)}
        </span>
        /10 ({scoreComparison.ratingCount}) · you{" "}
        <span
          className={`tabular-nums font-semibold ${
            scoreComparison.delta >= 0 ? "text-primary" : "text-tertiary"
          }`}
        >
          {formatScoreDelta(scoreComparison.delta)}
        </span>
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-outline-variant/60 bg-surface-container px-sm py-xs">
      <p className="font-label-sm text-label-sm text-on-surface-variant">
        Community avg{" "}
        <span className="tabular-nums font-semibold text-on-surface">
          {scoreComparison.communityScore.toFixed(1)}/10
        </span>{" "}
        from {scoreComparison.ratingCount} other{" "}
        {scoreComparison.ratingCount === 1 ? "rater" : "raters"} · your score
        is{" "}
        <span
          className={`tabular-nums font-semibold ${
            scoreComparison.delta >= 0 ? "text-primary" : "text-tertiary"
          }`}
        >
          {formatScoreDelta(scoreComparison.delta)}
        </span>
        {criteriaComparison && (
          <>
            {" "}
            · {criteriaComparison.highlight.label}: you{" "}
            <span className="tabular-nums">
              {criteriaComparison.highlight.score.toFixed(1)}
            </span>
            , community{" "}
            <span className="tabular-nums">
              {criteriaComparison.communityScore.toFixed(1)}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
