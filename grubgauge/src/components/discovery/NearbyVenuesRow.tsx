"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyRatingsOwnerScope } from "@/lib/ratings/scope";
import { getDeviceId } from "@/lib/identity/deviceId";
import {
  getCachedCoords,
  getPermissionState,
  requestCoords,
  type Coords,
} from "@/lib/places/geolocation";
import {
  getNearbyVenues,
  readCachedNearbyVenues,
  type NearbyVenue,
} from "@/lib/places/nearby";
import { NearbyVenueCard } from "./NearbyVenueCard";

/**
 * Dashboard "Near You" carousel — venue discovery row.
 *
 * State machine (discriminated union per the codebase's UI-state
 * discipline; e.g. likes' ToggleLikeResult):
 *   - probing            initial; permission/cache probe in flight; renders null
 *   - needsPermission    permission state is `prompt`; renders inline "Allow" card
 *   - fetching           skeleton row; granted but no cached results yet
 *   - results            carousel of N filtered venue cards
 *   - empty              granted, but Google returned 0 even at widest radius
 *   - error              network/Places error; renders retry affordance
 *   - hidden             permission denied or unsupported; renders nothing
 *
 * Cost discipline (matters at the photo SKU's 1,000-free-events/month cap):
 *   - venues capped at VENUE_LIMIT (8)
 *   - photos lazy-loaded by NearbyVenueCard (`loading="lazy"` on <img>),
 *     so only the visible 2-3 cards trigger billable photo fetches at
 *     first paint
 *   - Nearby Search cached for 30 min by lat/lng grid (via lib/places/nearby)
 *   - coords cached for 10 min in sessionStorage (via lib/places/geolocation)
 *
 * Permission discipline:
 *   - the OS-level prompt fires ONLY on user tap of "Allow", never on
 *     mount — Safari may silently deny if a prompt fires too quickly
 *     after page load, and surprise prompts are bad UX regardless
 *   - on `denied` we hide the section entirely and never re-prompt; a
 *     future `/profile` re-enable affordance is the recovery path (V1.1)
 */

type State =
  | { kind: "probing" }
  | { kind: "needsPermission" }
  | { kind: "fetching" }
  | { kind: "results"; venues: NearbyVenue[] }
  | { kind: "empty" }
  | { kind: "error" }
  | { kind: "hidden" };

const VENUE_LIMIT = 8;

/**
 * Fetches nearby venues at `coords` and filters out any whose `place_id`
 * the current user (or guest device) has already rated. Uses the same
 * `applyRatingsOwnerScope` helper as History/Dashboard so signed-in
 * users filter on `user_id` and guests on `device_id` — identical
 * semantics, no special casing.
 *
 * Fails open: if the Supabase filter query errors, return the unfiltered
 * venue list. Showing "places you've been" is mildly worse UX than
 * showing nothing; this is not a security boundary.
 */
async function loadNearbyAndFilter(coords: Coords): Promise<NearbyVenue[]> {
  const venues = await getNearbyVenues(coords, { limit: VENUE_LIMIT });
  if (venues.length === 0) return [];

  const supabase = createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;
  const deviceId = getDeviceId();
  const placeIds = venues.map((v) => v.placeId);

  const baseQuery = supabase
    .from("ratings")
    .select("place_id")
    .in("place_id", placeIds);
  const { data, error } = await applyRatingsOwnerScope(baseQuery, { user, deviceId });
  if (error || !data) return venues;

  const ratedSet = new Set(data.map((r) => r.place_id as string));
  return venues.filter((v) => !ratedSet.has(v.placeId));
}

export function NearbyVenuesRow() {
  const [state, setState] = useState<State>({ kind: "probing" });

  // Probe permission + initial load on mount. Single effect, single
  // cancellation guard — every state-transition write is gated on
  // !cancelled so a quick unmount doesn't write to a stale instance.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const perm = await getPermissionState();
      if (cancelled) return;
      if (perm === "denied" || perm === "unsupported") {
        setState({ kind: "hidden" });
        return;
      }
      if (perm === "prompt") {
        setState({ kind: "needsPermission" });
        return;
      }

      // perm === "granted": prefer warm caches so signed-in returning
      // users don't even flash a skeleton. The fast-path requires both
      // coords AND nearby results in cache.
      const cachedCoords = getCachedCoords();
      const cachedResults = cachedCoords ? readCachedNearbyVenues(cachedCoords) : null;
      if (cachedCoords && cachedResults && cachedResults.length > 0) {
        try {
          // Still run loadNearbyAndFilter — it'll re-read the same cache
          // for the venue list (cheap) but applies the up-to-date
          // already-rated filter against Supabase.
          const venues = await loadNearbyAndFilter(cachedCoords);
          if (cancelled) return;
          setState(venues.length === 0 ? { kind: "empty" } : { kind: "results", venues });
        } catch {
          if (cancelled) return;
          setState({ kind: "error" });
        }
        return;
      }

      // Note: `setState({ kind: "fetching" })` here lives inside the
      // nested async `init()` rather than the effect body itself, so
      // the react-hooks/set-state-in-effect rule (which fires on
      // setState calls in the effect's direct lexical scope) doesn't
      // apply. Tested empirically by trying to disable the rule and
      // getting an "unused directive" warning back.
      setState({ kind: "fetching" });
      try {
        const coords = cachedCoords ?? (await requestCoords());
        if (cancelled) return;
        const venues = await loadNearbyAndFilter(coords);
        if (cancelled) return;
        setState(venues.length === 0 ? { kind: "empty" } : { kind: "results", venues });
      } catch {
        if (cancelled) return;
        setState({ kind: "error" });
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAllow = useCallback(async () => {
    setState({ kind: "fetching" });
    try {
      const coords = await requestCoords();
      const venues = await loadNearbyAndFilter(coords);
      setState(venues.length === 0 ? { kind: "empty" } : { kind: "results", venues });
    } catch {
      // User denied at the prompt OR the geolocation/Places fetch failed.
      // Either way, hide the section — never re-prompt automatically.
      setState({ kind: "hidden" });
    }
  }, []);

  // Hide the section entirely for these terminal states. probing is
  // brief (<1 frame typically) and rendering null avoids a header-only
  // flash before the prompt card resolves.
  if (state.kind === "hidden" || state.kind === "empty" || state.kind === "probing") {
    return null;
  }

  return (
    <section aria-label="Restaurants near you" className="flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Near You</h2>
      </div>

      {state.kind === "needsPermission" && (
        <div className="flex items-center justify-between gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <div className="flex items-start gap-sm min-w-0">
            <span
              className="material-symbols-outlined text-[22px] text-primary mt-0.5 shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              location_on
            </span>
            <div className="min-w-0">
              <p className="font-title-sm text-title-sm font-semibold text-on-surface">
                See spots near you
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Tap to allow location access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAllow}
            className="shrink-0 rounded-lg bg-primary-container px-md py-xs font-label-sm text-label-sm font-bold text-on-primary-container transition-colors hover:bg-primary-fixed active:scale-95"
          >
            Allow
          </button>
        </div>
      )}

      {state.kind === "fetching" && <SkeletonRow />}

      {state.kind === "results" && (
        <>
          <div
            role="list"
            className="flex overflow-x-auto snap-x snap-mandatory gap-sm pb-xs"
          >
            {state.venues.map((v) => (
              <div role="listitem" key={v.placeId}>
                <NearbyVenueCard venue={v} />
              </div>
            ))}
            {/* Trailing spacer so the last card can scroll fully into view */}
            <div aria-hidden className="shrink-0 w-1" />
          </div>
          <p className="self-end font-label-sm text-label-sm text-on-surface-variant">
            Photos via Google
          </p>
        </>
      )}

      {state.kind === "error" && (
        <div className="flex items-center justify-between gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Couldn&apos;t load nearby spots.
          </p>
          <button
            type="button"
            onClick={handleAllow}
            className="shrink-0 rounded-lg border border-outline-variant px-sm py-xs font-label-sm text-label-sm text-on-surface hover:bg-surface-container transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </section>
  );
}

function SkeletonRow() {
  // Five placeholder cards — layout matches NearbyVenueCard so the swap
  // to real results doesn't shift heights. `overflow-x-hidden` (rather
  // than `auto`) keeps the skeleton from being scrollable while loading.
  return (
    <div aria-hidden className="flex overflow-x-hidden gap-sm pb-xs">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex shrink-0 w-[152px] flex-col rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden"
        >
          <div className="h-[152px] w-[152px] bg-surface-container animate-pulse" />
          <div className="flex flex-col gap-base p-sm">
            <div className="h-3 w-3/4 rounded bg-surface-container animate-pulse" />
            <div className="h-2 w-1/2 rounded bg-surface-container animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
