"use client";

import Link from "next/link";
import {
  formatDistanceMiles,
} from "@/lib/places/distance";
import type { NearbyRatedPlace } from "@/lib/ratings/nearbyPlaces";

interface NearbyRatedPlaceCardProps {
  place: NearbyRatedPlace;
  /** e.g. "From @maya" or "2 you follow" — shown instead of rating count. */
  socialBadge?: string | null;
}

export function NearbyRatedPlaceCard({ place, socialBadge }: NearbyRatedPlaceCardProps) {
  const locationLine = buildLocationLine(place);

  const countBadge =
    socialBadge ??
    (place.ratingCount > 1 ? `${place.ratingCount} ratings` : null);

  return (
    <Link
      href={`/rate?placeId=${encodeURIComponent(place.placeId)}`}
      className="relative flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low transition-colors hover:bg-surface-container active:scale-[0.98]"
      aria-label={buildAriaLabel(place, socialBadge)}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container-high">
        {/* eslint-disable-next-line @next/next/no-img-element -- community meal photo from Storage */}
        <img
          src={place.photoUrl}
          alt={`Meal photo at ${place.venueName}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {countBadge && (
          <span className="absolute right-xs top-xs max-w-[calc(100%-3rem)] truncate rounded-full bg-surface/90 px-xs py-0.5 font-label-sm text-label-sm font-semibold text-on-surface shadow-sm backdrop-blur-sm">
            {countBadge}
          </span>
        )}
        <span className="absolute bottom-xs left-xs rounded-md bg-surface/90 px-xs py-0.5 font-label-sm text-label-sm font-bold tabular-nums text-primary shadow-sm backdrop-blur-sm">
          {place.avgScore.toFixed(1)}/10
        </span>
      </div>
      <div className="flex flex-col gap-0.5 p-sm">
        <p className="line-clamp-1 font-title-sm text-title-sm font-semibold text-on-surface">
          {place.venueName}
        </p>
        {locationLine && (
          <p className="line-clamp-1 font-label-sm text-label-sm text-on-surface-variant">
            {locationLine}
          </p>
        )}
      </div>
    </Link>
  );
}

function buildLocationLine(place: NearbyRatedPlace): string {
  const distance = place.distanceMiles
    ? formatDistanceMiles(place.distanceMiles)
    : null;
  const cityState =
    [place.city, place.state].filter(Boolean).join(", ") ||
    place.venueAddress.split(",").slice(-2).join(",").trim();

  if (place.followedRaterUsername && distance) {
    return `@${place.followedRaterUsername} · ${distance}`;
  }
  if (place.followedRaterUsername) {
    return `@${place.followedRaterUsername}`;
  }
  if (distance) return distance;
  return cityState;
}

function buildAriaLabel(place: NearbyRatedPlace, socialBadge?: string | null): string {
  const base = `Rate ${place.venueName}, ${place.avgScore.toFixed(1)} out of 10`;
  if (socialBadge) return `${base}, ${socialBadge}`;
  if (place.ratingCount > 1) return `${base}, ${place.ratingCount} ratings`;
  return base;
}
