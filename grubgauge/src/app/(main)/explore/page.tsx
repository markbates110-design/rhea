"use client";

// Note: the rating card is now extracted into `<RatingCard>` and shared
// between this Explore feed and `/u/[username]`. History and Dashboard
// still render their own inline cards — those have different shapes
// (History adds an edit affordance; Dashboard has a "Top Rated" callout
// variant), so they're left in place until those surfaces converge or
// get their own card variants.

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getRatingsLikeCounts, getUserLikedRatings } from "@/lib/ratings/likes";
import { attachRaters, type RaterFields } from "@/lib/profile/raters";
import { RatingCard } from "@/components/ratings/RatingCard";
// FeedRatingCard wraps RatingCard with a Follow control in the like row
// (member → live Follow / Following toggle, guest → FollowGateSheet,
// self → no control). Explore feed shows ratings from anyone; the
// Follow control closes the "discovered a great rater" loop without
// forcing a detour through /u/[username].
import { FeedRatingCard } from "@/components/follows/FeedRatingCard";

// ── Types ──────────────────────────────────────────────────────────────────

type VenueType = "fast-food" | "casual" | "fine" | "food-truck" | "all";

interface Rating {
  id: string;
  place_id: string;
  venue_name: string;
  venue_address: string;
  venue_type: string;
  meal_type: string;
  visit_date: string;
  weighted_score: number;
  notes: string | null;
  meal_photo_url: string | null;
  user_id: string | null;
  // Hydrated via `attachRaters` after the ratings query lands. `null` for
  // guest ratings (user_id is null) and orphaned rows whose profile was
  // deleted — both render the deleted-user fallback in <RaterBadge>.
  rater: RaterFields | null;
}

// ── Config ──────────────────────────────────────────────────────────────────

const VENUE_META: Record<string, { label: string; icon: string }> = {
  "fast-food":  { label: "Fast Food",     icon: "fastfood" },
  casual:       { label: "Casual Dining", icon: "restaurant" },
  fine:         { label: "Fine Dining",   icon: "dining" },
  "food-truck": { label: "Food Truck",    icon: "local_shipping" },
};

const FILTER_OPTIONS: { value: VenueType; label: string; icon: string }[] = [
  { value: "all",        label: "All",          icon: "apps" },
  { value: "fast-food",  label: "Fast Food",    icon: "fastfood" },
  { value: "casual",     label: "Casual",       icon: "restaurant" },
  { value: "fine",       label: "Fine Dining",  icon: "dining" },
  { value: "food-truck", label: "Food Truck",   icon: "local_shipping" },
];

type SortOption = "score" | "recent";

// ── Explore Page ───────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<VenueType>("all");
  const [sort, setSort] = useState<SortOption>("score");
  // Like state hydrated once per fetch and passed down to <LikeButton>.
  // Holding both as Sets/Maps means O(1) lookups per card render and zero
  // per-card round-trips. Empty values are safe defaults (no liked rows /
  // 0 count), so the cards render correctly even before this resolves.
  const [likedSet, setLikedSet] = useState<Set<string>>(() => new Set());
  const [countMap, setCountMap] = useState<Map<string, number>>(() => new Map());

  useEffect(() => {
    async function fetchRatings() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ratings")
          .select("id, place_id, venue_name, venue_address, venue_type, meal_type, visit_date, weighted_score, notes, meal_photo_url, user_id")
          .order("weighted_score", { ascending: false });
        if (error) {
          console.error("Supabase error:", error.code, error.message);
          setError(error.message || "Could not load spots.");
          return;
        }
        const rows = (data ?? []) as Omit<Rating, "rater">[];

        // Hydrate likes + raters in parallel. Cards render with empty
        // attribution and 0 likes between the first paint and this
        // resolving; the <LikeButton key=…> + setRatings(rowsWithRaters)
        // pair triggers a clean remount with hydrated data. Failures
        // inside the helpers are absorbed (empty Set / Map / null rater)
        // — missing social data should never break the feed.
        const ids = rows.map((r) => r.id);
        const [liked, counts, rowsWithRaters] = await Promise.all([
          getUserLikedRatings(supabase, ids),
          getRatingsLikeCounts(supabase, ids),
          attachRaters(supabase, rows),
        ]);
        setRatings(rowsWithRaters);
        setLikedSet(liked);
        setCountMap(counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load spots.");
      } finally {
        setLoading(false);
      }
    }
    fetchRatings();
  }, []);

  // Deduplicate by place_id — keep highest score per spot
  const topSpots = useMemo(() => {
    const map = new Map<string, Rating>();
    for (const r of ratings) {
      const existing = map.get(r.place_id);
      if (!existing || r.weighted_score > existing.weighted_score) {
        map.set(r.place_id, r);
      } else if (
        existing &&
        Math.abs(r.weighted_score - existing.weighted_score) < 0.001 &&
        r.meal_photo_url &&
        !existing.meal_photo_url
      ) {
        map.set(r.place_id, r);
      }
    }
    return Array.from(map.values());
  }, [ratings]);

  const filtered = useMemo(() => {
    const base = activeFilter === "all" ? topSpots : topSpots.filter((r) => r.venue_type === activeFilter);
    if (sort === "score") return [...base].sort((a, b) => b.weighted_score - a.weighted_score);
    return [...base].sort((a, b) => b.visit_date.localeCompare(a.visit_date));
  }, [topSpots, activeFilter, sort]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="mx-auto min-w-0 w-full max-w-2xl pt-lg pb-10">
        <div className="flex flex-col gap-md">
          <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">Explore</h1>
          <div className="flex items-center gap-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            <span className="font-body-md text-body-md">Loading spots…</span>
          </div>
        </div>
      </main>
    );
  }

  // ── Empty / Error ────────────────────────────────────────────────────────

  if (topSpots.length === 0) {
    return (
      <main className="mx-auto min-w-0 w-full max-w-2xl pt-lg pb-10">
        <div className="flex flex-col gap-md">
          <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">Explore</h1>
          {error ? (
            <p className="rounded-xl border border-error-container bg-error-container/20 px-md py-sm font-body-md text-body-md text-error">{error}</p>
          ) : (
            <div className="flex flex-col items-center gap-lg rounded-xl border border-outline-variant bg-surface-container-low px-lg py-xl text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
                explore
              </span>
              <div>
                <p className="font-title-sm text-title-sm text-on-surface">No spots yet</p>
                <p className="mt-xs font-body-md text-body-md text-on-surface-variant">Rate your first spot to start exploring.</p>
              </div>
              <Link
                href="/rate"
                className="inline-flex items-center gap-xs rounded-lg bg-primary-container px-md py-xs font-title-sm text-title-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                Rate a Spot
              </Link>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────

  return (
    <main className="mx-auto min-w-0 w-full max-w-2xl pt-lg pb-10">
      <div className="flex flex-col gap-lg">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">Explore</h1>
            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
              {filtered.length} {filtered.length === 1 ? "spot" : "spots"}
              {activeFilter !== "all" ? ` · ${VENUE_META[activeFilter]?.label ?? activeFilter}` : ""}
            </p>
          </div>
          <Link
            href="/rate"
            className="flex items-center gap-xs rounded-lg bg-primary-container px-sm py-xs font-label-sm text-label-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            Rate
          </Link>
        </div>

        {/* Filter pills */}
        <div className="flex gap-xs overflow-x-auto pb-xs no-scrollbar">
          {FILTER_OPTIONS.map((f) => {
            const active = activeFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`flex shrink-0 items-center gap-xs rounded-full px-sm py-xs font-label-sm text-label-sm font-medium transition-all ${
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "bg-surface-variant text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                  {f.icon}
                </span>
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-xs">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Sort:</span>
          {(["score", "recent"] as SortOption[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-full px-sm py-0.5 font-label-sm text-label-sm font-medium transition-all ${
                sort === s
                  ? "bg-surface-container-highest text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {s === "score" ? "Top Rated" : "Most Recent"}
            </button>
          ))}
        </div>

        {/* No results for active filter */}
        {filtered.length === 0 && (
          <p className="font-body-md text-body-md text-on-surface-variant text-center py-lg">
            No {VENUE_META[activeFilter]?.label ?? activeFilter} spots rated yet.
          </p>
        )}

        {/* Spot cards */}
        <div className="flex flex-col gap-sm">
          {filtered.map((r, index) => {
            const liked = likedSet.has(r.id);
            const count = countMap.get(r.id) ?? 0;
            return (
              <FeedRatingCard
                // Re-key on initial like values so the inner <LikeButton>
                // (which lazy-inits its useState from props) remounts and
                // re-seeds when batched like data hydrates after the first
                // render. The card itself is otherwise pure on the rating.
                key={`${r.id}|${liked}|${count}`}
                rating={r}
                rank={index + 1}
                liked={liked}
                likeCount={count}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
