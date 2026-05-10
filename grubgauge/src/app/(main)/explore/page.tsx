"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreBadge(score: number): { label: string; colorClass: string } {
  if (score >= 9.0) return { label: "Exceptional", colorClass: "text-primary" };
  if (score >= 7.5) return { label: "Great Value", colorClass: "text-primary" };
  if (score >= 6.0) return { label: "Good",        colorClass: "text-tertiary" };
  if (score >= 4.5) return { label: "Fair",        colorClass: "text-tertiary" };
  return                   { label: "Poor",        colorClass: "text-error" };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Explore Page ───────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<VenueType>("all");
  const [sort, setSort] = useState<SortOption>("score");

  useEffect(() => {
    async function fetchRatings() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ratings")
          .select("id, place_id, venue_name, venue_address, venue_type, meal_type, visit_date, weighted_score, notes, meal_photo_url")
          .order("weighted_score", { ascending: false });
        if (error) {
          console.error("Supabase error:", error.code, error.message);
          setError(error.message || "Could not load spots.");
          return;
        }
        setRatings(data ?? []);
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
      <main className="mx-auto w-full max-w-2xl px-margin-edge pt-lg pb-10">
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
      <main className="mx-auto w-full max-w-2xl px-margin-edge pt-lg pb-10">
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
    <main className="mx-auto w-full max-w-2xl px-margin-edge pt-lg pb-10">
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
            const meta = VENUE_META[r.venue_type] ?? VENUE_META.casual;
            const { label: badge, colorClass } = scoreBadge(r.weighted_score);
            return (
              <div
                key={r.id}
                className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md transition-colors hover:bg-surface-container"
              >
                {/* Rank + Name + Score */}
                <div className="flex items-start gap-sm">
                  <span className="shrink-0 mt-0.5 font-label-sm text-label-sm text-on-surface-variant tabular-nums w-5 text-right">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-title-sm text-title-sm font-semibold text-on-surface truncate">{r.venue_name}</p>
                    {r.venue_address && (
                      <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant truncate">{r.venue_address}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`font-bold tabular-nums leading-none text-[28px] ${colorClass}`}>
                      {r.weighted_score.toFixed(1)}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">/10</span>
                  </div>
                </div>

                {r.meal_photo_url && (
                  <div className="pl-7 pr-0">
                    <div className="overflow-hidden rounded-lg border border-outline-variant/50">
                      {/* eslint-disable-next-line @next/next/no-img-element -- community meal photos from Storage */}
                      <img
                        src={r.meal_photo_url}
                        alt={`Meal photo at ${r.venue_name}`}
                        className="aspect-[16/9] w-full max-h-[180px] object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Chips */}
                <div className="flex items-center gap-xs flex-wrap pl-7">
                  <span className="inline-flex items-center gap-xs rounded-full bg-surface-variant px-xs py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                    {meta.label}
                  </span>
                  <span className={`inline-flex items-center rounded-full bg-surface-container-high px-xs py-0.5 font-label-sm text-label-sm font-semibold ${colorClass}`}>
                    {badge}
                  </span>
                  <span className="ml-auto font-label-sm text-label-sm text-on-surface-variant shrink-0">
                    {formatDate(r.visit_date)}
                  </span>
                </div>

                {/* Notes */}
                {r.notes && (
                  <p className="border-t border-outline-variant/50 pt-xs pl-7 font-body-md text-body-md italic text-on-surface-variant line-clamp-2">
                    {`\u201C${r.notes}\u201D`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
