"use client";

import Link from "next/link";
import { FEATURED_SPOTS, type FeaturedSpot } from "@/lib/places/featured";

/**
 * Dashboard discovery row. Replaced the deleted Google-backed
 * NearbyVenuesRow — same UX shape (horizontal scroll of tappable
 * venue cards above the user's stats), but powered by a hand-curated
 * static list with photos served from `public/featured/`. Zero per-
 * load cost, zero Google API touch.
 *
 * Card tap → `/rate?placeId=...` so the existing SpotSearch deep-link
 * auto-select fires and the rating form pre-fills exactly as it did
 * for the old carousel.
 *
 * Self-hides when `FEATURED_SPOTS` is empty so the dashboard doesn't
 * reserve dead vertical space before the curated list is populated.
 */
export function FeaturedSpotsRow() {
  if (FEATURED_SPOTS.length === 0) return null;

  return (
    <section
      aria-labelledby="featured-spots-heading"
      className="flex flex-col gap-sm"
    >
      <div className="flex items-baseline justify-between">
        <h2
          id="featured-spots-heading"
          className="font-title-sm text-title-sm font-bold text-on-surface"
        >
          Featured spots
        </h2>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Hand-picked
        </span>
      </div>

      <div
        className="flex snap-x snap-mandatory gap-sm overflow-x-auto pb-xs -mx-margin-edge px-margin-edge"
        style={{ scrollbarWidth: "thin" }}
      >
        {FEATURED_SPOTS.map((spot) => (
          <FeaturedSpotCard key={spot.placeId} spot={spot} />
        ))}
      </div>
    </section>
  );
}

function FeaturedSpotCard({ spot }: { spot: FeaturedSpot }) {
  return (
    <Link
      href={`/rate?placeId=${encodeURIComponent(spot.placeId)}`}
      className="flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low transition-colors hover:bg-surface-container active:scale-[0.98]"
      aria-label={`Rate ${spot.name}`}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-surface-container-high">
        {/* eslint-disable-next-line @next/next/no-img-element -- static curated photo from /public, served via Next.js CDN with no per-load API cost */}
        <img
          src={spot.photoSrc}
          alt={`Photo of ${spot.name}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-0.5 p-sm">
        <p className="line-clamp-1 font-title-sm text-title-sm font-semibold text-on-surface">
          {spot.name}
        </p>
        <p className="line-clamp-1 font-label-sm text-label-sm capitalize text-on-surface-variant">
          {spot.cuisine.replace(/-/g, " ")} · {spot.city}
        </p>
        {spot.blurb && (
          <p className="mt-xs line-clamp-2 font-label-sm text-label-sm italic text-on-surface-variant">
            {spot.blurb}
          </p>
        )}
      </div>
    </Link>
  );
}
