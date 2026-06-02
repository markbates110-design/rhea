import Link from "next/link";
import type { ValuePageSpot } from "@/lib/ratings/valuePages";

function priceLabel(level: number | null): string | null {
  if (level === null) return null;
  return "$".repeat(Math.min(4, Math.max(1, level + 1)));
}

interface ValueSpotListProps {
  spots: ValuePageSpot[];
  showRank?: boolean;
}

export function ValueSpotList({ spots, showRank = true }: ValueSpotListProps) {
  if (spots.length === 0) {
    return (
      <div className="flex w-full flex-col items-stretch gap-md rounded-xl border border-outline-variant bg-surface-container-low px-lg py-xl text-center">
        <span
          className="material-symbols-outlined text-[40px] text-on-surface-variant"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          restaurant
        </span>
        <p className="font-body-md text-body-md text-on-surface-variant">
          No spots in this slice yet. Be the first to rate one.
        </p>
        <Link
          href="/rate"
          className="inline-flex items-center gap-xs rounded-lg bg-primary-container px-md py-xs font-title-sm text-title-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
        >
          Rate a spot
        </Link>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-sm">
      {spots.map((spot, index) => {
        const price = priceLabel(spot.priceLevel);
        return (
          <li key={spot.placeId}>
            <Link
              href={`/rate?placeId=${encodeURIComponent(spot.placeId)}`}
              className="flex gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md transition-colors hover:bg-surface-container active:scale-[0.99]"
            >
              {spot.mealPhotoUrl ? (
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-outline-variant/50">
                  {/* eslint-disable-next-line @next/next/no-img-element -- community meal photos */}
                  <img
                    src={spot.mealPhotoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-container-high">
                  <span
                    className="material-symbols-outlined text-[24px] text-on-surface-variant"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    restaurant
                  </span>
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-xs">
                <div className="flex items-start justify-between gap-sm">
                  <div className="min-w-0">
                    {showRank && (
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        #{index + 1}
                      </p>
                    )}
                    <p className="line-clamp-1 font-title-sm text-title-sm font-semibold text-on-surface">
                      {spot.venueName}
                    </p>
                    {spot.venueAddress && (
                      <p className="line-clamp-1 font-label-sm text-label-sm text-on-surface-variant">
                        {spot.venueAddress}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="font-bold tabular-nums text-[24px] leading-none text-primary">
                      {spot.weightedScore.toFixed(1)}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      /10
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-xs font-label-sm text-label-sm text-on-surface-variant">
                  {spot.ratingCount > 1 && (
                    <span>{spot.ratingCount} ratings</span>
                  )}
                  {price && <span>{price}</span>}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
