"use client";

import Link from "next/link";
import { useFounderState } from "@/lib/founder/useFounderState";
import { useFounderSlots } from "@/lib/founder/useFounderSlots";
import { FounderBadge } from "./FounderBadge";
import { FounderSlotCounter } from "./FounderSlotCounter";

interface Props {
  /**
   * Where the rate CTA points. Mirrors dashboard's `rateHref` (signed-in
   * users go straight to /rate; brand-new / guest path runs through
   * /onboarding first). The progress card is only shown to signed-in
   * users so `/rate` is the realistic default if a caller omits the prop.
   */
  rateHref?: string;
}

/**
 * Dashboard hook card driving signed-in users toward the 3-qualifying-day
 * threshold. Hidden entirely when:
 *
 *   - The viewer is a guest (the useFounderState hook returns a `null`
 *     badge + zero progress; we conflate both into "no card").
 *   - The viewer is already The Founder or a Founding Member (badge
 *     non-null + has a kind).
 *   - The Founder program is closed (no slots remaining AND the viewer
 *     has not earned a badge).
 *
 * For everyone else, surfaces the threshold copy + progress meter ("2 of
 * 3 ratings done"), the live slot counter ("47 founding member spots left"), and
 * a direct rate-link. Sized to slot above existing dashboard sections
 * without dominating them.
 */
export function FounderProgressCard({ rateHref = "/rate" }: Props) {
  const { badge, progress, loading } = useFounderState();
  const { remaining, loading: slotsLoading } = useFounderSlots();

  if (loading || slotsLoading) return null;
  if (badge) return null;
  if (remaining <= 0) return null;

  const days = Math.min(progress.qualifyingDays, 3);
  const ratedToday = isToday(progress.lastQualifyingDayUtc);
  const nextLine = ratedToday
    ? "You've earned today's qualifier — come back tomorrow for the next one."
    : "Rate a new place with a photo to count today's qualifier.";

  return (
    <div className="flex flex-col gap-sm rounded-xl border border-tertiary-fixed bg-tertiary-container/40 p-md">
      <div className="flex items-center justify-between gap-sm">
        <p className="font-title-sm text-title-sm font-bold text-on-tertiary-container">
          Unleash your inner food critic.
        </p>
        <FounderSlotCounter variant="pill" />
      </div>

      <p className="font-body-md text-body-md text-on-surface">
        Track the meals that matter and build a following. Rate{" "}
        <span className="tabular-nums font-bold">3 new places</span> with photos, on{" "}
        <span className="font-bold">3 different days</span>, to earn{" "}
        <FounderBadge badge={{ kind: "founding-member", slotNumber: 100 - remaining + 1 }} size="compact" />{" "}
        as your permanent identity on every rating you make.
      </p>

      {/* Progress dots */}
      <div className="flex items-center gap-xs">
        {[0, 1, 2].map((i) => {
          const filled = i < days;
          return (
            <span
              key={i}
              aria-hidden
              className={`h-2 flex-1 rounded-full ${
                filled ? "bg-tertiary" : "bg-surface-container-high"
              }`}
            />
          );
        })}
        <span className="ml-xs font-label-sm text-label-sm tabular-nums text-on-surface-variant">
          {days}/3
        </span>
      </div>

      <p className="font-label-sm text-label-sm text-on-surface-variant">{nextLine}</p>

      <div>
        <Link
          href={rateHref}
          className="inline-flex items-center gap-xs rounded-lg bg-primary-container px-md py-xs font-title-sm text-title-sm font-bold text-on-primary-container transition-all hover:bg-primary-fixed active:scale-95"
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden
          >
            add_circle
          </span>
          {ratedToday ? "Rate Another Spot" : "Rate a Spot"}
        </Link>
      </div>
    </div>
  );
}

function isToday(utcDay: string | null): boolean {
  if (!utcDay) return false;
  const todayUtc = new Date().toISOString().slice(0, 10);
  return utcDay === todayUtc;
}
