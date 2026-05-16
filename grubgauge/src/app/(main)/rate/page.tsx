"use client";

import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/identity/deviceId";
import {
  DEFAULT_SCORE,
  VENUE_CRITERIA,
  VENUE_META,
  calcWeightedScore,
  type VenueType,
} from "@/lib/ratings/scoring";
import { inferVenueType } from "@/lib/places/venueType";
import { googleTypesToCuisine, type Cuisine } from "@/lib/places/cuisine";
import { extractAddressComponents, type AddressComponentLike } from "@/lib/places/address";
import { uploadMealPhoto } from "@/lib/storage/mealPhoto";

// ── Types ──────────────────────────────────────────────────────────────────

interface SpotSelection {
  placeId: string;
  name: string;
  address: string;
  venueType: VenueType;
  /**
   * Derived metadata for SEO query patterns ("best [cuisine] in [city]",
   * "cheapest in [city]"). All extracted from the Google Place Details
   * response — no user input. Nullable where Google doesn't return
   * the field (neighborhood is most often missing; price_level is
   * absent for ~10-20% of restaurants).
   */
  cuisine: Cuisine;
  city: string | null;
  neighborhood: string | null;
  state: string | null;
  postal_code: string | null;
  price_level: number | null;
}

// Google Places types → VenueType mapping has been extracted to
// `lib/places/venueType.ts` so the dashboard's NearbyVenuesRow shares
// the same inference (and so we don't drift on which Google type strings
// belong in which bucket).

// ── Scoring ────────────────────────────────────────────────────────────────

function scoreBadge(score: number): { label: string; colorClass: string } {
  if (score >= 9.0) return { label: "Exceptional", colorClass: "text-primary" };
  if (score >= 7.5) return { label: "Great Value", colorClass: "text-primary" };
  if (score >= 6.0) return { label: "Good",        colorClass: "text-tertiary" };
  if (score >= 4.5) return { label: "Fair",        colorClass: "text-tertiary" };
  return                   { label: "Poor",        colorClass: "text-error" };
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Place Details capture ──────────────────────────────────────────────────

/**
 * Fields requested on every Place Details call. `address_components` is
 * free (Basic Data SKU, same bucket as name/types/formatted_address);
 * `price_level` is Atmosphere Data — billed separately at ~$5/1K, which
 * is negligible at MVP scale and is the source of truth for the SEO
 * "cheapest in [city]" query pattern.
 */
const PLACE_DETAILS_FIELDS: string[] = [
  "name",
  "formatted_address",
  "types",
  "place_id",
  "address_components",
  "price_level",
];

/**
 * Build the SpotSelection from a Google PlaceResult — single shared
 * shape so the autocomplete-select path and the deep-link auto-select
 * path can't drift on which fields they pull.
 */
function spotSelectionFromPlace(
  place: google.maps.places.PlaceResult,
  fallbackPlaceId: string,
  prediction?: google.maps.places.AutocompletePrediction,
): SpotSelection {
  const address = extractAddressComponents(
    (place.address_components as readonly AddressComponentLike[] | undefined) ?? null,
  );
  // Google's typing models `price_level` as `number | undefined`. Treat
  // the absent case as null so the column-NULL semantics line up with
  // "Google didn't tell us" rather than "this place is free."
  const rawPriceLevel = (place as { price_level?: number }).price_level;
  const priceLevel =
    typeof rawPriceLevel === "number" && rawPriceLevel >= 0 && rawPriceLevel <= 4
      ? rawPriceLevel
      : null;

  return {
    placeId: place.place_id ?? fallbackPlaceId,
    name: place.name ?? prediction?.structured_formatting.main_text ?? "",
    address:
      place.formatted_address ??
      prediction?.structured_formatting.secondary_text ??
      "",
    venueType: inferVenueType(place.types ?? []),
    cuisine: googleTypesToCuisine(place.types ?? []),
    city: address.city,
    neighborhood: address.neighborhood,
    state: address.state,
    postal_code: address.postal_code,
    price_level: priceLevel,
  };
}

// ── Spot Search ────────────────────────────────────────────────────────────

interface SpotSearchProps {
  onSelect: (s: SpotSelection) => void;
  /**
   * Optional Google place_id to auto-select on mount. Powers entry-point
   * deep-links like the dashboard "Near You" card → `/rate?placeId=...`.
   * Consumed exactly once via an internal ref guard so a re-render with
   * the same prop doesn't re-spend a Place Details call. The parent
   * additionally clears its own consumed-flag after the first onSelect
   * so a remount (e.g. user clicks "Change") doesn't re-auto-select the
   * same venue.
   */
  initialPlaceId?: string;
}

function SpotSearch({ onSelect, initialPlaceId }: SpotSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // One-shot guard so `initialPlaceId` is only ever consumed once, even
  // if the auto-select effect re-runs from a stable identity change in
  // the `onSelect` callback prop.
  const autoSelectFiredRef = useRef(false);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    autocompleteRef.current = new google.maps.places.AutocompleteService();
    if (mapDivRef.current) {
      placesRef.current = new google.maps.places.PlacesService(mapDivRef.current);
    }
  }, []);

  // Auto-select when entry-point wiring (?placeId on /rate) supplies a
  // venue. Runs after the placesRef init effect (effect declaration order
  // = run order in the same commit phase, so placesRef.current is already
  // set by the time this fires). Failures are silent — the user can still
  // search manually, and we never want a bad deep-link to UI-noise the
  // form that's about to be filled in.
  useEffect(() => {
    if (autoSelectFiredRef.current) return;
    if (!initialPlaceId) return;
    if (!placesRef.current) return;
    autoSelectFiredRef.current = true;
    placesRef.current.getDetails(
      {
        placeId: initialPlaceId,
        fields: PLACE_DETAILS_FIELDS,
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.place_id) {
          onSelect(spotSelectionFromPlace(place, place.place_id));
        }
      },
    );
  }, [initialPlaceId, onSelect]);

  const fetchSuggestions = useCallback((input: string) => {
    if (!input.trim() || input.length < 2) { setSuggestions([]); return; }
    if (!autocompleteRef.current) return;
    setLoading(true);
    setSearchError("");
    autocompleteRef.current.getPlacePredictions(
      { input, types: ["establishment"] },
      (predictions, status) => {
        setLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setSuggestions([]);
        } else {
          setSearchError(`Search error: ${status}`);
          setSuggestions([]);
        }
      }
    );
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, fetchSuggestions]);

  function handleSelect(prediction: google.maps.places.AutocompletePrediction) {
    setSuggestions([]);
    if (!placesRef.current) return;
    placesRef.current.getDetails(
      { placeId: prediction.place_id, fields: PLACE_DETAILS_FIELDS },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          onSelect(spotSelectionFromPlace(place, prediction.place_id, prediction));
        } else {
          // Place Details unavailable — degrade to autocomplete fields only.
          // SEO metadata is null; the rating still lands, just without the
          // structured location / cuisine / price_level. Operator can
          // backfill later via the scripts/backfill-ratings-metadata script.
          onSelect({
            placeId: prediction.place_id,
            name: prediction.structured_formatting.main_text,
            address: prediction.structured_formatting.secondary_text ?? "",
            venueType: "casual",
            cuisine: "other",
            city: null,
            neighborhood: null,
            state: null,
            postal_code: null,
            price_level: null,
          });
        }
      }
    );
  }

  return (
    <div className="relative">
      <div ref={mapDivRef} style={{ display: "none" }} />
      <div className="flex items-center gap-xs rounded-xl border border-outline-variant bg-surface-container px-sm py-xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-colors">
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">
          {loading ? "progress_activity" : "search"}
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a restaurant or spot…"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent font-body-md text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/50"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setSuggestions([]); }} className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {searchError && (
        <p className="mt-1 rounded-lg border border-error-container bg-error-container/20 px-sm py-xs font-label-sm text-label-sm text-error">
          {searchError}
        </p>
      )}

      {suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-high shadow-lg overflow-hidden">
          {suggestions.map((pred, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(pred)}
              className="flex w-full items-start gap-sm px-sm py-xs text-left hover:bg-surface-container-highest transition-colors border-b border-outline-variant/50 last:border-0"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant mt-0.5 shrink-0">
                restaurant
              </span>
              <div className="min-w-0">
                <p className="font-body-md text-body-md font-medium text-on-surface truncate">
                  {pred.structured_formatting.main_text}
                </p>
                {pred.structured_formatting.secondary_text && (
                  <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
                    {pred.structured_formatting.secondary_text}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rate Page ──────────────────────────────────────────────────────────────

/**
 * Default export is a thin Suspense wrapper around RatePageInner so the
 * `useSearchParams()` read inside (powering the `?placeId` deep-link
 * auto-select) doesn't break Next.js static prerender. Same shape used by
 * `/onboarding/signup` for the same reason.
 */
export default function RatePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full min-w-0 pb-10 pt-lg md:pt-xl">
          <div className="h-[420px]" aria-hidden />
        </main>
      }
    >
      <RatePageInner />
    </Suspense>
  );
}

function RatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState(false);

  const [spot, setSpot] = useState<SpotSelection | null>(null);
  // `?placeId=...` deep-link consumed exactly once: the URL value seeds
  // SpotSearch on first mount, then `consumedPlaceId` flips true so any
  // subsequent SpotSearch remount (e.g. user clicks "Change" → spot
  // toggles to null → key flips → fresh SpotSearch mounts) does NOT
  // re-trigger the auto-select against the stale URL value. The URL itself
  // is left as-is — clearing it via router.replace would compete with
  // browser-back semantics for no real benefit.
  const [consumedPlaceId, setConsumedPlaceId] = useState(false);
  const queryPlaceId = searchParams?.get("placeId") ?? null;
  const initialPlaceId = consumedPlaceId ? undefined : queryPlaceId ?? undefined;
  const [visitDate, setVisitDate] = useState(today());
  const [mealType, setMealType] = useState("dinner");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [mealPhotoFile, setMealPhotoFile] = useState<File | null>(null);
  const [mealPhotoPreviewUrl, setMealPhotoPreviewUrl] = useState<string | null>(null);
  const [submittedMealPhotoUrl, setSubmittedMealPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Load Google Maps / Places
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- imperative script loader + guarded status flags */
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) { setMapsError(true); return; }

    // Already fully loaded
    if (window.google?.maps?.places) { setMapsReady(true); return; }

    // Script tag already injected (still loading) — attach to its events
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      existing.addEventListener("load", () => setMapsReady(true));
      existing.addEventListener("error", () => setMapsError(true));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapsReady(true);
    script.onerror = () => setMapsError(true);
    document.head.appendChild(script);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const venueTypeKey = spot?.venueType;
  const criteria = useMemo(
    () => (venueTypeKey ? VENUE_CRITERIA[venueTypeKey] : []),
    [venueTypeKey]
  );
  const meta = spot ? VENUE_META[spot.venueType] : null;

  const weightedScore = useMemo(
    () => (spot ? calcWeightedScore(criteria, scores) : 0),
    [criteria, scores, spot]
  );

  const { label: badge, colorClass } = scoreBadge(weightedScore);

  function getScore(key: string) { return scores[key] ?? DEFAULT_SCORE; }
  function setScore(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  function clearMealPhoto() {
    setMealPhotoFile(null);
    setMealPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function handleSpotSelect(s: SpotSelection) {
    setSpot(s);
    setScores({});
    setError("");
    clearMealPhoto();
    // Mark the deep-link consumed so a later "Change" → SpotSearch remount
    // doesn't auto-select the original `?placeId` venue again. Safe to call
    // unconditionally — already-true is a no-op.
    setConsumedPlaceId(true);
  }

  function handleMealPhotoPick(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Photo must be JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be 5 MB or smaller.");
      return;
    }
    setError("");
    setMealPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setMealPhotoFile(file);
  }

  useEffect(() => {
    return () => {
      if (mealPhotoPreviewUrl) URL.revokeObjectURL(mealPhotoPreviewUrl);
    };
  }, [mealPhotoPreviewUrl]);

  async function handleSubmit() {
    if (!spot) { setError("Please select a spot first."); return; }
    setError("");
    setSubmitting(true);
    try {
      const supabase = createClient();
      const deviceId = getDeviceId();
      // Identity is additive: `device_id` is always written so guest rows
      // remain device-scoped; `user_id` is set when signed in so History /
      // Dashboard can scope by account across devices.
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id ?? null;
      let mealPhotoUrl: string | null = null;
      if (mealPhotoFile) {
        try {
          mealPhotoUrl = await uploadMealPhoto(supabase, mealPhotoFile, deviceId);
        } catch (uploadErr) {
          console.error(uploadErr);
          setError("Photo upload failed. Remove the photo or try a smaller image.");
          return;
        }
      }
      const criteriaScores = Object.fromEntries(criteria.map((c) => [c.key, getScore(c.key)]));
      await supabase.from("ratings").insert({
        place_id: spot.placeId,
        venue_name: spot.name,
        venue_address: spot.address,
        venue_type: spot.venueType,
        meal_type: mealType,
        visit_date: visitDate,
        criteria_scores: criteriaScores,
        weighted_score: parseFloat(weightedScore.toFixed(1)),
        notes: notes.trim() || null,
        meal_photo_url: mealPhotoUrl,
        device_id: deviceId,
        user_id: userId,
        // Derived metadata that powers the SEO "best [cuisine] in [city]" /
        // "cheapest in [city]" query patterns + future auto-generated
        // public pages. All nullable upstream — null is legitimate
        // ("Google didn't return it") not error.
        cuisine: spot.cuisine,
        city: spot.city,
        neighborhood: spot.neighborhood,
        state: spot.state,
        postal_code: spot.postal_code,
        price_level: spot.price_level,
      });
      setSubmittedMealPhotoUrl(mealPhotoUrl);
      clearMealPhoto();
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Could not save. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFeedback(skip = false) {
    if (!skip && feedback.trim()) {
      try {
        const supabase = createClient();
        await supabase.from("feedback").insert({
          device_id: getDeviceId(),
          place_id: spot?.placeId ?? null,
          message: feedback.trim(),
        });
      } catch {
        // feedback is best-effort — never block navigation
      }
    }
    setFeedbackSent(true);
    router.push("/history");
  }

  // ── Success ──────────────────────────────────────────────────────────────

  if (submitted && spot) {
    return (
      <main className="mx-auto min-w-0 w-full max-w-2xl pt-lg pb-10">
        {/* Score confirmation */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container/20">
            <span className="material-symbols-outlined text-[48px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          {submittedMealPhotoUrl && (
            <div className="mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-outline-variant shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase CDN URL */}
              <img
                src={submittedMealPhotoUrl}
                alt={`Food at ${spot.name}`}
                className="aspect-[4/3] w-full max-h-[220px] object-cover"
              />
            </div>
          )}
          <div>
            <p className="font-title-sm text-title-sm text-on-surface">{spot.name}</p>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">Rating logged successfully.</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display-lg text-[64px] leading-none tabular-nums text-primary">{weightedScore.toFixed(1)}</span>
            <span className="font-headline-md text-headline-md text-on-surface-variant">/10</span>
          </div>
        </div>

        {/* Feedback prompt */}
        <div className="w-full min-w-0 rounded-xl border border-outline-variant bg-surface-container-low p-md">
          <p className="mb-1 font-title-sm text-title-sm text-on-surface">Anything we should add or improve?</p>
          <p className="mb-3 font-body-md text-body-md text-on-surface-variant">Optional — takes 10 seconds.</p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share a thought…"
            rows={3}
            className="mb-3 block w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-sm py-xs font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="flex gap-sm">
            <button
              onClick={() => handleFeedback(false)}
              disabled={feedbackSent}
              className="flex-1 rounded-xl bg-primary px-md py-sm font-label-sm text-label-sm text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
            <button
              onClick={() => handleFeedback(true)}
              disabled={feedbackSent}
              className="rounded-xl border border-outline-variant px-md py-sm font-label-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────

  return (
    <main className="mx-auto w-full min-w-0 pb-10 pt-lg md:pt-xl">
      <div className="flex flex-col gap-lg lg:flex-row lg:items-start lg:gap-xl">

        {/* ── Left: Form ── */}
        <div className="flex min-w-0 flex-1 flex-col gap-md">

          {/* Title */}
          <div>
            <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">Rate a Spot</h1>
            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
              Find your spot — we&apos;ll load the right scoring criteria automatically.
            </p>
          </div>

          {/* Spot search */}
          <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <h2 className="flex items-center gap-xs font-title-sm text-title-sm text-primary">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                location_on
              </span>
              Find a Spot
            </h2>

            {mapsError && (
              <p className="rounded-lg border border-error-container bg-error-container/20 px-sm py-xs font-label-sm text-label-sm text-error">
                Google Places could not be loaded. Check your API key.
              </p>
            )}

            {mapsReady ? (
              // `key` resets all internal SpotSearch state (query, suggestions,
              // Places service refs, debounce timer) when the user clicks
              // "Change" on the selected-spot chip. Guarantees a clean search
              // surface — no stale dropdown can overlay the chip area.
              // `initialPlaceId` is gated on `consumedPlaceId` (parent state) so
              // a remount triggered by Change doesn't re-auto-select the URL
              // deep-link value.
              <SpotSearch
                key={spot ? "selected" : "empty"}
                onSelect={handleSpotSelect}
                initialPlaceId={spot ? undefined : initialPlaceId}
              />
            ) : !mapsError ? (
              <div className="flex items-center gap-xs text-on-surface-variant font-body-md text-body-md">
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Loading search…
              </div>
            ) : null}

            {/* Selected spot chip */}
            {spot && (
              <div className="flex items-start justify-between gap-sm rounded-xl border border-primary/30 bg-primary/5 px-sm py-xs mt-1">
                <div className="flex items-start gap-xs min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {meta?.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-body-md text-body-md font-medium text-on-surface truncate">{spot.name}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{spot.address}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-base shrink-0">
                  <span className="inline-flex items-center gap-xs rounded-full bg-primary-container px-xs py-0.5 font-label-sm text-label-sm font-bold text-on-primary-container whitespace-nowrap">
                    {meta?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSpot(null);
                      setScores({});
                      setError("");
                      clearMealPhoto();
                    }}
                    className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Visit details */}
          <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <h2 className="flex items-center gap-xs font-title-sm text-title-sm text-primary">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
              Visit Details
            </h2>
            <div className="grid grid-cols-2 gap-md">
              <div className="flex flex-col gap-base">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Date of Visit</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="rounded-lg border border-outline-variant bg-surface-container px-sm py-xs font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
                />
              </div>
              <div className="flex flex-col gap-base">
                <label className="font-label-sm text-label-sm text-on-surface-variant">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="appearance-none rounded-lg border border-outline-variant bg-surface-container px-sm py-xs font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {["Dinner", "Lunch", "Breakfast", "Brunch"].map((m) => (
                    <option key={m} value={m.toLowerCase()}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Dynamic criteria — only shown once a spot is selected */}
          {spot && criteria.length > 0 && (
            <section className="flex flex-col gap-lg rounded-xl border border-outline-variant bg-surface-container-low p-md">
              <div>
                <h2 className="flex items-center gap-xs font-title-sm text-title-sm text-primary">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>tune</span>
                  {meta?.label} — Value Metrics
                </h2>
                <p className="mt-base font-label-sm text-label-sm text-on-surface-variant italic">{meta?.tagline}</p>
              </div>
              <div className="flex flex-col gap-md">
                {criteria.map((c) => (
                  <div key={c.key} className="flex flex-col gap-base">
                    <div className="flex items-center justify-between">
                      <label className="font-body-md text-body-md font-medium text-on-surface">{c.label}</label>
                      <span className="tabular-nums font-title-sm text-title-sm text-primary-container">
                        {getScore(c.key).toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.1}
                      value={getScore(c.key)}
                      onChange={(e) => setScore(c.key, parseFloat(e.target.value))}
                      className="grub-slider w-full"
                    />
                    <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                      <span>{c.low}</span>
                      <span>{c.high}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          <section className="flex flex-col gap-xs rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <label className="font-label-sm text-label-sm text-on-surface-variant">
              What did you eat? <span className="text-on-surface-variant/50">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note standout dishes, what to order next time, or anything memorable…"
              rows={3}
              className="resize-none rounded-lg border border-outline-variant bg-surface-container px-sm py-xs font-body-md text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/50 transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </section>

          {/* Meal photo */}
          <section className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <h2 className="flex items-center gap-xs font-title-sm text-title-sm text-primary">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                photo_camera
              </span>
              Food photo
              <span className="font-body-md text-body-md font-normal text-on-surface-variant">(optional)</span>
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Add a snapshot of what you ate — shown in your history and explore.
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              id="meal-photo-input"
              disabled={submitting}
              onChange={(e) => {
                handleMealPhotoPick(e.target.files);
                e.target.value = "";
              }}
            />
            {!mealPhotoPreviewUrl ? (
              <label
                htmlFor="meal-photo-input"
                className={`inline-flex w-fit cursor-pointer items-center gap-xs rounded-xl border border-outline-variant bg-surface-container px-md py-xs font-label-sm text-label-sm text-on-surface transition-colors hover:border-primary hover:bg-surface-container-high ${submitting ? "pointer-events-none opacity-40" : ""}`}
              >
                <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                Choose photo
              </label>
            ) : (
              <div className="flex flex-col gap-sm">
                <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded URLs from Supabase vary per deployment */}
                  <img
                    src={mealPhotoPreviewUrl}
                    alt="Selected meal preview"
                    className="aspect-[4/3] w-full object-cover max-h-[220px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => clearMealPhoto()}
                  disabled={submitting}
                  className="w-fit rounded-lg border border-outline-variant px-sm py-xs font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
                >
                  Remove photo
                </button>
              </div>
            )}
          </section>

          {/* Mobile submit */}
          <div className="flex flex-col gap-xs lg:hidden">
            {error && (
              <p className="rounded-lg border border-error-container bg-error-container/20 px-sm py-xs font-label-sm text-label-sm text-error">{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || !spot}
              className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary-container py-sm font-title-sm text-title-sm font-bold text-on-primary-container transition-all duration-150 hover:bg-primary-fixed active:scale-95 disabled:opacity-40"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {submitting ? "hourglass_top" : "check_circle"}
              </span>
              {submitting ? "Saving…" : "Log Rating"}
            </button>
          </div>
        </div>

        {/* ── Right: Live score + desktop submit ── */}
        <div className="hidden w-full flex-col gap-md self-start lg:flex lg:w-[360px] lg:max-w-full lg:shrink-0 lg:sticky lg:top-24">
          <div className="relative flex flex-col items-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-high p-xl text-center shadow-lg">
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <p className="relative z-10 mb-xs font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
              Weighted Value Score
            </p>
            <div className="relative z-10 my-sm flex items-baseline gap-0.5">
              <span className="font-display-lg text-[72px] leading-none tabular-nums text-primary transition-all duration-300">
                {spot ? weightedScore.toFixed(1) : "—"}
              </span>
              {spot && <span className="font-headline-md text-headline-md text-on-surface-variant">/10</span>}
            </div>
            {spot ? (
              <div className="relative z-10 inline-flex items-center gap-xs rounded-full bg-surface-variant px-sm py-1 font-label-sm text-label-sm text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className={colorClass}>{badge}</span>
              </div>
            ) : (
              <p className="relative z-10 font-label-sm text-label-sm text-on-surface-variant">Select a spot to begin</p>
            )}
            {spot && meta && (
              <div className="relative z-10 mt-sm flex items-center gap-xs rounded-lg bg-surface-container px-sm py-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">{meta.icon}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{meta.label}</span>
              </div>
            )}
          </div>

          {/* Criteria weight breakdown */}
          {spot && criteria.length > 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md flex flex-col gap-xs">
              <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-xs">Score Breakdown</p>
              {criteria.map((c) => (
                  <div key={c.key} className="flex items-center gap-xs">
                    <span className="font-label-sm text-label-sm text-on-surface-variant w-32 truncate shrink-0">{c.label}</span>
                    <div className="flex-1 h-1 bg-surface-variant rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${getScore(c.key) * 10}%` }}
                      />
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant tabular-nums w-8 text-right shrink-0">
                      {getScore(c.key).toFixed(1)}
                    </span>
                  </div>
              ))}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-error-container bg-error-container/20 px-sm py-xs font-label-sm text-label-sm text-error">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !spot}
            className="flex w-full items-center justify-center gap-xs rounded-lg bg-primary-container py-sm font-title-sm text-title-sm font-bold text-on-primary-container transition-all duration-150 hover:bg-primary-fixed active:scale-95 disabled:opacity-40"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              {submitting ? "hourglass_top" : "check_circle"}
            </span>
            {submitting ? "Saving…" : "Log Rating"}
          </button>
        </div>
      </div>
    </main>
  );
}
