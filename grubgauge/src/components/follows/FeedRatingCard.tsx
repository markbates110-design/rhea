"use client";

import { useAuth } from "@/lib/auth/useAuth";
import { RatingCard, type RatingCardProps } from "@/components/ratings/RatingCard";
import { FollowButton } from "./FollowButton";

/**
 * RatingCard wrapper for the FollowingFeed's guest variant. For signed-in
 * viewers it delegates to the plain RatingCard with no changes. For guests,
 * it overlays a small inline Follow button next to the rater chip, turning
 * every visible rater into a single-tap conversion target via FollowGateSheet.
 *
 * Keeps RatingCard pristine: every other surface (history, explore,
 * /u/[username]) continues to use it without the guest-funnel chrome.
 *
 * The Follow button is rendered *outside* the card flow as an absolute-
 * positioned overlay anchored to the top-right area where the founder
 * pill normally sits. This avoids restructuring RatingCard internals
 * just to slot one more control in.
 */
export function FeedRatingCard(props: RatingCardProps) {
  const { user, loading } = useAuth();

  // Members + loading-state-during-auth-resolve get the standard card.
  // The guest variant only renders once auth has resolved to "no user",
  // so a member never sees the conversion overlay flash.
  if (loading || user) {
    return <RatingCard {...props} />;
  }

  const rater = props.rating.rater;
  // Cards without a resolved rater (deleted user) have no follow target,
  // so the overlay is omitted; the underlying card still renders.
  if (!rater) {
    return <RatingCard {...props} />;
  }

  const displayName = rater.display_name?.trim() || rater.username;

  return (
    <div className="relative">
      <RatingCard {...props} />
      <div className="pointer-events-none absolute right-md top-md">
        {/* Re-enable pointer events only on the actual control so taps
            elsewhere on the overlay pass through to the underlying card. */}
        <div className="pointer-events-auto">
          <FollowButton
            target={{
              userId: rater_userId(rater, props),
              username: rater.username,
              displayName,
              avatarUrl: rater.avatar_url ?? null,
            }}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * RaterFields doesn't carry the user_id (it's the lookup key, not a field).
 * Trending feeds always set `props.rating.user_id` upstream, so we read it
 * from there. Falling back to the username string would break the follow
 * mutation since follows are keyed on user_id; we'd rather render nothing
 * than the wrong follow target.
 */
function rater_userId(
  _rater: NonNullable<RatingCardProps["rating"]["rater"]>,
  props: RatingCardProps,
): string {
  const candidate = (props.rating as { user_id?: string | null }).user_id;
  return typeof candidate === "string" ? candidate : "";
}
