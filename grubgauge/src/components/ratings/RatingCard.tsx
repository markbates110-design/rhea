"use client";

import type { ReactNode } from "react";
import type { RaterFields } from "@/lib/profile/raters";
import { LikeButton } from "@/components/ratings/LikeButton";
import { RaterBadge } from "@/components/ratings/RaterBadge";
import { FounderBadge } from "@/components/founder/FounderBadge";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * The minimum shape this card needs from a rating row. Source pages
 * (Explore, /u/[username]) layer additional fields on top — those don't
 * affect rendering here, so the card stays decoupled from each surface's
 * full Rating type.
 *
 * `rater` is always present in the type. When `hideRater` is true (the
 * /u/[username] surface where the page header already names the author),
 * callers may pass `null` to skip the lookup entirely — the RaterBadge
 * isn't rendered regardless.
 */
export interface RatingCardRating {
  id: string;
  place_id: string;
  venue_name: string;
  venue_address: string;
  venue_type: string;
  visit_date: string;
  weighted_score: number;
  notes: string | null;
  meal_photo_url: string | null;
  rater: RaterFields | null;
  /**
   * Distinguishes the two `rater === null` cases: `true` when the rating
   * was posted without a user_id (intentional guest post → chip shows
   * "Guest rating"), `false` when the profile lookup just missed
   * (orphaned → chip shows "Deleted user"). Optional so existing call
   * sites that don't pipe through `attachRaters` still compile.
   */
  rater_is_guest?: boolean;
}

export interface RatingCardProps {
  rating: RatingCardRating;
  /**
   * 1-based rank to show in the left gutter (Explore feed). Omit on
   * surfaces that don't rank — the rank cell collapses and the body
   * indent that aligned to it (`pl-7`) drops too.
   */
  rank?: number;
  /**
   * Liked / count hydrate from the parent's batched `getRatingsLikeCounts`
   * + `getUserLikedRatings` so every card stays O(1) per render. Default
   * to `false` / `0` is safe — the card renders correctly before like data
   * resolves.
   */
  liked: boolean;
  likeCount: number;
  /**
   * Skip the rater attribution badge. Used on /u/[username] where the
   * page header already establishes whose ratings these are — repeating
   * the rater on every card would be redundant. Default false preserves
   * existing Explore behavior.
   */
  hideRater?: boolean;
  /**
   * Optional control rendered on the right of the LikeButton row, anchored
   * with `justify-between`. Used by FeedRatingCard to drop a guest-only
   * Follow button into the card without colliding with the FounderBadge
   * up top. Left null on every other surface.
   */
  trailingAction?: ReactNode;
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Duplicated with the surrounding Explore page (which still owns filter
// pills keyed off the same map) and the inline cards on History /
// Dashboard. Extracting these into a shared helper module is a follow-up
// when those surfaces also adopt <RatingCard>.
const VENUE_META: Record<string, { label: string; icon: string }> = {
  "fast-food":  { label: "Fast Food",     icon: "fastfood" },
  casual:       { label: "Casual Dining", icon: "restaurant" },
  fine:         { label: "Fine Dining",   icon: "dining" },
  "food-truck": { label: "Food Truck",    icon: "local_shipping" },
};

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

// ── Card ───────────────────────────────────────────────────────────────────

/**
 * Reusable rating card shared by the Explore feed and the public-profile
 * page (/u/[username]). Encapsulates the inline JSX that Explore carried
 * pre-extraction, parameterised on:
 *
 *  - `rank?` — render the left-gutter number cell (Explore) or hide it
 *              (/u/[username] is unsorted by rank).
 *  - `hideRater?` — suppress the attribution badge on surfaces whose
 *                    page header already names the author.
 *
 * Likes are wired through `<LikeButton>` exactly as before. The internal
 * `key` re-mount trick on Explore lives in the parent (call site decides
 * when a remount is warranted from hydration), so this component just
 * forwards `initialLiked` / `initialCount`.
 */
export function RatingCard({ rating, rank, liked, likeCount, hideRater = false, trailingAction = null }: RatingCardProps) {
  const meta = VENUE_META[rating.venue_type] ?? VENUE_META.casual;
  const { label: badge, colorClass } = scoreBadge(rating.weighted_score);
  const showRank = typeof rank === "number";
  // Body indent aligns to the rank cell's width + gap when rank is shown.
  // Drop the indent when the rank cell isn't rendered so the body doesn't
  // sit in dead space.
  const bodyIndent = showRank ? "pl-7" : "";

  return (
    <div className="flex flex-col gap-sm rounded-xl border border-outline-variant bg-surface-container-low p-md transition-colors hover:bg-surface-container">
      {!hideRater && (
        <div className="flex items-center justify-between gap-sm">
          <RaterBadge rater={rating.rater} isGuest={rating.rater_is_guest === true} />
          {/* Far-right slot — reserved for the founder pill in v1. Future
              popular-rater / city-expert badges land between RaterBadge
              and this position, so the founder pill stays rightmost as
              the rarest marker. */}
          <FounderBadge badge={rating.rater?.founder ?? null} size="compact" />
        </div>
      )}

      {/* Rank + Name + Score */}
      <div className="flex items-start gap-sm">
        {showRank && (
          <span className="shrink-0 mt-0.5 font-label-sm text-label-sm text-on-surface-variant tabular-nums w-5 text-right">
            {rank}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-title-sm text-title-sm font-semibold text-on-surface truncate">{rating.venue_name}</p>
          {rating.venue_address && (
            <p className="mt-0.5 font-label-sm text-label-sm text-on-surface-variant truncate">{rating.venue_address}</p>
          )}
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className={`font-bold tabular-nums leading-none text-[28px] ${colorClass}`}>
            {rating.weighted_score.toFixed(1)}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">/10</span>
        </div>
      </div>

      {rating.meal_photo_url && (
        <div className={`${bodyIndent} pr-0`}>
          <div className="overflow-hidden rounded-lg border border-outline-variant/50">
            {/* eslint-disable-next-line @next/next/no-img-element -- community meal photos from Storage */}
            <img
              src={rating.meal_photo_url}
              alt={`Meal photo at ${rating.venue_name}`}
              className="aspect-[16/9] w-full max-h-[180px] object-cover"
            />
          </div>
        </div>
      )}

      <div className={`flex items-center gap-xs flex-wrap ${bodyIndent}`}>
        <span className="inline-flex items-center gap-xs rounded-full bg-surface-variant px-xs py-0.5 font-label-sm text-label-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
          {meta.label}
        </span>
        <span className={`inline-flex items-center rounded-full bg-surface-container-high px-xs py-0.5 font-label-sm text-label-sm font-semibold ${colorClass}`}>
          {badge}
        </span>
        <span className="ml-auto font-label-sm text-label-sm text-on-surface-variant shrink-0">
          {formatDate(rating.visit_date)}
        </span>
      </div>

      <div className={`flex items-center justify-between gap-sm ${bodyIndent}`}>
        <LikeButton ratingId={rating.id} initialLiked={liked} initialCount={likeCount} />
        {trailingAction}
      </div>

      {rating.notes && (
        <p className={`border-t border-outline-variant/50 pt-xs ${bodyIndent} font-body-md text-body-md italic text-on-surface-variant line-clamp-2`}>
          {`\u201C${rating.notes}\u201D`}
        </p>
      )}
    </div>
  );
}
