"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getDeviceId, isOnboarded } from "@/lib/identity/deviceId";
import { useAuth } from "@/lib/auth/useAuth";

// ── Types ──────────────────────────────────────────────────────────────────

interface Rating {
  id: string;
  venue_name: string;
  venue_address: string;
  venue_type: string;
  meal_type: string;
  visit_date: string;
  weighted_score: number;
  notes: string | null;
  meal_photo_url: string | null;
  created_at: string;
}

// ── Config ─────────────────────────────────────────────────────────────────

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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);

  // Smart "+ Rate" target: signed-in users + onboarded guests go straight to /rate;
  // brand-new visitors (no auth, no guest flag) flow through onboarding first.
  const rateHref = user || (typeof window !== "undefined" && isOnboarded()) ? "/rate" : "/onboarding";

  useEffect(() => {
    if (!isOnboarded()) {
      router.replace("/onboarding");
      return;
    }
    async function fetch() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("ratings")
          .select("id, venue_name, venue_address, venue_type, meal_type, visit_date, weighted_score, notes, meal_photo_url, created_at")
          .eq("device_id", getDeviceId())
          .order("created_at", { ascending: false });
        setRatings(data ?? []);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [router]);

  const stats = useMemo(() => {
    if (ratings.length === 0) return null;
    const avg = ratings.reduce((s, r) => s + r.weighted_score, 0) / ratings.length;
    const typeCounts = ratings.reduce<Record<string, number>>((acc, r) => {
      acc[r.venue_type] = (acc[r.venue_type] ?? 0) + 1;
      return acc;
    }, {});
    const favType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "casual";
    const best = [...ratings].sort((a, b) => b.weighted_score - a.weighted_score)[0];
    return { total: ratings.length, avg, favType, best };
  }, [ratings]);

  const recent = ratings.slice(0, 3);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="mx-auto min-w-0 w-full max-w-2xl pt-lg pb-10">
        <div className="flex items-center gap-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
          <span className="font-body-md text-body-md">Loading…</span>
        </div>
      </main>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  if (ratings.length === 0) {
    return (
      <main className="mx-auto min-w-0 w-full max-w-2xl pt-lg pb-10">
        <div className="flex flex-col gap-lg">
          <div>
            <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">GrubGauge</h1>
            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">Your personal food value tracker.</p>
          </div>
          <div className="flex flex-col items-center gap-lg rounded-xl border border-outline-variant bg-surface-container-low px-lg py-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant_menu
            </span>
            <div>
              <p className="font-title-sm text-title-sm text-on-surface">No ratings yet</p>
              <p className="mt-xs font-body-md text-body-md text-on-surface-variant">Rate your first spot to start tracking.</p>
            </div>
            <Link
              href={rateHref}
              className="inline-flex items-center gap-xs rounded-lg bg-primary-container px-md py-xs font-title-sm text-title-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
              Rate a Spot
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────

  const favMeta = VENUE_META[stats!.favType] ?? VENUE_META.casual;

  return (
    <main className="mx-auto min-w-0 w-full max-w-2xl pt-lg pb-10">
      <div className="flex flex-col gap-lg">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display-lg text-[32px] font-bold leading-[40px] text-on-surface">GrubGauge</h1>
            <p className="mt-xs font-body-md text-body-md text-on-surface-variant">Your personal food value tracker.</p>
          </div>
          <Link
            href={rateHref}
            className="flex items-center gap-xs rounded-lg bg-primary-container px-sm py-xs font-label-sm text-label-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            Rate
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-sm">
          {/* Total */}
          <div className="flex flex-col items-center gap-base rounded-xl border border-outline-variant bg-surface-container-low p-md text-center">
            <span className="font-display-lg text-[32px] font-bold leading-none tabular-nums text-primary">
              {stats!.total}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Spots Rated</span>
          </div>

          {/* Avg score */}
          <div className="flex flex-col items-center gap-base rounded-xl border border-outline-variant bg-surface-container-low p-md text-center">
            <span className="font-display-lg text-[32px] font-bold leading-none tabular-nums text-primary">
              {stats!.avg.toFixed(1)}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Avg Score</span>
          </div>

          {/* Fav type */}
          <div className="flex flex-col items-center gap-base rounded-xl border border-outline-variant bg-surface-container-low p-md text-center">
            <span
              className="material-symbols-outlined text-[28px] text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {favMeta.icon}
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant text-center leading-tight">{favMeta.label}</span>
          </div>
        </div>

        {/* Best spot */}
        {stats!.best && (() => {
          const b = stats!.best;
          const { colorClass } = scoreBadge(b.weighted_score);
          const meta = VENUE_META[b.venue_type] ?? VENUE_META.casual;
          return (
            <div className="flex items-center gap-sm rounded-xl border border-primary/30 bg-primary/5 p-md">
              <span className="material-symbols-outlined text-[24px] text-primary shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
                emoji_events
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Top Rated</p>
                <p className="font-title-sm text-title-sm font-semibold text-on-surface truncate">{b.venue_name}</p>
                <div className="flex items-center gap-xs mt-base">
                  <span className="material-symbols-outlined text-[13px] text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">{meta.label}</span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className={`font-bold tabular-nums leading-none text-[28px] ${colorClass}`}>{b.weighted_score.toFixed(1)}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">/10</span>
              </div>
            </div>
          );
        })()}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-sm">
          {[
            { href: rateHref,   icon: "add_circle",  label: "Rate a Spot",  filled: true },
            { href: "/explore", icon: "explore",      label: "Explore",      filled: false },
            { href: "/history", icon: "history",      label: "My Ratings",   filled: false },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-xs rounded-xl border border-outline-variant bg-surface-container-low p-md text-center transition-colors hover:bg-surface-container active:scale-95"
            >
              <span
                className="material-symbols-outlined text-[26px] text-primary"
                style={{ fontVariationSettings: a.filled ? "'FILL' 1" : "'FILL' 0" }}
              >
                {a.icon}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Recent ratings */}
        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Recent</p>
            <Link href="/history" className="font-label-sm text-label-sm text-primary hover:underline">See all</Link>
          </div>
          {recent.map((r) => {
            const meta = VENUE_META[r.venue_type] ?? VENUE_META.casual;
            const { colorClass } = scoreBadge(r.weighted_score);
            return (
              <div
                key={r.id}
                className="flex items-center gap-sm rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm transition-colors hover:bg-surface-container"
              >
                {r.meal_photo_url ? (
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-outline-variant/50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- user meal photos from Storage */}
                    <img
                      src={r.meal_photo_url}
                      alt={`Meal at ${r.venue_name}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <span
                    className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {meta.icon}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-body-md font-medium text-on-surface truncate">{r.venue_name}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">{formatDate(r.visit_date)} · {r.meal_type}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`font-bold tabular-nums text-[20px] leading-none ${colorClass}`}>{r.weighted_score.toFixed(1)}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">/10</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
