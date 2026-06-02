"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/identity/deviceId";
import { useAuth } from "@/lib/auth/useAuth";
import { useProfile } from "@/lib/profile/useProfile";
import { ShareRatingButton } from "@/components/ratings/ShareRatingButton";
import { applyRatingsOwnerScope } from "@/lib/ratings/scope";
import { PageShell } from "@/components/layout/PageShell";
import { RatingEditSheet, type EditableRatingRow } from "@/components/history/RatingEditSheet";

// ── Types ──────────────────────────────────────────────────────────────────

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
  criteria_scores: Record<string, number> | null;
  created_at: string;
  // History is the signed-in user's own ratings (or device-scoped guest
  // rows), so rater attribution would be redundant in the UI — but the
  // field is part of the rating shape across the app, so we select it
  // here for type consistency and future use (e.g. a public profile
  // page reusing this query).
  user_id: string | null;
}

// ── Venue config ───────────────────────────────────────────────────────────

const VENUE_META: Record<string, { label: string; icon: string }> = {
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

// ── Guest upsell card ──────────────────────────────────────────────────────

function GuestUpsellCard() {
  return (
    <div className="flex items-start gap-sm rounded-xl border border-primary/30 bg-primary/5 px-md py-sm">
      <span
        className="material-symbols-outlined text-[20px] text-primary mt-0.5 shrink-0"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        cloud_sync
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-title-sm text-title-sm text-on-surface">
          Sign in to save your ratings permanently
        </p>
        <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant">
          Your ratings stay on this device until you sign in or create an account — then they live with you across devices.
        </p>
      </div>
      <Link
        href="/onboarding/signup?mode=signin"
        className="shrink-0 inline-flex items-center gap-xs rounded-lg bg-primary-container px-sm py-xs font-label-sm text-label-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
      >
        Sign in
      </Link>
    </div>
  );
}

// ── History Page ───────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<EditableRatingRow | null>(null);

  useEffect(() => {
    // Wait for auth resolution before querying — without this, a freshly-
    // signed-in user can see a flash of guest history (device-scoped rows
    // with user_id is null) before the user-scoped query lands.
    if (authLoading) return;
    let cancelled = false;
    async function fetchRatings() {
      try {
        const supabase = createClient();
        const base = supabase
          .from("ratings")
          .select(
            "id, place_id, venue_name, venue_address, venue_type, meal_type, visit_date, weighted_score, notes, meal_photo_url, criteria_scores, created_at, user_id"
          );
        const { data, error } = await applyRatingsOwnerScope(base, {
          user,
          deviceId: getDeviceId(),
        }).order("created_at", { ascending: false });
        if (cancelled) return;
        if (error) {
          console.error("Supabase error:", error.code, error.message, error.details, error.hint);
          setError(`${error.message || error.code || "Unknown Supabase error"}`);
          return;
        }
        setRatings((data ?? []) as Rating[]);
      } catch (err) {
        if (cancelled) return;
        console.error("Fetch error:", err);
        setError(err instanceof Error ? err.message : "Could not load ratings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    setLoading(true);
    fetchRatings();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <PageShell variant="feed" className="pt-lg pb-10">
        <div className="flex flex-col gap-md">
          <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">My Ratings</h1>
          <div className="flex items-center gap-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            <span className="font-body-md text-body-md">Loading…</span>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── Empty / Error ────────────────────────────────────────────────────────

  if (ratings.length === 0) {
    return (
      <PageShell variant="feed" className="pt-lg pb-10">
        <div className="flex flex-col gap-md">
          <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">My Ratings</h1>
          {!user && <GuestUpsellCard />}
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
      </PageShell>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────

  function openEditor(r: Rating) {
    setEditing(r as EditableRatingRow);
  }

  return (
    <PageShell variant="feed" className="pt-lg pb-10">
      <RatingEditSheet
        rating={editing}
        onClose={() => setEditing(null)}
        onSaved={(row) =>
          setRatings((prev) => prev.map((x) => (x.id === row.id ? ({ ...x, ...row } as Rating) : x)))
        }
        onDeleted={(id) => setRatings((prev) => prev.filter((x) => x.id !== id))}
      />

      <div className="flex flex-col gap-lg">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">My Ratings</h1>
            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">
              <span className="tabular-nums">{ratings.length}</span> {ratings.length === 1 ? "spot" : "spots"} rated
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

        {!user && <GuestUpsellCard />}

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
                    <div className="flex w-full min-w-0 items-start justify-between gap-xs">
                      <p className="min-w-0 flex-1 font-title-sm text-title-sm font-semibold text-on-surface truncate">
                        {r.venue_name}
                      </p>
                      <div className="flex shrink-0 items-center gap-xs">
                        <ShareRatingButton
                          payload={{
                            venueName: r.venue_name,
                            weightedScore: r.weighted_score,
                            venueType: r.venue_type,
                            mealPhotoUrl: r.meal_photo_url,
                            notes: r.notes,
                            criteriaScores: r.criteria_scores,
                            visitDate: r.visit_date,
                            raterUsername: profile?.username ?? null,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => openEditor(r)}
                          className="rounded-lg border border-outline-variant bg-surface-container px-xs py-0.5 font-label-sm text-label-sm text-on-surface hover:border-primary hover:bg-surface-container-high transition-colors"
                          aria-label={`Edit rating for ${r.venue_name}`}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
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
                  <p className="border-t border-outline-variant/50 pt-xs font-body-md text-body-md italic text-on-surface-variant whitespace-pre-wrap break-words">
                    {`\u201C${r.notes}\u201D`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
