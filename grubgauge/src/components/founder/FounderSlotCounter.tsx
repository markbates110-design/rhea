"use client";

import { useFounderSlots } from "@/lib/founder/useFounderSlots";

interface Props {
  /**
   * "inline"   → renders as a sentence fragment ("47 founding member spots left").
   *              Drop-in for end-of-paragraph copy inside any hook surface.
   * "pill"     → renders as a self-contained chip you can place above /
   *              beside a CTA. Slightly heavier visual; standalone.
   * "headline" → big number, intended for the onboarding hero.
   */
  variant?: "inline" | "pill" | "headline";
}

/**
 * Live counter component used by every founding-member touchpoint
 * (onboarding hero, dashboard progress card, FollowGateSheet urgency
 * line, future section banners). One source of truth for the
 * remaining-slots number so every surface stays in sync without
 * each owning its own fetch.
 *
 * Mount-time fetch only in v1 — the number refreshes on navigation,
 * which is adequate for the FOMO copy. Realtime tick-down is a v1.5
 * follow-up.
 *
 * When all 100 slots are filled the copy flips to a closed-state
 * message instead of "0 spots left" (which reads weirder than
 * "Founding member program is closed").
 */
export function FounderSlotCounter({ variant = "inline" }: Props) {
  const { remaining, loading } = useFounderSlots();

  if (loading) {
    if (variant === "headline") {
      return (
        <span aria-hidden className="inline-block h-[1em] w-[3ch] rounded bg-surface-variant align-middle" />
      );
    }
    return <span aria-hidden className="inline-block h-[1em] w-[7ch] rounded bg-surface-variant align-middle" />;
  }

  if (remaining <= 0) {
    if (variant === "headline") {
      return <span className="font-display-lg text-display-lg font-bold text-on-surface-variant">Closed</span>;
    }
    if (variant === "pill") {
      return (
        <span className="inline-flex items-center rounded-full bg-surface-container-high px-sm py-0.5 font-label-sm text-label-sm font-semibold text-on-surface-variant">
          Founding member program closed
        </span>
      );
    }
    return (
      <span className="font-semibold text-on-surface-variant">
        Founding member program closed
      </span>
    );
  }

  if (variant === "headline") {
    return (
      <span className="inline-flex items-baseline gap-xs">
        <span className="font-display-lg text-display-lg font-bold tabular-nums text-tertiary">
          {remaining}
        </span>
        <span className="font-title-sm text-title-sm font-semibold text-on-surface-variant">
          founding member spots left
        </span>
      </span>
    );
  }

  if (variant === "pill") {
    return (
      <span className="inline-flex items-center gap-xs rounded-full bg-tertiary-container px-sm py-0.5 font-label-sm text-label-sm font-semibold text-on-tertiary-container">
        <span
          className="material-symbols-outlined text-[14px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden
        >
          crown
        </span>
        <span className="tabular-nums">{remaining}</span> founding member spots left
      </span>
    );
  }

  return (
    <span className="font-semibold text-tertiary">
      <span className="tabular-nums">{remaining}</span> founding member spots left
    </span>
  );
}
