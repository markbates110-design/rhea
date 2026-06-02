import {
  getCriteriaHighlights,
  type CriteriaHighlight,
} from "@/lib/ratings/criteriaBreakdown";

interface CriteriaBreakdownProps {
  venueType: string;
  criteriaScores: Record<string, number> | null | undefined;
  className?: string;
}

/**
 * Compact "9.2 taste · 6.8 value" line for rating cards. Renders nothing
 * when the rating has no stored criteria breakdown (legacy rows).
 */
export function CriteriaBreakdown({
  venueType,
  criteriaScores,
  className = "",
}: CriteriaBreakdownProps) {
  const highlights = getCriteriaHighlights(venueType, criteriaScores);
  if (highlights.length === 0) return null;

  return (
    <p
      className={`font-label-sm text-label-sm text-on-surface-variant ${className}`.trim()}
      aria-label={`Criteria breakdown: ${highlights.map(formatAria).join(", ")}`}
    >
      {highlights.map((item, index) => (
        <span key={item.key}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          <span className="tabular-nums font-semibold text-on-surface">
            {item.score.toFixed(1)}
          </span>{" "}
          {item.label}
        </span>
      ))}
    </p>
  );
}

function formatAria(item: CriteriaHighlight): string {
  return `${item.label} ${item.score.toFixed(1)} out of 10`;
}
