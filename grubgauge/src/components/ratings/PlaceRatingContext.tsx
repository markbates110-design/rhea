import {
  compareCriteriaToCommunity,
  compareScoreToCommunity,
  formatScoreDelta,
  formatVisitDate,
  type CommunityPlaceStats,
  type PriorRatingSnapshot,
} from "@/lib/ratings/placeStats";

interface PlaceRatingContextProps {
  priorRatings: PriorRatingSnapshot[];
  community: CommunityPlaceStats | null;
  venueType: string;
  draftScore: number;
  draftCriteria: Record<string, number>;
  onPrefillFromLast: () => void;
}

/**
 * Shown on /rate when the selected spot has prior viewer ratings and/or
 * community scores — supports re-rates and "you vs everyone else".
 */
export function PlaceRatingContext({
  priorRatings,
  community,
  venueType,
  draftScore,
  draftCriteria,
  onPrefillFromLast,
}: PlaceRatingContextProps) {
  const latest = priorRatings[0] ?? null;
  const scoreComparison = compareScoreToCommunity(draftScore, community);
  const criteriaComparison = compareCriteriaToCommunity(
    venueType,
    draftCriteria,
    community,
  );

  if (!latest && !scoreComparison) return null;

  return (
    <section
      aria-label="Rating context for this spot"
      className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md"
    >
      {latest && (
        <div className="flex flex-col gap-xs">
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
            Your history here
          </p>
          <p className="font-body-md text-body-md text-on-surface">
            {priorRatings.length > 1 ? (
              <>
                You&apos;ve rated this{" "}
                <span className="font-semibold tabular-nums">
                  {priorRatings.length}
                </span>{" "}
                times — last{" "}
                <span className="font-semibold tabular-nums">
                  {latest.weighted_score.toFixed(1)}/10
                </span>{" "}
                on {formatVisitDate(latest.visit_date)}
              </>
            ) : (
              <>
                You rated this{" "}
                <span className="font-semibold tabular-nums">
                  {latest.weighted_score.toFixed(1)}/10
                </span>{" "}
                on {formatVisitDate(latest.visit_date)}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={onPrefillFromLast}
            className="inline-flex w-fit items-center gap-xs font-label-sm text-label-sm text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">
              history
            </span>
            Pre-fill scores from last visit
          </button>
        </div>
      )}

      {scoreComparison && (
        <div
          className={`flex flex-col gap-xs ${latest ? "border-t border-outline-variant/50 pt-sm" : ""}`}
        >
          <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
            Community at this spot
          </p>
          <p className="font-body-md text-body-md text-on-surface">
            Others average{" "}
            <span className="font-semibold tabular-nums">
              {scoreComparison.communityScore.toFixed(1)}/10
            </span>{" "}
            ({scoreComparison.ratingCount}{" "}
            {scoreComparison.ratingCount === 1 ? "rating" : "ratings"})
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Your draft{" "}
            <span className="tabular-nums font-semibold text-on-surface">
              {scoreComparison.viewerScore.toFixed(1)}
            </span>{" "}
            is{" "}
            <span
              className={`tabular-nums font-semibold ${
                scoreComparison.delta >= 0 ? "text-primary" : "text-tertiary"
              }`}
            >
              {formatScoreDelta(scoreComparison.delta)}
            </span>{" "}
            vs community
            {criteriaComparison && (
              <>
                {" "}
                · biggest gap on{" "}
                <span className="font-semibold text-on-surface">
                  {criteriaComparison.highlight.label}
                </span>{" "}
                (
                <span className="tabular-nums">
                  {criteriaComparison.highlight.score.toFixed(1)}
                </span>{" "}
                vs{" "}
                <span className="tabular-nums">
                  {criteriaComparison.communityScore.toFixed(1)}
                </span>
                )
              </>
            )}
          </p>
        </div>
      )}

      {latest && !scoreComparison && (
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          You&apos;re the only GrubGauge rater here so far — this visit adds
          another data point for your history.
        </p>
      )}
    </section>
  );
}
