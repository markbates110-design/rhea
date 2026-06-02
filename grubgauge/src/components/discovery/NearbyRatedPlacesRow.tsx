"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  readCachedCoords,
  requestCurrentCoords,
} from "@/lib/places/geolocation";
import { reverseGeocodeCoords } from "@/lib/places/reverseGeocode";
import type { GeoCoords } from "@/lib/places/geolocation";
import { formatDistanceMiles } from "@/lib/places/distance";
import {
  aggregateRatedPlaces,
  sortPlacesNearViewer,
  type NearbyRatedPlace,
  type RatedPlaceRow,
} from "@/lib/ratings/nearbyPlaces";

type RowPhase =
  | "loading"
  | "needs-location"
  | "resolving-location"
  | "ready"
  | "empty";

const MAX_CARDS = 12;

/**
 * Dashboard discovery row powered by community ratings with meal photos.
 * Replaces the hand-curated FeaturedSpotsRow and the deleted Google-backed
 * NearbyVenuesRow — same horizontal carousel UX, zero Google API cost.
 *
 * When the viewer shares location, spots are sorted by haversine distance
 * (stored lat/lng on ratings). Legacy rows without coords fall back to
 * city/state match. Card tap → `/rate?placeId=…`.
 */
export function NearbyRatedPlacesRow() {
  const [phase, setPhase] = useState<RowPhase>("loading");
  const [places, setPlaces] = useState<NearbyRatedPlace[]>([]);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationError, setLocationError] = useState("");

  const loadPlaces = useCallback(
    async (
      viewerCoords: GeoCoords | null,
      viewerLocation: { city: string | null; state: string | null } | null,
    ) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ratings")
        .select(
          "place_id, venue_name, venue_address, city, state, latitude, longitude, weighted_score, meal_photo_url, created_at",
        )
        .not("meal_photo_url", "is", null)
        .not("place_id", "is", null);

      if (error) {
        console.error("Nearby rated places:", error.code, error.message);
        setPlaces([]);
        setPhase("empty");
        return;
      }

      const aggregated = aggregateRatedPlaces((data ?? []) as RatedPlaceRow[]);
      if (aggregated.length === 0) {
        setPlaces([]);
        setPhase("empty");
        return;
      }

      const sorted = sortPlacesNearViewer(
        aggregated,
        viewerCoords,
        viewerLocation,
      ).slice(0, MAX_CARDS);

      setPlaces(sorted);
      setPhase(sorted.length > 0 ? "ready" : "empty");
    },
    [],
  );

  const resolveViewerLocation = useCallback(async () => {
    setPhase("resolving-location");
    setLocationError("");
    try {
      const cached = readCachedCoords();
      const coords = cached ?? (await requestCurrentCoords());
      const geo = await reverseGeocodeCoords(coords);
      const label = [geo.city, geo.state].filter(Boolean).join(", ");
      setLocationLabel(label || null);
      await loadPlaces(coords, geo);
    } catch {
      setLocationError("Location unavailable — showing community-rated spots.");
      setLocationLabel(null);
      await loadPlaces(null, null);
    }
  }, [loadPlaces]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const cached = readCachedCoords();
      if (cached) {
        setPhase("resolving-location");
        try {
          const geo = await reverseGeocodeCoords(cached);
          if (cancelled) return;
          const label = [geo.city, geo.state].filter(Boolean).join(", ");
          setLocationLabel(label || null);
          await loadPlaces(cached, geo);
        } catch {
          if (!cancelled) await loadPlaces(cached, null);
        }
        return;
      }

      if (!cancelled) setPhase("needs-location");
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [loadPlaces]);

  const subtitle = useMemo(() => {
    if (locationLabel) return `Near ${locationLabel}`;
    if (phase === "needs-location") return "Share location for nearby spots";
    return "Community rated";
  }, [locationLabel, phase]);

  if (phase === "empty") return null;

  if (phase === "loading") {
    return (
      <section aria-labelledby="nearby-rated-heading" className="flex flex-col gap-sm">
        <div className="flex items-baseline justify-between">
          <h2
            id="nearby-rated-heading"
            className="font-title-sm text-title-sm font-bold text-on-surface"
          >
            Rated near you
          </h2>
        </div>
        <div className="flex items-center gap-xs py-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">
            progress_activity
          </span>
          <span className="font-label-sm text-label-sm">Loading rated spots…</span>
        </div>
      </section>
    );
  }

  if (phase === "needs-location") {
    return (
      <section aria-labelledby="nearby-rated-heading" className="flex flex-col gap-sm">
        <div className="flex items-baseline justify-between">
          <h2
            id="nearby-rated-heading"
            className="font-title-sm text-title-sm font-bold text-on-surface"
          >
            Rated near you
          </h2>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {subtitle}
          </span>
        </div>
        <div className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <p className="font-body-md text-body-md text-on-surface-variant">
            See spots the community has rated with photos in your area — no
            Google lookup, just GrubGauge ratings.
          </p>
          <div className="flex flex-wrap items-center gap-sm">
            <button
              type="button"
              onClick={() => void resolveViewerLocation()}
              className="inline-flex w-fit items-center gap-xs rounded-lg bg-primary-container px-md py-xs font-title-sm text-title-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                my_location
              </span>
              Use my location
            </button>
            <button
              type="button"
              onClick={() => void loadPlaces(null, null)}
              className="font-label-sm text-label-sm text-primary hover:underline"
            >
              Show community spots
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "resolving-location") {
    return (
      <section aria-labelledby="nearby-rated-heading" className="flex flex-col gap-sm">
        <div className="flex items-baseline justify-between">
          <h2
            id="nearby-rated-heading"
            className="font-title-sm text-title-sm font-bold text-on-surface"
          >
            Rated near you
          </h2>
        </div>
        <div className="flex items-center gap-xs py-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">
            progress_activity
          </span>
          <span className="font-label-sm text-label-sm">Finding spots near you…</span>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="nearby-rated-heading" className="flex flex-col gap-sm">
      <div className="flex items-baseline justify-between gap-sm">
        <h2
          id="nearby-rated-heading"
          className="font-title-sm text-title-sm font-bold text-on-surface"
        >
          Rated near you
        </h2>
        <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
          {subtitle}
        </span>
      </div>
      {locationError && (
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          {locationError}
        </p>
      )}
      <div
        className="flex snap-x snap-mandatory gap-sm overflow-x-auto pb-xs -mx-margin-edge px-margin-edge"
        style={{ scrollbarWidth: "thin" }}
      >
        {places.map((place) => (
          <NearbyRatedPlaceCard key={place.placeId} place={place} />
        ))}
      </div>
    </section>
  );
}

function NearbyRatedPlaceCard({ place }: { place: NearbyRatedPlace }) {
  const locationLine = place.distanceMiles
    ? formatDistanceMiles(place.distanceMiles)
    : [place.city, place.state].filter(Boolean).join(", ") ||
      place.venueAddress.split(",").slice(-2).join(",").trim();

  return (
    <Link
      href={`/rate?placeId=${encodeURIComponent(place.placeId)}`}
      className="relative flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low transition-colors hover:bg-surface-container active:scale-[0.98]"
      aria-label={`Rate ${place.venueName}, community average ${place.avgScore.toFixed(1)} out of 10${place.ratingCount > 1 ? `, ${place.ratingCount} ratings` : ""}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-container-high">
        {/* eslint-disable-next-line @next/next/no-img-element -- community meal photo from Storage */}
        <img
          src={place.photoUrl}
          alt={`Community meal photo at ${place.venueName}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {place.ratingCount > 1 && (
          <span className="absolute right-xs top-xs rounded-full bg-surface/90 px-xs py-0.5 font-label-sm text-label-sm font-semibold text-on-surface shadow-sm backdrop-blur-sm">
            {place.ratingCount} ratings
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
