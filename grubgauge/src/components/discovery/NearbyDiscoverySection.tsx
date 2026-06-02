"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth/useAuth";
import { FOLLOW_CHANGED_EVENT, getFollowingIds } from "@/lib/follows/follows";
import { getRatersByUserIds } from "@/lib/profile/raters";
import { useViewerLocation } from "@/lib/places/useViewerLocation";
import {
  aggregateFollowedRatedPlaces,
  aggregateRatedPlaces,
  sortPlacesNearViewer,
  type FollowedRatedPlaceRow,
  type NearbyRatedPlace,
  type RatedPlaceRow,
} from "@/lib/ratings/nearbyPlaces";
import { NearbyRatedPlaceCard } from "./NearbyRatedPlaceCard";

const MAX_CARDS = 12;
const RATING_SELECT =
  "place_id, venue_name, venue_address, city, state, latitude, longitude, weighted_score, meal_photo_url, created_at";

/**
 * Dashboard discovery: followed raters near you (when signed in) plus
 * the broader community carousel. Shares one geolocation prompt.
 */
export function NearbyDiscoverySection() {
  const { user, loading: authLoading } = useAuth();
  const location = useViewerLocation();
  const [followedPlaces, setFollowedPlaces] = useState<NearbyRatedPlace[]>(
    [],
  );
  const [communityPlaces, setCommunityPlaces] = useState<NearbyRatedPlace[]>(
    [],
  );
  const [followedLoading, setFollowedLoading] = useState(false);
  const [communityLoading, setCommunityLoading] = useState(false);

  const viewerLocation = useMemo(
    () =>
      location.city || location.state
        ? { city: location.city, state: location.state }
        : null,
    [location.city, location.state],
  );

  const loadCommunityPlaces = useCallback(async () => {
    setCommunityLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ratings")
        .select(RATING_SELECT)
        .not("meal_photo_url", "is", null)
        .not("place_id", "is", null);

      if (error) {
        console.error("Community nearby places:", error.code, error.message);
        setCommunityPlaces([]);
        return;
      }

      const aggregated = aggregateRatedPlaces((data ?? []) as RatedPlaceRow[]);
      const sorted = sortPlacesNearViewer(
        aggregated,
        location.coords,
        viewerLocation,
      ).slice(0, MAX_CARDS);
      setCommunityPlaces(sorted);
    } finally {
      setCommunityLoading(false);
    }
  }, [location.coords, viewerLocation]);

  const loadFollowedPlaces = useCallback(async () => {
    if (!user) {
      setFollowedPlaces([]);
      return;
    }

    setFollowedLoading(true);
    try {
      const supabase = createClient();
      const followeeIds = await getFollowingIds(supabase, user.id);
      if (followeeIds.length === 0) {
        setFollowedPlaces([]);
        return;
      }

      const { data, error } = await supabase
        .from("ratings")
        .select(`${RATING_SELECT}, user_id`)
        .in("user_id", followeeIds)
        .not("meal_photo_url", "is", null)
        .not("place_id", "is", null);

      if (error) {
        console.error("Followed nearby places:", error.code, error.message);
        setFollowedPlaces([]);
        return;
      }

      const aggregated = aggregateFollowedRatedPlaces(
        (data ?? []) as FollowedRatedPlaceRow[],
      );
      const sortedWithLead = sortPlacesNearViewer(
        aggregated,
        location.coords,
        viewerLocation,
      ).slice(0, MAX_CARDS) as Array<
        NearbyRatedPlace & { leadRaterUserId: string | null }
      >;

      const raterIdsFromSorted = sortedWithLead
        .map((place) => place.leadRaterUserId)
        .filter((id): id is string => Boolean(id));
      const raters = await getRatersByUserIds(supabase, raterIdsFromSorted);

      setFollowedPlaces(
        sortedWithLead.map(({ leadRaterUserId, ...place }) => ({
          ...place,
          followedRaterUsername: leadRaterUserId
            ? raters.get(leadRaterUserId)?.username ?? null
            : null,
        })),
      );
    } finally {
      setFollowedLoading(false);
    }
  }, [location.coords, user, viewerLocation]);

  useEffect(() => {
    if (location.phase !== "ready") return;
    void loadCommunityPlaces();
  }, [location.phase, loadCommunityPlaces]);

  useEffect(() => {
    if (authLoading || location.phase !== "ready") return;
    void loadFollowedPlaces();
  }, [authLoading, location.phase, loadFollowedPlaces]);

  useEffect(() => {
    if (!user) return;

    function onFollowChanged() {
      void loadFollowedPlaces();
    }

    window.addEventListener(FOLLOW_CHANGED_EVENT, onFollowChanged);
    return () => {
      window.removeEventListener(FOLLOW_CHANGED_EVENT, onFollowChanged);
    };
  }, [user, loadFollowedPlaces]);

  const subtitle = useMemo(() => {
    if (location.label) return `Near ${location.label}`;
    if (location.phase === "needs-location") {
      return "Share location for nearby spots";
    }
    return "Community rated";
  }, [location.label, location.phase]);

  const showFollowed = followedPlaces.length > 0;
  const showCommunity = communityPlaces.length > 0;
  const isLoading =
    location.phase === "loading" ||
    location.phase === "resolving-location" ||
    communityLoading ||
    (user && followedLoading);

  if (
    location.phase === "ready" &&
    !communityLoading &&
    (!user || !followedLoading) &&
    !showFollowed &&
    !showCommunity
  ) {
    return null;
  }

  if (location.phase === "loading" || location.phase === "resolving-location") {
    return (
      <DiscoveryShell subtitle={null}>
        <div className="flex items-center gap-xs py-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">
            progress_activity
          </span>
          <span className="font-label-sm text-label-sm">
            Finding spots near you…
          </span>
        </div>
      </DiscoveryShell>
    );
  }

  if (location.phase === "needs-location") {
    return (
      <DiscoveryShell subtitle={subtitle}>
        <div className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <p className="font-body-md text-body-md text-on-surface-variant">
            See spots rated with photos in your area — from people you follow
            and the wider community.
          </p>
          <div className="flex flex-wrap items-center gap-sm">
            <button
              type="button"
              onClick={() => void location.resolveLocation()}
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
              onClick={() => void location.skipLocation()}
              className="font-label-sm text-label-sm text-primary hover:underline"
            >
              Show community spots
            </button>
          </div>
        </div>
      </DiscoveryShell>
    );
  }

  if (isLoading && !showFollowed && !showCommunity) {
    return (
      <DiscoveryShell subtitle={subtitle}>
        <div className="flex items-center gap-xs py-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">
            progress_activity
          </span>
          <span className="font-label-sm text-label-sm">Loading rated spots…</span>
        </div>
      </DiscoveryShell>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      {location.error && (
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          {location.error}
        </p>
      )}

      {showFollowed && (
        <CarouselSection
          headingId="followed-nearby-heading"
          title="From people you follow"
          subtitle={subtitle}
        >
          {followedPlaces.map((place) => (
            <NearbyRatedPlaceCard
              key={place.placeId}
              place={place}
              socialBadge={followSocialBadge(place)}
            />
          ))}
        </CarouselSection>
      )}

      {showCommunity && (
        <CarouselSection
          headingId="community-nearby-heading"
          title={showFollowed ? "More rated near you" : "Rated near you"}
          subtitle={showFollowed ? subtitle : subtitle}
        >
          {communityPlaces.map((place) => (
            <NearbyRatedPlaceCard key={place.placeId} place={place} />
          ))}
        </CarouselSection>
      )}
    </div>
  );
}

function followSocialBadge(place: NearbyRatedPlace): string {
  const count = place.followedRaterCount ?? 0;
  if (count > 1) return `${count} you follow`;
  if (place.followedRaterUsername) {
    return `From @${place.followedRaterUsername}`;
  }
  return "Following";
}

function DiscoveryShell({
  subtitle,
  children,
}: {
  subtitle: string | null;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="nearby-rated-heading" className="flex flex-col gap-sm">
      <div className="flex items-baseline justify-between gap-sm">
        <h2
          id="nearby-rated-heading"
          className="font-title-sm text-title-sm font-bold text-on-surface"
        >
          Rated near you
        </h2>
        {subtitle && (
          <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function CarouselSection({
  headingId,
  title,
  subtitle,
  children,
}: {
  headingId: string;
  title: string;
  subtitle: string | null;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-sm">
      <div className="flex items-baseline justify-between gap-sm">
        <h2
          id={headingId}
          className="font-title-sm text-title-sm font-bold text-on-surface"
        >
          {title}
        </h2>
        {subtitle && (
          <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
            {subtitle}
          </span>
        )}
      </div>
      <div
        className="flex snap-x snap-mandatory gap-sm overflow-x-auto pb-xs -mx-margin-edge px-margin-edge"
        style={{ scrollbarWidth: "thin" }}
      >
        {children}
      </div>
    </section>
  );
}

/** @deprecated Use NearbyDiscoverySection */
export function NearbyRatedPlacesRow() {
  return <NearbyDiscoverySection />;
}
