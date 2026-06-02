import type { CriticPortfolio } from "@/lib/profile/criticPortfolio";
import { VENUE_META } from "@/lib/ratings/scoring";

interface CriticStatsStripProps {
  portfolio: CriticPortfolio;
}

export function CriticStatsStrip({ portfolio }: CriticStatsStripProps) {
  if (portfolio.ratingCount === 0) return null;

  const venueLabel = portfolio.topVenueType
    ? VENUE_META[portfolio.topVenueType].label
    : null;

  return (
    <div className="grid grid-cols-3 gap-sm">
      <div className="flex flex-col items-center gap-base rounded-xl border border-outline-variant bg-surface-container-low p-md text-center">
        <span className="font-display-lg text-[28px] font-bold leading-none tabular-nums text-primary">
          {portfolio.avgScore.toFixed(1)}
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Avg score
        </span>
      </div>
      <div className="flex flex-col items-center gap-base rounded-xl border border-outline-variant bg-surface-container-low p-md text-center">
        <span className="font-display-lg text-[28px] font-bold leading-none tabular-nums text-primary">
          {portfolio.uniquePlaceCount}
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Spots rated
        </span>
      </div>
      <div className="flex flex-col items-center gap-base rounded-xl border border-outline-variant bg-surface-container-low p-md text-center">
        <span className="font-display-lg text-[28px] font-bold leading-none tabular-nums text-primary">
          {portfolio.totalLikes}
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Likes
        </span>
      </div>
      {venueLabel && (
        <p className="col-span-3 text-center font-label-sm text-label-sm text-on-surface-variant">
          Mostly rates {venueLabel.toLowerCase()}
          {portfolio.topCity ? ` · often in ${portfolio.topCity}` : ""}
        </p>
      )}
    </div>
  );
}
