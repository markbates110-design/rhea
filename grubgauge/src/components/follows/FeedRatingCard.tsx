"use client";

import { RatingCard, type RatingCardProps } from "@/components/ratings/RatingCard";
import { FollowButton } from "./FollowButton";

/**
 * RatingCard wrapper that slots a Follow button into the LikeButton row
 * via the card's `trailingAction` prop. The button is one-tap for every
 * viewer except themselves:
 *
 *   - Self    → FollowButton returns null (kind === "self"), so the
 *               trailingAction slot becomes empty — the card renders as
 *               a plain RatingCard would.
 *   - Guest   → tap opens FollowGateSheet (the conversion mechanic).
 *   - Member  → live Follow / Following toggle via useFollowState.
 *
 * Previously this wrapper short-circuited on any signed-in viewer and
 * showed nothing — leaving members with no in-feed way to follow a
 * rater they discovered (forcing a detour through /u/[username]). The
 * gating-to-guest-only was the right call when the only purpose was
 * conversion; with Follow shipped to members, the natural UX is the
 * button-on-every-card pattern most social feeds use.
 *
 * Keeps RatingCard pristine for every other surface (history, explore,
 * /u/[username]) — they pass no `trailingAction` and render unchanged.
 */
export function FeedRatingCard(props: RatingCardProps) {
  const rater = props.rating.rater;
  const userId = readUserId(props);
  // Cards without a resolved rater (deleted user) or a known user_id
  // (would break the follow mutation since follows are keyed on user_id)
  // render the underlying card with no Follow control. Better to show
  // nothing than the wrong follow target.
  if (!rater || !userId) {
    return <RatingCard {...props} />;
  }

  const displayName = rater.display_name?.trim() || rater.username;

  return (
    <RatingCard
      {...props}
      trailingAction={
        <FollowButton
          target={{
            userId,
            username: rater.username,
            displayName,
            avatarUrl: rater.avatar_url ?? null,
          }}
          size="sm"
        />
      }
    />
  );
}

/**
 * RaterFields doesn't carry the user_id (it's the lookup key, not a field
 * on the badge type). Feeds upstream always set `props.rating.user_id`,
 * so we read it from there via a narrow cast — the RatingCardRating type
 * is intentionally minimal, so a structural extension is the right tool.
 */
function readUserId(props: RatingCardProps): string {
  const candidate = (props.rating as { user_id?: string | null }).user_id;
  return typeof candidate === "string" ? candidate : "";
}
