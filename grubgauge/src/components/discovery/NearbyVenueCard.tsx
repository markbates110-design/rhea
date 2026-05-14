import Link from "next/link";
import { VENUE_META } from "@/lib/ratings/scoring";
import type { NearbyVenue } from "@/lib/places/nearby";

interface NearbyVenueCardProps {
  venue: NearbyVenue;
  /**
   * Documents intent only — the parent (`NearbyVenuesRow`) already
   * filters already-rated venues out of the row, so a true value here
   * means the card got rendered anyway (e.g. a future override). Kept
   * as a prop so a later "show all, dim the rated ones" mode is a
   * one-line component change rather than a refactor.
   */
  alreadyRated?: boolean;
}

/**
 * Pure presentational card for a single venue in the dashboard
 * "Near You" carousel. No data fetching, no effects — owns nothing
 * beyond layout and the tap target into `/rate?placeId=...`.
 *
 * Visual contract (do not weaken):
 *   - Square 152×152 photo distinguishes venue cards from rating cards
 *     (which use a 16:9 meal photo). A user must never read this as
 *     "the meal someone ate."
 *   - Persistent pin glyph overlay reinforces "this is a place."
 *   - Caption always names the venue + cuisine, never a meal.
 *   - `loading="lazy"` on the photo is the cost guardrail — only the
 *     visible 2–3 cards trigger Place Photos billable events at first
 *     paint; the rest load on scroll.
 */
export function NearbyVenueCard({ venue }: NearbyVenueCardProps) {
  const meta = VENUE_META[venue.cuisineType];
  const distanceLabel = formatDistanceMiles(venue.distanceMeters);
  const ratingLabel =
    typeof venue.googleRating === "number"
      ? venue.googleRating.toFixed(1)
      : null;

  return (
    <Link
      href={`/rate?placeId=${encodeURIComponent(venue.placeId)}`}
      aria-label={`Rate ${venue.name}`}
      className="group flex shrink-0 w-[152px] flex-col rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden snap-start transition-all hover:shadow-md hover:border-primary/40 active:scale-[0.98]"
    >
      <div className="relative h-[152px] w-[152px] shrink-0 bg-surface-container">
        {venue.photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Google Place Photos must be served from Google's URL per Places ToS; can't be proxied through next/image */
          <img
            src={venue.photoUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-container">
            <span
              className="material-symbols-outlined text-[40px] text-on-surface-variant"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {meta.icon}
            </span>
          </div>
        )}
        {/* Persistent pin overlay — this is the "place not meal" signal. */}
        <span
          aria-hidden
          className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-sm"
        >
          <span
            className="material-symbols-outlined text-[12px] text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            location_on
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-base p-sm">
        <p className="font-title-sm text-title-sm font-semibold text-on-surface truncate">
          {venue.name}
        </p>
        <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
          {meta.label} · {distanceLabel}
        </p>
        {ratingLabel ? (
          <p className="flex items-center gap-1 font-label-sm text-label-sm text-primary tabular-nums">
            <span
              className="material-symbols-outlined text-[12px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <span>{ratingLabel}</span>
            {typeof venue.googleRatingCount === "number" && venue.googleRatingCount > 0 && (
              <span className="text-on-surface-variant font-normal">
                ({venue.googleRatingCount})
              </span>
            )}
          </p>
        ) : (
          <p className="font-label-sm text-label-sm text-on-surface-variant italic">Untried</p>
        )}
      </div>
    </Link>
  );
}

/**
 * Distance formatter: imperial, US-locale conventions.
 *   < 0.1 mi → "<0.1 mi"  (avoids the awkward "0.0 mi")
 *   < 10 mi  → one decimal ("0.3 mi", "1.2 mi", "9.4 mi")
 *   ≥ 10 mi  → whole number ("10 mi", "12 mi")
 */
function formatDistanceMiles(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) return "<0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}
