"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/identity/deviceId";

// ── Types ──────────────────────────────────────────────────────────────────

type VenueType = "fast-food" | "casual" | "fine" | "food-truck";

interface Rating {
  id: string;
  venue_name: string;
  venue_address: string;
  venue_type: VenueType;
  meal_type: string;
  visit_date: string;
  weighted_score: number;
  notes: string | null;
  meal_photo_url: string | null;
  created_at: string;
}

// ── Venue config ───────────────────────────────────────────────────────────

const VENUE_META: Record<VenueType, { label: string; icon: string }> = {
  "fast-food":  { label: "Fast Food",     icon: "fastfood" },
  casual:       { label: "Casual Dining", icon: "restaurant" },
  fine:         { label: "Fine Dining",   icon: "dining" },
  "food-truck": { label: "Food Truck",    icon: "local_shipping" },
};

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

// ── History Page ───────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchRatings() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ratings")
          .select("id, venue_name, venue_address, venue_type, meal_type, visit_date, weighted_score, notes, meal_photo_url, created_at")
          .eq("device_id", getDeviceId())
          .order("created_at", { ascending: false });
        if (error) {
          console.error("Supabase error:", error.code, error.message, error.details, error.hint);
          setError(`${error.message || error.code || "Unknown Supabase error"}`);
          return;
        }
        setRatings(data ?? []);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "Could not load ratings.");
      } finally {
        setLoading(false);
      }
    }
    fetchRatings();
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl pt-lg pb-10">
        <div className="flex flex-col gap-md">
          <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">My Ratings</h1>
          <div className="flex items-center gap-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            <span className="font-body-md text-body-md">Loading…</span>
          </div>
        </div>
      </main>
    );
  }

  // ── Empty / Error ────────────────────────────────────────────────────────

  if (ratings.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl pt-lg pb-10">
        <div className="flex flex-col gap-md">
          <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">My Ratings</h1>
          {error ? (
            <p className="rounded-xl border border-error-container bg-error-container/20 px-md py-sm font-body-md text-body-md text-error">
              {error}
            </p>
          ) : (
            <div className="flex flex-col items-center gap-lg rounded-xl border border-outline-variant bg-surface-container-low px-lg py-xl text-center">
              <span
                className="material-symbols-outlined text-[48px] text-on-surface-variant"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                restaurant_menu
              </span>
              <div>
                <p className="font-title-sm text-title-sm text-on-surface">No ratings yet</p>
                <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
                  Rate your first spot to start building your history.
                </p>
              </div>
              <Link
                href="/rate"
                className="inline-flex items-center gap-xs rounded-lg bg-primary-container px-md py-xs font-title-sm text-title-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
              >
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  add_circle
                </span>
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
    <main className="mx-auto w-full max-w-2xl pt-lg pb-10">
      <div className="flex flex-col gap-lg">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">My Ratings</h1>
            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
              {ratings.length} {ratings.length === 1 ? "spot" : "spots"} rated
            </p>
          </div>
          <Link
            href="/rate"
            className="flex items-center gap-xs rounded-lg bg-primary-container px-sm py-xs font-label-sm text-label-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              add
            </span>
            Rate
          </Link>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-sm">
          {ratings.map((r) => {
            const meta = VENUE_META[r.venue_type] ?? VENUE_META.casual;
            const { label: badge, colorClass } = scoreBadge(r.weighted_score);
            return (
              <div
                key={r.id}
                className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md transition-colors hover:bg-surface-container"
              >
                {/* Name + Score */}
                <div className="flex items-start justify-between gap-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-title-sm text-title-sm font-semibold text-on-surface truncate">
                      {r.venue_name}
                    </p>
                    {r.venue_address && (
                      <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant truncate">
                        {r.venue_address}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`font-bold tabular-nums leading-none text-[28px] ${colorClass}`}>
                      {r.weighted_score.toFixed(1)}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">/10</span>
                  </div>
                </div>

                {/* Chips + Date */}
                <div className="flex items-center gap-xs flex-wrap">
                  <span className="inline-flex items-center gap-xs rounded-full bg-surface-variant px-xs py-0.5 font-label-sm text-label-sm text-on-surface-variant">
                    <span
                      className="material-symbols-outlined text-[13px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {meta.icon}
                    </span>
                    {meta.label}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-surface-variant px-xs py-0.5 font-label-sm text-label-sm text-on-surface-variant capitalize">
                    {r.meal_type}
                  </span>
                  <span className={`inline-flex items-center rounded-full bg-surface-container-high px-xs py-0.5 font-label-sm text-label-sm font-semibold ${colorClass}`}>
                    {badge}
                  </span>
                  <span className="ml-auto font-label-sm text-label-sm text-on-surface-variant shrink-0">
                    {formatDate(r.visit_date)}
                  </span>
                </div>

                {/* Photo + notes */}
                {r.meal_photo_url && (
                  <div className="overflow-hidden rounded-lg border border-outline-variant/50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- user meal photos from Storage */}
                    <img
                      src={r.meal_photo_url}
                      alt={`Meal photo at ${r.venue_name}`}
                      className="aspect-[16/9] w-full max-h-[200px] object-cover"
                    />
                  </div>
                )}
                {r.notes && (
                  <p className="border-t border-outline-variant/50 pt-xs font-body-md text-body-md italic text-on-surface-variant line-clamp-2">
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
